import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  useWindowDimensions, 
  Platform 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import GlassModal from '../../components/ui/GlassModal';
import { MOCK_INCIDENTS, MOCK_MAINTENANCES, MOCK_DEVICES, MOCK_BUILDINGS } from '../../mock/data';
import { Incident, Maintenance, Device } from '../../types';

const SEVERITY_FILTERS = ['Todos', 'Crítico', 'Alto', 'Medio', 'Bajo', 'Resueltos'];

export default function IncidentScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [maintenances, setMaintenances] = useState<Maintenance[]>(MOCK_MAINTENANCES);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState('Todos');

  // Modales
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  // Formulario Incidente con Selección Múltiple de Equipos
  const [incTitle, setIncTitle] = useState('');
  const [incSeverity, setIncSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([MOCK_DEVICES[0]?.id || 'dev-1']);
  const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>('bld-1');
  const [incDesc, setIncDesc] = useState('');

  // Formulario Mantenimiento
  const [mntTitle, setMntTitle] = useState('');
  const [mntType, setMntType] = useState<'preventive' | 'firmware' | 'cleaning' | 'ups_battery' | 'audit'>('preventive');
  const [mntDevice, setMntDevice] = useState('Switches de Distribución');
  const [mntLocation, setMntLocation] = useState('Edificio A y B');
  const [mntDate, setMntDate] = useState('2026-09-15');
  const [mntWindow, setMntWindow] = useState('02:00 - 05:00 hrs');
  const [mntTech, setMntTech] = useState('Ing. Eduardo Rivas');
  const [mntNotes, setMntNotes] = useState('');

  // Helper para clasificar tipo de equipo
  const getDeviceCategory = (name: string) => {
    const l = (name || '').toLowerCase();
    if (l.includes('switch')) return 'Switches';
    if (l.includes('router') || l.includes('gateway')) return 'Routers & Gateways';
    if (l.includes('servidor') || l.includes('proliant')) return 'Servidores';
    if (l.includes('point') || l.includes('unifi') || l.includes('ap')) return 'Access Points (Wi-Fi)';
    if (l.includes('firewall') || l.includes('fortigate')) return 'Firewalls';
    return 'Workstations / Equipos';
  };

  const getDeviceIcon = (category: string): keyof typeof Feather.glyphMap => {
    switch (category) {
      case 'Switches': return 'server';
      case 'Routers & Gateways': return 'radio';
      case 'Servidores': return 'hard-drive';
      case 'Access Points (Wi-Fi)': return 'wifi';
      case 'Firewalls': return 'shield';
      default: return 'monitor';
    }
  };

  // Agrupación jerárquica: Edificio -> Categoría -> Dispositivos
  const groupedHierarchy = useMemo(() => {
    return MOCK_BUILDINGS.map(bld => {
      const bldDevices = MOCK_DEVICES.filter(d => d.building_id === bld.id || d.location.includes(bld.code));
      const categories: { [cat: string]: Device[] } = {};

      bldDevices.forEach(dev => {
        const cat = getDeviceCategory(dev.name);
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(dev);
      });

      return {
        building: bld,
        categories,
        totalCount: bldDevices.length,
      };
    });
  }, []);

  const toggleDeviceSelection = (deviceId: string) => {
    if (selectedDeviceIds.includes(deviceId)) {
      setSelectedDeviceIds(selectedDeviceIds.filter(id => id !== deviceId));
    } else {
      setSelectedDeviceIds([...selectedDeviceIds, deviceId]);
    }
  };

  // Filtrado de incidentes
  const filteredIncidents = incidents.filter(inc => {
    if (activeSeverityFilter === 'Todos') return true;
    if (activeSeverityFilter === 'Crítico') return inc.severity === 'critical';
    if (activeSeverityFilter === 'Alto') return inc.severity === 'high';
    if (activeSeverityFilter === 'Medio') return inc.severity === 'medium';
    if (activeSeverityFilter === 'Bajo') return inc.severity === 'low';
    if (activeSeverityFilter === 'Resueltos') return inc.status === 'resolved';
    return true;
  });

  const getSeverityStyle = (severity: string, status?: string) => {
    if (status === 'resolved') {
      return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E', border: 'rgba(34, 197, 94, 0.3)', label: 'Resuelto' };
    }
    switch (severity) {
      case 'critical':
        return { bg: 'rgba(239, 68, 68, 0.18)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.35)', label: 'Crítico' };
      case 'high':
        return { bg: 'rgba(249, 115, 22, 0.18)', text: '#F97316', border: 'rgba(249, 115, 22, 0.35)', label: 'Alto' };
      case 'medium':
        return { bg: 'rgba(245, 158, 11, 0.18)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.35)', label: 'Medio' };
      case 'low':
      default:
        return { bg: 'rgba(59, 130, 246, 0.18)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.35)', label: 'Bajo' };
    }
  };

  const handleSaveIncident = () => {
    if (!incTitle || !incDesc || selectedDeviceIds.length === 0) return;

    // Obtener los objetos de los dispositivos seleccionados
    const selectedDevs = MOCK_DEVICES.filter(d => selectedDeviceIds.includes(d.id));
    const deviceNames = selectedDevs.map(d => d.name).join(', ');
    const locations = Array.from(new Set(selectedDevs.map(d => d.location))).join(' | ');

    const newInc: Incident = {
      id: `inc-${Date.now()}`,
      title: incTitle,
      description: incDesc,
      severity: incSeverity,
      status: 'open',
      device_id: selectedDevs[0]?.id || 'dev-1',
      device_name: deviceNames,
      device_ip: selectedDevs.map(d => d.ipv4_address).join(', '),
      location: locations || 'Infraestructura General',
      created_at: new Date().toISOString(),
    };

    setIncidents([newInc, ...incidents]);
    setShowIncidentModal(false);
    setIncTitle('');
    setIncDesc('');
    setSelectedDeviceIds([]);
  };

  const handleResolveIncident = (id: string) => {
    setIncidents(incidents.map(inc => inc.id === id ? { ...inc, status: 'resolved', resolved_at: new Date().toISOString() } : inc));
  };

  const handleDeleteIncident = (id: string) => {
    setIncidents(incidents.filter(inc => inc.id !== id));
  };

  const handleSaveMaintenance = () => {
    if (!mntTitle) return;
    const newMnt: Maintenance = {
      id: `mnt-${Date.now()}`,
      title: mntTitle,
      type: mntType,
      type_label: mntType === 'firmware' ? 'Actualización de Firmware' : mntType === 'cleaning' ? 'Limpieza de Racks' : mntType === 'ups_battery' ? 'Revisión de UPS' : 'Mantenimiento Preventivo',
      device_name: mntDevice,
      location: mntLocation,
      scheduled_date: mntDate,
      time_window: mntWindow,
      impact: 'partial',
      technician: mntTech,
      status: 'scheduled',
      notes: mntNotes,
    };
    setMaintenances([newMnt, ...maintenances]);
    setShowMaintenanceModal(false);
    setMntTitle('');
    setMntNotes('');
  };

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingHorizontal: isTablet ? '8%' : '4%' }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerBadge}>GESTIÓN DE INCIDENCIAS & PREVENCIÓN</Text>
            <Text style={styles.headerTitle}>Incidentes & Mantenimiento</Text>
            <Text style={styles.headerSubtitle}>
              {incidents.filter(i => i.status !== 'resolved').length} Incidentes Activos • {maintenances.length} Mantenimientos Programados
            </Text>
          </View>
          <View style={styles.headerButtonsRow}>
            <TouchableOpacity 
              style={styles.actionBtnSecondary}
              activeOpacity={0.8}
              onPress={() => setShowMaintenanceModal(true)}
            >
              <Feather name="calendar" size={15} color="#FFFFFF" />
              <Text style={styles.actionBtnSecondaryText}>Agendar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionBtnPrimary}
              activeOpacity={0.8}
              onPress={() => setShowIncidentModal(true)}
            >
              <Feather name="plus" size={16} color="#000000" />
              <Text style={styles.actionBtnPrimaryText}>Reportar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sección 1: INCIDENTES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Registro de Incidentes de Red</Text>
        </View>

        {/* Chips de Severidad */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterChips}
        >
          {SEVERITY_FILTERS.map((filter) => {
            const isActive = activeSeverityFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.chip, isActive && styles.chipActive]}
                activeOpacity={0.7}
                onPress={() => setActiveSeverityFilter(filter)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lista de Incidentes */}
        <View style={styles.incidentList}>
          {filteredIncidents.map((inc) => {
            const sev = getSeverityStyle(inc.severity, inc.status);

            return (
              <BlurView key={inc.id} intensity={30} tint="dark" style={styles.incidentCard}>
                <View style={styles.cardTop}>
                  <View style={[styles.severityBadge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
                    <Text style={[styles.severityText, { color: sev.text }]}>{sev.label}</Text>
                  </View>
                  <Text style={styles.timestampText}>
                    {new Date(inc.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <Text style={styles.incidentTitle}>{inc.title}</Text>
                <Text style={styles.incidentDesc}>{inc.description}</Text>

                {/* Info de Equipo y Ubicación */}
                <View style={styles.infoRow}>
                  <View style={styles.infoPill}>
                    <Feather name="cpu" size={13} color="#0A84FF" />
                    <Text style={styles.infoPillText}>{inc.device_name}</Text>
                  </View>
                  <View style={styles.infoPill}>
                    <Feather name="map-pin" size={13} color="#BF5AF2" />
                    <Text style={styles.infoPillText}>{inc.location}</Text>
                  </View>
                </View>

                {/* Acciones de Tarjeta */}
                <View style={styles.cardActionsRow}>
                  {inc.status !== 'resolved' ? (
                    <TouchableOpacity 
                      style={styles.resolveBtn}
                      activeOpacity={0.8}
                      onPress={() => handleResolveIncident(inc.id)}
                    >
                      <Feather name="check-circle" size={14} color="#30D158" />
                      <Text style={styles.resolveBtnText}>Marcar como Resuelto</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.resolvedStatusPill}>
                      <Feather name="check" size={14} color="#30D158" />
                      <Text style={styles.resolvedStatusText}>Incidencia Cerrada</Text>
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.deleteIncBtn}
                    activeOpacity={0.7}
                    onPress={() => handleDeleteIncident(inc.id)}
                  >
                    <Feather name="trash-2" size={15} color="rgba(255, 69, 58, 0.7)" />
                  </TouchableOpacity>
                </View>
              </BlurView>
            );
          })}
        </View>

        {/* Sección 2: MANTENIMIENTO PREVENTIVO */}
        <View style={[styles.sectionHeader, { marginTop: 36 }]}>
          <Text style={styles.sectionTitle}>Mantenimientos Preventivos y Programados</Text>
          <Text style={styles.sectionSubtitle}>Prevé caídas de infraestructura y asegura la continuidad operativa</Text>
        </View>

        <View style={styles.maintenanceList}>
          {maintenances.map((mnt) => (
            <BlurView key={mnt.id} intensity={30} tint="dark" style={styles.maintenanceCard}>
              <View style={styles.mntTopRow}>
                <View style={styles.mntTypeBadge}>
                  <Feather name="tool" size={13} color="#FF9F0A" />
                  <Text style={styles.mntTypeText}>{mnt.type_label}</Text>
                </View>
                <View style={styles.mntStatusBadge}>
                  <Text style={styles.mntStatusText}>Programado</Text>
                </View>
              </View>

              <Text style={styles.mntTitle}>{mnt.title}</Text>
              
              <View style={styles.mntDetailGrid}>
                <View style={styles.mntDetailItem}>
                  <Feather name="calendar" size={13} color="#94A3B8" />
                  <Text style={styles.mntDetailVal}>{mnt.scheduled_date} • {mnt.time_window}</Text>
                </View>
                <View style={styles.mntDetailItem}>
                  <Feather name="layers" size={13} color="#94A3B8" />
                  <Text style={styles.mntDetailVal}>{mnt.device_name} ({mnt.location})</Text>
                </View>
                <View style={styles.mntDetailItem}>
                  <Feather name="user" size={13} color="#94A3B8" />
                  <Text style={styles.mntDetailVal}>Responsable: {mnt.technician}</Text>
                </View>
              </View>

              {mnt.notes && (
                <Text style={styles.mntNotes}>📝 {mnt.notes}</Text>
              )}
            </BlurView>
          ))}
        </View>

        {/* Modal Reportar Incidente con Despliegue de Equipos por Edificio y Tipo */}
        <GlassModal
          visible={showIncidentModal}
          onClose={() => setShowIncidentModal(false)}
          title="Reportar Incidente de Red"
          subtitle="Selecciona uno o varios equipos afectados por edificio y tipo"
        >
          <Text style={styles.inputLabel}>Título del Incidente *</Text>
          <TextInput
            placeholder="ej. Caída de enlace fibra óptica Edificio C"
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            style={styles.input}
            value={incTitle}
            onChangeText={setIncTitle}
          />

          <Text style={styles.inputLabel}>Nivel de Severidad *</Text>
          <View style={styles.severitySelector}>
            {(['critical', 'high', 'medium', 'low'] as const).map((s) => {
              const info = getSeverityStyle(s);
              const isSelected = incSeverity === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.sevOption, isSelected && { backgroundColor: info.bg, borderColor: info.text }]}
                  onPress={() => setIncSeverity(s)}
                >
                  <Text style={[styles.sevOptionText, isSelected && { color: info.text }]}>
                    {info.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 🏢 SELECCIÓN DE EQUIPOS AFECTADOS (DESPLEGABLE POR EDIFICIO Y TIPO) */}
          <View style={styles.deviceSelectSection}>
            <View style={styles.deviceSelectHeader}>
              <Text style={styles.inputLabel}>Equipos Afectados ({selectedDeviceIds.length} seleccionados) *</Text>
            </View>

            {/* Chips de equipos ya seleccionados */}
            {selectedDeviceIds.length > 0 && (
              <View style={styles.selectedPillsContainer}>
                {MOCK_DEVICES.filter(d => selectedDeviceIds.includes(d.id)).map(dev => (
                  <View key={dev.id} style={styles.selectedDevicePill}>
                    <Text style={styles.selectedDevicePillText} numberOfLines={1}>{dev.name}</Text>
                    <TouchableOpacity onPress={() => toggleDeviceSelection(dev.id)} style={{ padding: 2 }}>
                      <Feather name="x" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Lista Jerárquica: Edificios -> Categorías -> Dispositivos */}
            <View style={styles.hierarchyWrapper}>
              {groupedHierarchy.map(group => {
                const isBldExpanded = expandedBuildingId === group.building.id;
                const buildingSelectedCount = MOCK_DEVICES.filter(d => d.building_id === group.building.id && selectedDeviceIds.includes(d.id)).length;

                return (
                  <View key={group.building.id} style={styles.buildingGroupCard}>
                    {/* Encabezado del Edificio (Acordeón) */}
                    <TouchableOpacity 
                      style={styles.buildingGroupHeader}
                      activeOpacity={0.7}
                      onPress={() => setExpandedBuildingId(isBldExpanded ? null : group.building.id)}
                    >
                      <View style={styles.bldHeaderTitleRow}>
                        <Feather name="layers" size={14} color="#0A84FF" />
                        <Text style={styles.bldHeaderName}>{group.building.name}</Text>
                      </View>

                      <View style={styles.bldHeaderRight}>
                        {buildingSelectedCount > 0 && (
                          <View style={styles.bldCountBadge}>
                            <Text style={styles.bldCountBadgeText}>{buildingSelectedCount} selec.</Text>
                          </View>
                        )}
                        <Feather 
                          name={isBldExpanded ? "chevron-up" : "chevron-down"} 
                          size={16} 
                          color="rgba(255, 255, 255, 0.6)" 
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Contenido desplegado con tipos de equipo */}
                    {isBldExpanded && (
                      <View style={styles.categoriesBody}>
                        {Object.entries(group.categories).map(([category, devList]) => (
                          <View key={category} style={styles.categorySubGroup}>
                            <View style={styles.categoryTitleRow}>
                              <Feather name={getDeviceIcon(category)} size={12} color="#BF5AF2" />
                              <Text style={styles.categoryGroupTitle}>{category.toUpperCase()}</Text>
                            </View>

                            {/* Lista de Dispositivos seleccionables */}
                            <View style={styles.devicesGrid}>
                              {devList.map(dev => {
                                const isChecked = selectedDeviceIds.includes(dev.id);

                                return (
                                  <TouchableOpacity
                                    key={dev.id}
                                    style={[styles.deviceSelectItem, isChecked && styles.deviceSelectItemActive]}
                                    activeOpacity={0.7}
                                    onPress={() => toggleDeviceSelection(dev.id)}
                                  >
                                    <Feather 
                                      name={isChecked ? "check-square" : "square"} 
                                      size={16} 
                                      color={isChecked ? "#0A84FF" : "rgba(255, 255, 255, 0.35)"} 
                                      style={{ marginRight: 8 }}
                                    />
                                    <View style={{ flex: 1 }}>
                                      <Text style={[styles.deviceSelectName, isChecked && { color: '#FFFFFF' }]}>
                                        {dev.name}
                                      </Text>
                                      <Text style={styles.deviceSelectSub}>
                                        {dev.ipv4_address} • {dev.location}
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Descripción Detallada del Problema *</Text>
          <TextInput
            placeholder="Describe qué ocurrió, síntomas observados y posibles causas..."
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea]}
            value={incDesc}
            onChangeText={setIncDesc}
          />

          <TouchableOpacity 
            style={styles.modalSubmitBtn}
            activeOpacity={0.8}
            onPress={handleSaveIncident}
          >
            <Text style={styles.modalSubmitBtnText}>Registrar Incidencia</Text>
          </TouchableOpacity>
        </GlassModal>

        {/* Modal Agendar Mantenimiento */}
        <GlassModal
          visible={showMaintenanceModal}
          onClose={() => setShowMaintenanceModal(false)}
          title="Agendar Mantenimiento Preventivo"
          subtitle="Programa ventanas de mantenimiento preventivo"
        >
          <Text style={styles.inputLabel}>Título de la Tarea *</Text>
          <TextInput
            placeholder="ej. Actualización de Firmware y Parches de Seguridad"
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            style={styles.input}
            value={mntTitle}
            onChangeText={setMntTitle}
          />

          <Text style={styles.inputLabel}>Equipos / Subredes Objetivo</Text>
          <TextInput
            placeholder="ej. Switch Core y Routers Gateway"
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            style={styles.input}
            value={mntDevice}
            onChangeText={setMntDevice}
          />

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Fecha Programada</Text>
              <TextInput
                placeholder="2026-09-15"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                style={styles.input}
                value={mntDate}
                onChangeText={setMntDate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Ventana de Tiempo</Text>
              <TextInput
                placeholder="02:00 - 05:00 hrs"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                style={styles.input}
                value={mntWindow}
                onChangeText={setMntWindow}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Técnico o Responsable Asignado</Text>
          <TextInput
            placeholder="ej. Ing. Eduardo Rivas"
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            style={styles.input}
            value={mntTech}
            onChangeText={setMntTech}
          />

          <Text style={styles.inputLabel}>Notas y Procedimiento</Text>
          <TextInput
            placeholder="Instrucciones para la ventana de mantenimiento..."
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            multiline
            numberOfLines={2}
            style={[styles.input, styles.textArea]}
            value={mntNotes}
            onChangeText={setMntNotes}
          />

          <TouchableOpacity 
            style={styles.modalSubmitBtn}
            activeOpacity={0.8}
            onPress={handleSaveMaintenance}
          >
            <Text style={styles.modalSubmitBtnText}>Guardar Mantenimiento</Text>
          </TouchableOpacity>
        </GlassModal>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 50,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerBadge: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#FF453A',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 5,
  },
  actionBtnPrimaryText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#000000',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 5,
  },
  actionBtnSecondaryText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  filterChips: {
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  chipText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  chipTextActive: {
    color: '#000000',
  },
  incidentList: {
    gap: 14,
  },
  incidentCard: {
    padding: 18,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  severityBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  severityText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  timestampText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  incidentTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  incidentDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  infoPillText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#FFFFFF',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resolveBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#30D158',
  },
  resolvedStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  resolvedStatusText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#30D158',
  },
  deleteIncBtn: {
    padding: 6,
  },
  maintenanceList: {
    gap: 14,
  },
  maintenanceCard: {
    padding: 18,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  mntTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mntTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mntTypeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#FF9F0A',
  },
  mntStatusBadge: {
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mntStatusText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#0A84FF',
  },
  mntTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  mntDetailGrid: {
    gap: 6,
    marginBottom: 10,
  },
  mntDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mntDetailVal: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#CBD5E1',
  },
  mntNotes: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    fontStyle: 'italic',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  inputLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  input: {
    fontFamily: 'Poppins_400Regular',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 14,
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }) as any,
  },
  severitySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  sevOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  sevOptionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  deviceSelectSection: {
    marginBottom: 14,
  },
  deviceSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  selectedDevicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#0A84FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '90%',
  },
  selectedDevicePillText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  hierarchyWrapper: {
    gap: 10,
  },
  buildingGroupCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  buildingGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  bldHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bldHeaderName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  bldHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bldCountBadge: {
    backgroundColor: 'rgba(10, 132, 255, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bldCountBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#60A5FA',
  },
  categoriesBody: {
    padding: 12,
    gap: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  categorySubGroup: {
    gap: 6,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  categoryGroupTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.8,
  },
  devicesGrid: {
    gap: 6,
  },
  deviceSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  deviceSelectItemActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderColor: 'rgba(10, 132, 255, 0.35)',
  },
  deviceSelectName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  deviceSelectSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#000000',
  },
});
