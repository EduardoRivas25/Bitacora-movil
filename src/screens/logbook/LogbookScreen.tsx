import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as api from '../../services/api';
import { Building, Device, Incident, Maintenance, Network, Subnet } from '../../types';

type ReportArea = 'networks' | 'devices' | 'buildings' | 'incidents' | 'maintenances' | 'complete';
type ReportSection = { title: string; columns: string[]; rows: string[][] };
type ReportCounts = Partial<Record<ReportArea, number>>;

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const REPORT_AREAS: { id: ReportArea; title: string; description: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'networks', title: 'Gestión de red', description: 'Redes principales y subredes', icon: 'wifi' },
  { id: 'devices', title: 'Dispositivos', description: 'Inventario y ubicación de equipos', icon: 'cpu' },
  { id: 'buildings', title: 'Edificios', description: 'Ubicaciones y áreas del mapa', icon: 'map-pin' },
  { id: 'incidents', title: 'Incidentes', description: 'Incidentes registrados', icon: 'alert-triangle' },
  { id: 'maintenances', title: 'Mantenimientos', description: 'Mantenimientos programados', icon: 'tool' },
  { id: 'complete', title: 'Bitácora completa', description: 'Consolidado de todas las áreas', icon: 'layers' },
];

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => HTML_ESCAPES[character]);

const networkSection = (networks: (Network & { subnets: Subnet[] })[]): ReportSection[] => {
  const networkRows = networks.map(network => [
    network.name,
    `${network.address}/${network.cidr}`,
    network.description || '—',
    String(network.subnets.length),
    String(network.device_count || 0),
  ]);
  const subnetRows = networks.flatMap(network => network.subnets.map(subnet => [
    network.name,
    subnet.name,
    `${subnet.address}/${subnet.cidr}`,
    subnet.description || '—',
    String(subnet.device_count || 0),
  ]));
  return [
    { title: 'Redes principales', columns: ['Red', 'Dirección/CIDR', 'Descripción', 'Subredes', 'Dispositivos'], rows: networkRows },
    { title: 'Subredes', columns: ['Red principal', 'Subred', 'Dirección/CIDR', 'Descripción', 'Dispositivos'], rows: subnetRows },
  ];
};

const deviceSection = (devices: Device[]): ReportSection => ({
  title: 'Inventario de dispositivos',
  columns: ['Dispositivo', 'IPv4', 'MAC', 'Fabricante', 'Red / Subred', 'Ubicación', 'Descripción'],
  rows: devices.map(device => [
    device.name,
    device.ipv4_address,
    device.mac_address,
    device.manufacturer || '—',
    [device.network_name, device.subnet_name].filter(Boolean).join(' / ') || '—',
    device.location || '—',
    device.description || '—',
  ]),
});

const buildingSection = (buildings: Building[]): ReportSection => ({
  title: 'Edificios y ubicaciones',
  columns: ['Edificio', 'Código', 'Coordenadas GPS', 'Áreas / departamentos', 'Descripción'],
  rows: buildings.map(building => [
    building.name,
    building.code,
    `${building.latitude}, ${building.longitude}`,
    building.departments.map(department => `${department.name} (${department.floor})`).join(', ') || '—',
    building.description || '—',
  ]),
});

const incidentSection = (incidents: Incident[]): ReportSection => ({
  title: 'Incidentes',
  columns: ['Incidente', 'Estado', 'Severidad', 'Dispositivo', 'Ubicación', 'Fecha', 'Descripción'],
  rows: incidents.map(incident => [
    incident.title,
    incident.status === 'in_progress' ? 'En proceso' : incident.status === 'resolved' ? 'Resuelto' : 'Abierto',
    incident.severity,
    incident.device_name || '—',
    incident.location || '—',
    new Date(incident.created_at).toLocaleString('es-MX'),
    incident.description || '—',
  ]),
});

const maintenanceSection = (maintenances: Maintenance[]): ReportSection => ({
  title: 'Mantenimientos',
  columns: ['Mantenimiento', 'Tipo', 'Estado', 'Dispositivo', 'Ubicación', 'Fecha programada', 'Técnico', 'Notas'],
  rows: maintenances.map(maintenance => [
    maintenance.title,
    maintenance.type_label || maintenance.type,
    maintenance.status === 'in_progress' ? 'En proceso' : maintenance.status === 'completed' ? 'Completado' : 'Programado',
    maintenance.device_name || '—',
    maintenance.location || '—',
    `${maintenance.scheduled_date} ${maintenance.time_window}`,
    maintenance.technician || '—',
    maintenance.notes || '—',
  ]),
});

async function loadReportSections(area: ReportArea): Promise<ReportSection[]> {
  if (area === 'networks') return networkSection(await api.fetchNetworks(true));
  if (area === 'devices') return [deviceSection(await api.fetchDevices(true))];
  if (area === 'buildings') return [buildingSection(await api.fetchBuildings(true))];
  if (area === 'incidents') return [incidentSection(await api.fetchIncidents(true))];
  if (area === 'maintenances') return [maintenanceSection(await api.fetchMaintenances(true))];

  const [networks, devices, buildings, incidents, maintenances] = await Promise.all([
    api.fetchNetworks(true),
    api.fetchDevices(true),
    api.fetchBuildings(true),
    api.fetchIncidents(true),
    api.fetchMaintenances(true),
  ]);
  return [
    ...networkSection(networks),
    deviceSection(devices),
    buildingSection(buildings),
    incidentSection(incidents),
    maintenanceSection(maintenances),
  ];
}

function createReportHtml(title: string, sections: ReportSection[]): string {
  const sectionHtml = sections.map(section => {
    const header = section.columns.map(column => `<th>${escapeHtml(column)}</th>`).join('');
    const rows = section.rows.length
      ? section.rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${section.columns.length}" class="empty">Sin registros en esta área.</td></tr>`;
    return `<section><h2>${escapeHtml(section.title)}</h2><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></section>`;
  }).join('');

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        @page { size: A4 landscape; margin: 16mm 12mm; }
        body { color: #1c2430; font-family: Arial, sans-serif; font-size: 10px; }
        h1 { color: #0a4f91; font-size: 22px; margin: 0 0 4px; }
        h2 { color: #123d63; font-size: 15px; margin: 22px 0 8px; }
        p { color: #5b6570; margin: 0 0 18px; }
        table { border-collapse: collapse; width: 100%; }
        th { background: #e8f1fa; color: #123d63; text-align: left; }
        th, td { border: 1px solid #d7dee6; padding: 6px; vertical-align: top; }
        tr { page-break-inside: avoid; }
        .empty { color: #697583; font-style: italic; text-align: center; }
      </style>
    </head>
    <body>
      <h1>Bitácora Digital de Redes</h1>
      <p>${escapeHtml(title)} · Generado el ${escapeHtml(new Date().toLocaleString('es-MX'))}</p>
      ${sectionHtml}
    </body>
  </html>`;
}

export default function LogbookScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const [selectedArea, setSelectedArea] = useState<ReportArea>('networks');
  const [counts, setCounts] = useState<ReportCounts>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadCounts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [networks, devices, buildings, incidents, maintenances] = await Promise.all([
        api.fetchNetworks(true),
        api.fetchDevices(true),
        api.fetchBuildings(true),
        api.fetchIncidents(true),
        api.fetchMaintenances(true),
      ]);
      const networkCount = networks.length + networks.reduce((total, network) => total + network.subnets.length, 0);
      setCounts({
        networks: networkCount,
        devices: devices.length,
        buildings: buildings.length,
        incidents: incidents.length,
        maintenances: maintenances.length,
        complete: networkCount + devices.length + buildings.length + incidents.length + maintenances.length,
      });
    } catch (loadError) {
      console.error('Error cargando las áreas de bitácora:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los datos de bitácora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadCounts();
  }, [loadCounts]));

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      setError('');
      setMessage('');
      const area = REPORT_AREAS.find(option => option.id === selectedArea);
      if (!area) throw new Error('Selecciona un área válida para el reporte.');
      const sections = await loadReportSections(selectedArea);
      const html = createReportHtml(area.title, sections);

      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        setMessage('Se abrió el diálogo de impresión; selecciona “Guardar como PDF” para descargar el documento.');
      } else {
        const sharingAvailable = await Sharing.isAvailableAsync();
        if (!sharingAvailable) throw new Error('La opción para compartir documentos no está disponible en este dispositivo.');
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, {
          dialogTitle: `Compartir reporte: ${area.title}`,
          mimeType: 'application/pdf',
          UTI: '.pdf',
        });
        setMessage('El reporte PDF está listo para guardar o compartir.');
      }
    } catch (generationError) {
      console.error('Error generando el reporte PDF:', generationError);
      setError(generationError instanceof Error ? generationError.message : 'No se pudo generar el reporte PDF.');
    } finally {
      setGenerating(false);
    }
  };

  const selectedReport = REPORT_AREAS.find(area => area.id === selectedArea);
  const cardWidth = isTablet ? '31.5%' : '100%';

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.innerWrapper, { paddingHorizontal: width >= 1024 ? '6%' : isTablet ? '4%' : 16 }]}>
          <View style={styles.header}>
            <Text style={styles.headerBadge}>REPORTES DE INFRAESTRUCTURA</Text>
            <Text style={styles.headerTitle}>Bitácora</Text>
            <Text style={styles.subtitle}>Selecciona un área para consultar sus registros y generar un documento PDF actualizado.</Text>
          </View>

          {error !== '' && (
            <View style={styles.feedbackError}>
              <Feather name="alert-circle" size={15} color="#FF453A" />
              <Text style={styles.feedbackErrorText}>{error}</Text>
            </View>
          )}
          {message !== '' && (
            <View style={styles.feedbackSuccess}>
              <Feather name="check-circle" size={15} color="#30D158" />
              <Text style={styles.feedbackSuccessText}>{message}</Text>
            </View>
          )}

          <View style={styles.areaGrid}>
            {REPORT_AREAS.map(area => {
              const active = selectedArea === area.id;
              return (
                <TouchableOpacity
                  key={area.id}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setSelectedArea(area.id);
                    setError('');
                    setMessage('');
                  }}
                  style={[styles.areaCard, { width: cardWidth }, active && styles.areaCardActive]}
                >
                  <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                    <Feather name={area.icon} size={18} color={active ? '#FFFFFF' : '#0A84FF'} />
                  </View>
                  <View style={styles.areaCopy}>
                    <Text style={styles.areaTitle}>{area.title}</Text>
                    <Text style={styles.areaDescription}>{area.description}</Text>
                  </View>
                  {loading ? (
                    <ActivityIndicator size="small" color="#0A84FF" />
                  ) : (
                    <Text style={styles.count}>{counts[area.id] ?? 0}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.reportCard}>
            <View style={styles.reportCopy}>
              <Text style={styles.reportTitle}>{selectedReport?.title}</Text>
              <Text style={styles.reportDescription}>
                {selectedArea === 'complete'
                  ? 'Incluye redes, subredes, dispositivos, edificios, incidentes y mantenimientos.'
                  : selectedReport?.description}
              </Text>
              <Text style={styles.reportCount}>
                {loading ? 'Consultando registros…' : `${counts[selectedArea] ?? 0} registros incluidos`}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={generating || loading}
              onPress={handleGenerateReport}
              style={[styles.exportButton, (generating || loading) && styles.disabledButton]}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <Feather name="file-text" size={16} color="#000000" />
                  <Text style={styles.exportButtonText}>Generar PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 46, paddingBottom: 120 },
  innerWrapper: { maxWidth: 1200, width: '100%', alignSelf: 'center' },
  header: { marginBottom: 20 },
  headerBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#0A84FF', letterSpacing: 1.5 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 27, color: '#FFFFFF', marginTop: 2 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 19, color: 'rgba(255,255,255,0.5)', marginTop: 3, maxWidth: 640 },
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  areaCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 11 },
  areaCardActive: { borderColor: 'rgba(10,132,255,0.75)', backgroundColor: 'rgba(10,132,255,0.11)' },
  iconWrap: { height: 36, width: 36, borderRadius: 11, backgroundColor: 'rgba(10,132,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: '#0A84FF' },
  areaCopy: { flex: 1 },
  areaTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: '#FFFFFF' },
  areaDescription: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  count: { fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', fontSize: 13 },
  reportCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 22, padding: 17, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.045)', flexWrap: 'wrap' },
  reportCopy: { flex: 1, minWidth: 190 },
  reportTitle: { fontFamily: 'Poppins_700Bold', color: '#FFFFFF', fontSize: 15 },
  reportDescription: { fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 17, marginTop: 3 },
  reportCount: { fontFamily: 'Poppins_600SemiBold', color: '#0A84FF', fontSize: 10.5, marginTop: 8 },
  exportButton: { minWidth: 145, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFFFFF' },
  exportButtonText: { fontFamily: 'Poppins_600SemiBold', color: '#000000', fontSize: 12 },
  disabledButton: { opacity: 0.55 },
  feedbackError: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, marginBottom: 14, borderRadius: 11, backgroundColor: 'rgba(255,69,58,0.12)', borderWidth: 1, borderColor: 'rgba(255,69,58,0.28)' },
  feedbackErrorText: { fontFamily: 'Poppins_400Regular', flex: 1, color: '#FF453A', fontSize: 11.5 },
  feedbackSuccess: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, marginBottom: 14, borderRadius: 11, backgroundColor: 'rgba(48,209,88,0.1)', borderWidth: 1, borderColor: 'rgba(48,209,88,0.25)' },
  feedbackSuccessText: { fontFamily: 'Poppins_400Regular', flex: 1, color: '#30D158', fontSize: 11.5 },
});
