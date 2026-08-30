import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import GlassModal from '../../components/ui/GlassModal';
import * as api from '../../services/api';
import { Incident, Maintenance, Device, Building } from '../../types';

const SEVERITY_FILTERS = ['Todos', 'Crítico', 'Alto', 'Medio', 'Bajo', 'Resueltos'];

export default function IncidentScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState('Todos');

  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  // Formulario Incidente
  const [incTitle, setIncTitle] = useState('');
  const [incSeverity, setIncSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(null);
  const [incDesc, setIncDesc] = useState('');

  // Formulario Mantenimiento
  const [mntTitle, setMntTitle] = useState('');
  const [mntType, setMntType] = useState<'preventive' | 'firmware' | 'cleaning' | 'ups_battery' | 'audit'>('preventive');
  const [mntDevice, setMntDevice] = useState('');
  const [mntLocation, setMntLocation] = useState('');
  const [mntDate, setMntDate] = useState('2026-09-15');
  const [mntWindow, setMntWindow] = useState('02:00 - 05:00 hrs');
  const [mntTech, setMntTech] = useState('');
  const [mntNotes, setMntNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [incs, mnts, devs, blds] = await Promise.all([
        api.fetchIncidents(), api.fetchMaintenances(), api.fetchDevices(), api.fetchBuildings(),
      ]);
      setIncidents(incs); setMaintenances(mnts); setDevices(devs); setBuildings(blds);
      if (blds.length > 0) setExpandedBuildingId(blds[0].id);
      if (devs.length > 0 && selectedDeviceIds.length === 0) setSelectedDeviceIds([devs[0].id]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const getDeviceCategory = (name: string) => {
    const l = (name || '').toLowerCase();
    if (l.includes('switch')) return 'Switches'; if (l.includes('router') || l.includes('gateway')) return 'Routers & Gateways';
    if (l.includes('servidor') || l.includes('proliant')) return 'Servidores'; if (l.includes('point') || l.includes('unifi') || l.includes('ap')) return 'Access Points (Wi-Fi)';
    if (l.includes('firewall') || l.includes('fortigate')) return 'Firewalls'; return 'Workstations / Equipos';
  };
  const getDeviceIcon = (category: string): keyof typeof Feather.glyphMap => {
    switch (category) { case 'Switches': return 'server'; case 'Routers & Gateways': return 'radio'; case 'Servidores': return 'hard-drive'; case 'Access Points (Wi-Fi)': return 'wifi'; case 'Firewalls': return 'shield'; default: return 'monitor'; }
  };

  const groupedHierarchy = useMemo(() => {
    return buildings.map(bld => {
      const bldDevices = devices.filter(d => d.building_id === bld.id || d.location.includes(bld.code));
      const categories: { [cat: string]: Device[] } = {};
      bldDevices.forEach(dev => { const cat = getDeviceCategory(dev.name); if (!categories[cat]) categories[cat] = []; categories[cat].push(dev); });
      return { building: bld, categories, totalDevices: bldDevices.length };
    });
  }, [buildings, devices]);

  const toggleDevice = (id: string) => setSelectedDeviceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const filteredIncidents = incidents.filter(inc => {
    if (activeSeverityFilter === 'Todos') return true; if (activeSeverityFilter === 'Crítico') return inc.severity === 'critical';
    if (activeSeverityFilter === 'Alto') return inc.severity === 'high'; if (activeSeverityFilter === 'Medio') return inc.severity === 'medium';
    if (activeSeverityFilter === 'Bajo') return inc.severity === 'low'; if (activeSeverityFilter === 'Resueltos') return inc.status === 'resolved'; return true;
  });

  const severityConfig: Record<string, { color: string; bg: string; label: string; icon: keyof typeof Feather.glyphMap }> = {
    critical: { color: '#FF453A', bg: 'rgba(255, 69, 58, 0.12)', label: 'CRÍTICO', icon: 'zap' },
    high: { color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.12)', label: 'ALTO', icon: 'alert-triangle' },
    medium: { color: '#FFD60A', bg: 'rgba(255, 214, 10, 0.12)', label: 'MEDIO', icon: 'alert-circle' },
    low: { color: '#30D158', bg: 'rgba(48, 209, 88, 0.12)', label: 'BAJO', icon: 'info' },
  };
  const statusConfig: Record<string, { color: string; label: string }> = {
    open: { color: '#FF453A', label: 'Abierto' }, in_progress: { color: '#FF9F0A', label: 'En progreso' }, resolved: { color: '#30D158', label: 'Resuelto' },
  };
  const maintTypeConfig: Record<string, { color: string; icon: keyof typeof Feather.glyphMap; label: string }> = {
    preventive: { color: '#0A84FF', icon: 'tool', label: 'Preventivo' }, firmware: { color: '#BF5AF2', icon: 'download-cloud', label: 'Firmware' },
    cleaning: { color: '#64D2FF', icon: 'wind', label: 'Limpieza' }, ups_battery: { color: '#FFD60A', icon: 'battery-charging', label: 'UPS / Baterías' },
    audit: { color: '#30D158', icon: 'clipboard', label: 'Auditoría' },
  };

  const handleSaveIncident = async () => {
    if (!incTitle || !incDesc || selectedDeviceIds.length === 0) return;
    try {
      const selectedDevs = devices.filter(d => selectedDeviceIds.includes(d.id));
      const deviceNames = selectedDevs.map(d => d.name).join(', ');
      const deviceIps = selectedDevs.map(d => d.ipv4_address).join(', ');
      const location = selectedDevs[0]?.location || '';
      await api.createIncident({ title: incTitle, description: incDesc, severity: incSeverity, device_id: selectedDeviceIds[0], device_name: deviceNames, device_ip: deviceIps, location });
      setShowIncidentModal(false); setIncTitle(''); setIncDesc(''); setIncSeverity('high');
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleResolve = async (id: string) => {
    try { await api.resolveIncident(id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleDeleteIncident = async (id: string) => {
    try { await api.deleteIncident(id); await loadData(); } catch (err) { console.error(err); }
  };

  const handleSaveMaintenance = async () => {
    if (!mntTitle || !mntDate || !mntDevice) return;
    const typeLabels: Record<string, string> = { preventive: 'Preventivo', firmware: 'Actualización de Firmware', cleaning: 'Limpieza y Desempolvado', ups_battery: 'Revisión de Energía / UPS', audit: 'Auditoría de Seguridad' };
    try {
      await api.createMaintenance({ title: mntTitle, type: mntType, type_label: typeLabels[mntType] || 'Preventivo', device_name: mntDevice, location: mntLocation, scheduled_date: mntDate, time_window: mntWindow, impact: 'none', technician: mntTech, notes: mntNotes });
      setShowMaintenanceModal(false); setMntTitle(''); setMntDevice(''); setMntLocation(''); setMntNotes(''); setMntTech('');
      await loadData();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (<LinearGradient colors={['#050505', '#121212']} style={styles.container}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#FF453A" /></View></LinearGradient>);
  }

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isTablet ? '8%' : '4%' }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View><Text style={styles.headerBadge}>CENTRO DE CONTROL</Text><Text style={styles.headerTitle}>Incidentes y Mantenimientos</Text><Text style={styles.headerSubtitle}>{incidents.filter(i => i.status !== 'resolved').length} incidentes activos • {maintenances.length} tareas programadas</Text></View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.reportButton} activeOpacity={0.8} onPress={() => setShowIncidentModal(true)}><Feather name="alert-triangle" size={14} color="#FF453A" /><Text style={styles.reportButtonText}>Reportar Falla</Text></TouchableOpacity>
            <TouchableOpacity style={styles.scheduleButton} activeOpacity={0.8} onPress={() => setShowMaintenanceModal(true)}><Feather name="calendar" size={14} color="#0A84FF" /><Text style={styles.scheduleButtonText}>Agendar</Text></TouchableOpacity>
          </View>
        </View>

        {/* Filtros de Severidad */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {SEVERITY_FILTERS.map(f => { const isActive = activeSeverityFilter === f; return (<TouchableOpacity key={f} style={[styles.filterChip, isActive && styles.filterChipActive]} activeOpacity={0.7} onPress={() => setActiveSeverityFilter(f)}><Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{f}</Text></TouchableOpacity>); })}
        </ScrollView>

        {/* Incidentes */}
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Incidentes Reportados</Text><Text style={styles.sectionCount}>{filteredIncidents.length}</Text></View>
        <View style={styles.cardList}>
          {filteredIncidents.map(inc => {
            const sev = severityConfig[inc.severity]; const stat = statusConfig[inc.status];
            return (
              <BlurView key={inc.id} intensity={30} tint="dark" style={styles.incidentCard}>
                <View style={styles.incTopRow}>
                  <View style={[styles.sevBadge, { backgroundColor: sev.bg }]}><Feather name={sev.icon} size={14} color={sev.color} /><Text style={[styles.sevText, { color: sev.color }]}>{sev.label}</Text></View>
                  <View style={[styles.statBadge, { borderColor: stat.color }]}><View style={[styles.statDot, { backgroundColor: stat.color }]} /><Text style={[styles.statText, { color: stat.color }]}>{stat.label}</Text></View>
                </View>
                <Text style={styles.incTitle}>{inc.title}</Text>
                <Text style={styles.incDesc}>{inc.description}</Text>
                <View style={styles.incMeta}>
                  <View style={styles.metaItem}><Feather name="cpu" size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.metaText}>{inc.device_name}</Text></View>
                  <View style={styles.metaItem}><Feather name="map-pin" size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.metaText}>{inc.location}</Text></View>
                </View>
                <View style={styles.incActions}>
                  {inc.status !== 'resolved' && (<TouchableOpacity style={styles.resolveBtn} activeOpacity={0.7} onPress={() => handleResolve(inc.id)}><Feather name="check-circle" size={14} color="#30D158" /><Text style={styles.resolveBtnText}>Resolver</Text></TouchableOpacity>)}
                  <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.7} onPress={() => handleDeleteIncident(inc.id)}><Feather name="trash-2" size={14} color="#FF453A" /></TouchableOpacity>
                </View>
              </BlurView>
            );
          })}
          {filteredIncidents.length === 0 && <Text style={styles.emptyText}>No hay incidentes con este filtro.</Text>}
        </View>

        {/* Mantenimientos */}
        <View style={[styles.sectionHeader, { marginTop: 30 }]}><Text style={styles.sectionTitle}>Mantenimientos Programados</Text><Text style={styles.sectionCount}>{maintenances.length}</Text></View>
        <View style={styles.cardList}>
          {maintenances.map(mnt => {
            const tc = maintTypeConfig[mnt.type] || maintTypeConfig.preventive;
            return (
              <BlurView key={mnt.id} intensity={30} tint="dark" style={styles.maintCard}>
                <View style={styles.maintTopRow}>
                  <View style={[styles.maintTypeBadge, { backgroundColor: `${tc.color}20`, borderColor: `${tc.color}40` }]}><Feather name={tc.icon} size={14} color={tc.color} /><Text style={[styles.maintTypeText, { color: tc.color }]}>{tc.label}</Text></View>
                  <Text style={styles.maintDate}>{mnt.scheduled_date}</Text>
                </View>
                <Text style={styles.maintTitle}>{mnt.title}</Text>
                <View style={styles.maintMeta}>
                  <View style={styles.metaItem}><Feather name="cpu" size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.metaText}>{mnt.device_name}</Text></View>
                  <View style={styles.metaItem}><Feather name="map-pin" size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.metaText}>{mnt.location}</Text></View>
                  {mnt.technician ? <View style={styles.metaItem}><Feather name="user" size={12} color="rgba(255,255,255,0.4)" /><Text style={styles.metaText}>{mnt.technician}</Text></View> : null}
                </View>
                {mnt.notes ? <Text style={styles.maintNotes}>{mnt.notes}</Text> : null}
              </BlurView>
            );
          })}
          {maintenances.length === 0 && <Text style={styles.emptyText}>No hay mantenimientos programados.</Text>}
        </View>

        {/* Modal Reportar Incidente */}
        <GlassModal visible={showIncidentModal} onClose={() => setShowIncidentModal(false)} title="Reportar Incidente" subtitle="Registra una falla o evento crítico en la infraestructura">
          <Text style={styles.inputLabel}>Título del Incidente *</Text>
          <TextInput placeholder="ej. Pérdida de conectividad en Enlace Fibra" placeholderTextColor="rgba(255,255,255,0.25)" style={styles.input} value={incTitle} onChangeText={setIncTitle} />
          <Text style={styles.inputLabel}>Severidad *</Text>
          <View style={styles.severityRow}>
            {(['critical', 'high', 'medium', 'low'] as const).map(s => { const cfg = severityConfig[s]; return (<TouchableOpacity key={s} style={[styles.severityOption, incSeverity === s && { backgroundColor: cfg.bg, borderColor: cfg.color }]} activeOpacity={0.7} onPress={() => setIncSeverity(s)}><Feather name={cfg.icon} size={14} color={incSeverity === s ? cfg.color : 'rgba(255,255,255,0.4)'} /><Text style={[styles.severityOptionText, incSeverity === s && { color: cfg.color }]}>{cfg.label}</Text></TouchableOpacity>); })}
          </View>
          <Text style={styles.inputLabel}>Equipos Afectados *</Text>
          <ScrollView style={{ maxHeight: 220, marginBottom: 14 }}>
            {groupedHierarchy.map(({ building: bld, categories, totalDevices }) => (
              <View key={bld.id}>
                <TouchableOpacity style={styles.buildingHeader} activeOpacity={0.7} onPress={() => setExpandedBuildingId(expandedBuildingId === bld.id ? null : bld.id)}>
                  <Feather name={expandedBuildingId === bld.id ? 'chevron-down' : 'chevron-right'} size={14} color="#FFFFFF" />
                  <Text style={styles.buildingName}>{bld.name}</Text>
                  <Text style={styles.buildingCount}>{totalDevices}</Text>
                </TouchableOpacity>
                {expandedBuildingId === bld.id && Object.entries(categories).map(([cat, devs]) => (
                  <View key={cat} style={styles.categoryGroup}>
                    <View style={styles.categoryHeader}><Feather name={getDeviceIcon(cat)} size={12} color="#0A84FF" /><Text style={styles.categoryName}>{cat}</Text></View>
                    {devs.map(dev => { const isChecked = selectedDeviceIds.includes(dev.id); return (
                      <TouchableOpacity key={dev.id} style={[styles.deviceOption, isChecked && styles.deviceOptionActive]} activeOpacity={0.7} onPress={() => toggleDevice(dev.id)}>
                        <Feather name={isChecked ? 'check-square' : 'square'} size={14} color={isChecked ? '#0A84FF' : 'rgba(255,255,255,0.3)'} />
                        <View style={styles.deviceOptionText}><Text style={styles.deviceOptionName}>{dev.name}</Text><Text style={styles.deviceOptionIp}>{dev.ipv4_address}</Text></View>
                      </TouchableOpacity>
                    ); })}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <Text style={styles.inputLabel}>Descripción del Incidente *</Text>
          <TextInput placeholder="Describe el incidente en detalle..." placeholderTextColor="rgba(255,255,255,0.25)" multiline numberOfLines={3} style={[styles.input, styles.textArea]} value={incDesc} onChangeText={setIncDesc} />
          <TouchableOpacity style={styles.submitIncident} activeOpacity={0.8} onPress={handleSaveIncident}><Text style={styles.submitIncidentText}>Enviar Reporte de Incidente</Text></TouchableOpacity>
        </GlassModal>

        {/* Modal Agendar Mantenimiento */}
        <GlassModal visible={showMaintenanceModal} onClose={() => setShowMaintenanceModal(false)} title="Agendar Mantenimiento" subtitle="Programa una tarea de mantenimiento preventivo o correctivo">
          <Text style={styles.inputLabel}>Título *</Text>
          <TextInput placeholder="ej. Actualización de firmware IOS-XE" placeholderTextColor="rgba(255,255,255,0.25)" style={styles.input} value={mntTitle} onChangeText={setMntTitle} />
          <Text style={styles.inputLabel}>Tipo de Mantenimiento *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {Object.entries(maintTypeConfig).map(([key, cfg]) => (<TouchableOpacity key={key} style={[styles.typeOption, mntType === key && { backgroundColor: `${cfg.color}20`, borderColor: cfg.color }]} activeOpacity={0.7} onPress={() => setMntType(key as any)}><Feather name={cfg.icon} size={12} color={mntType === key ? cfg.color : 'rgba(255,255,255,0.4)'} /><Text style={[styles.typeOptionText, mntType === key && { color: cfg.color }]}>{cfg.label}</Text></TouchableOpacity>))}
          </ScrollView>
          <View style={styles.formRow}><View style={{ flex: 1 }}><Text style={styles.inputLabel}>Equipo(s) Afectados *</Text><TextInput placeholder="ej. Switch Core" placeholderTextColor="rgba(255,255,255,0.25)" style={styles.input} value={mntDevice} onChangeText={setMntDevice} /></View><View style={{ flex: 1 }}><Text style={styles.inputLabel}>Ubicación</Text><TextInput placeholder="ej. Edificio A" placeholderTextColor="rgba(255,255,255,0.25)" style={styles.input} value={mntLocation} onChangeText={setMntLocation} /></View></View>
          <View style={styles.formRow}><View style={{ flex: 1 }}><Text style={styles.inputLabel}>Fecha Programada *</Text><TextInput placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.25)" style={styles.input} value={mntDate} onChangeText={setMntDate} /></View><View style={{ flex: 1 }}><Text style={styles.inputLabel}>Ventana Horaria</Text><TextInput placeholder="02:00 - 05:00 hrs" placeholderTextColor="rgba(255,255,255,0.25)" style={styles.input} value={mntWindow} onChangeText={setMntWindow} /></View></View>
          <Text style={styles.inputLabel}>Técnico Responsable</Text>
          <TextInput placeholder="Nombre del técnico o equipo" placeholderTextColor="rgba(255,255,255,0.25)" style={styles.input} value={mntTech} onChangeText={setMntTech} />
          <Text style={styles.inputLabel}>Notas Adicionales</Text>
          <TextInput placeholder="Observaciones..." placeholderTextColor="rgba(255,255,255,0.25)" multiline numberOfLines={2} style={[styles.input, styles.textArea]} value={mntNotes} onChangeText={setMntNotes} />
          <TouchableOpacity style={styles.submitMaint} activeOpacity={0.8} onPress={handleSaveMaintenance}><Text style={styles.submitMaintText}>Programar Mantenimiento</Text></TouchableOpacity>
        </GlassModal>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, scrollContent: { paddingTop: 50, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#FF453A', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#FFFFFF', letterSpacing: 0.3 },
  headerSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255, 255, 255, 0.45)', marginTop: 2 },
  headerButtons: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  reportButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(255, 69, 58, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.3)' },
  reportButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#FF453A' },
  scheduleButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(10, 132, 255, 0.12)', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.3)' },
  scheduleButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#0A84FF' },
  filtersRow: { gap: 8, marginBottom: 20 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  filterChipActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  filterChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' },
  filterChipTextActive: { color: '#000000' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#FFFFFF' },
  sectionCount: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: 'rgba(255, 255, 255, 0.4)' },
  cardList: { gap: 14 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic', paddingVertical: 12 },
  incidentCard: { padding: 18, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  incTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sevBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sevText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, letterSpacing: 0.5 },
  statBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
  incTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#FFFFFF', marginBottom: 4 },
  incDesc: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 18, marginBottom: 10 },
  incMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12, paddingTop: 10, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' },
  incActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(48, 209, 88, 0.12)', borderWidth: 1, borderColor: 'rgba(48, 209, 88, 0.3)' },
  resolveBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#30D158' },
  deleteBtn: { padding: 6 },
  maintCard: { padding: 18, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  maintTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  maintTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  maintTypeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  maintDate: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' },
  maintTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#FFFFFF', marginBottom: 8 },
  maintMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 8, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  maintNotes: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  inputLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 6 },
  input: { fontFamily: 'Poppins_400Regular', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 14, padding: 14, color: '#FFFFFF', fontSize: 14, marginBottom: 14, ...Platform.select({ web: { outlineStyle: 'none' } }) as any },
  formRow: { flexDirection: 'row', gap: 12 },
  textArea: { height: 60, textAlignVertical: 'top' },
  severityRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  severityOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  severityOptionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' },
  typeOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', marginRight: 8 },
  typeOptionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' },
  buildingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.04)', marginBottom: 4 },
  buildingName: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#FFFFFF', flex: 1 },
  buildingCount: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255, 255, 255, 0.4)' },
  categoryGroup: { marginLeft: 16, marginBottom: 6 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  categoryName: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' },
  deviceOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginBottom: 2 },
  deviceOptionActive: { backgroundColor: 'rgba(10, 132, 255, 0.08)' },
  deviceOptionText: { flex: 1 },
  deviceOptionName: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#FFFFFF' },
  deviceOptionIp: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: 'rgba(255, 255, 255, 0.4)' },
  submitIncident: { backgroundColor: '#FF453A', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  submitIncidentText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' },
  submitMaint: { backgroundColor: '#0A84FF', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  submitMaintText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' },
});
