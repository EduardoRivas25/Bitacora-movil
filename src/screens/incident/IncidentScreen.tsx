import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import GlassModal from '../../components/ui/GlassModal';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { Incident, Maintenance, Device, Building } from '../../types';

const SEVERITY_FILTERS = ['Todos', 'Crítico', 'Alto', 'Medio', 'Bajo', 'Resueltos'];

function localEventFields(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function parseEventDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const result = new Date(year, month - 1, day, hour, minute);
  return result.getFullYear() === year && result.getMonth() === month - 1 &&
    result.getDate() === day && result.getHours() === hour && result.getMinutes() === minute
    ? result : null;
}

function formatEventDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' :
    date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function IncidentScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
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
  const [incDate, setIncDate] = useState(() => localEventFields().date);
  const [incTime, setIncTime] = useState(() => localEventFields().time);
  const [incInitialAction, setIncInitialAction] = useState('');
  const [incError, setIncError] = useState('');
  const [incFieldErrors, setIncFieldErrors] = useState<{ [key: string]: string }>({});
  const [actionIncident, setActionIncident] = useState<Incident | null>(null);
  const [actionKind, setActionKind] = useState<'follow_up' | 'resolution'>('follow_up');
  const [actionText, setActionText] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);

  // Formulario Mantenimiento
  const [mntTitle, setMntTitle] = useState('');
  const [mntType, setMntType] = useState<'preventive' | 'firmware' | 'cleaning' | 'ups_battery' | 'audit'>('preventive');
  const [mntDevice, setMntDevice] = useState('');
  const [mntLocation, setMntLocation] = useState('');
  const [mntDate, setMntDate] = useState('2026-09-15');
  const [mntWindow, setMntWindow] = useState('02:00 - 05:00 hrs');
  const [mntTech, setMntTech] = useState('');
  const [mntNotes, setMntNotes] = useState('');
  const [mntError, setMntError] = useState('');
  const [mntFieldErrors, setMntFieldErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingMaint, setIsSubmittingMaint] = useState(false);

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && incidents.length === 0 && maintenances.length === 0) setLoading(true);
      const [incs, mnts, devs, blds] = await Promise.all([
        api.fetchIncidents(isSilent), api.fetchMaintenances(isSilent), api.fetchDevices(isSilent), api.fetchBuildings(isSilent),
      ]);
      setIncidents(incs); setMaintenances(mnts); setDevices(devs); setBuildings(blds);
      setExpandedBuildingId(current => current || blds[0]?.id || 'unassigned');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [incidents.length, maintenances.length]);

  useFocusEffect(useCallback(() => { loadData(true); }, [loadData]));

  const handleOpenIncidentModal = () => {
    setIncError('');
    setIncFieldErrors({});
    const now = localEventFields();
    setIncDate(now.date);
    setIncTime(now.time);
    setShowIncidentModal(true);
  };

  const openActionModal = (incident: Incident, kind: 'follow_up' | 'resolution') => {
    setActionIncident(incident);
    setActionKind(kind);
    setActionText('');
    setActionError('');
  };

  const handleOpenMaintenanceModal = () => {
    setMntError('');
    setMntFieldErrors({});
    setShowMaintenanceModal(true);
  };

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
    const assignedIds = new Set<string>();
    const groupDevices = (group: Device[]) => {
      const categories: { [cat: string]: Device[] } = {};
      group.forEach(dev => { const cat = getDeviceCategory(dev.name); if (!categories[cat]) categories[cat] = []; categories[cat].push(dev); });
      return categories;
    };
    const groups = buildings.map(bld => {
      const bldDevices = devices.filter(d => !assignedIds.has(d.id) &&
        (d.building_id === bld.id || (!!bld.code && d.location.includes(bld.code))));
      bldDevices.forEach(device => assignedIds.add(device.id));
      return { building: bld, categories: groupDevices(bldDevices), totalDevices: bldDevices.length };
    });
    const unassigned = devices.filter(device => !assignedIds.has(device.id));
    if (unassigned.length) {
      groups.push({
        building: { id: 'unassigned', name: 'Otros equipos', code: '' } as Building,
        categories: groupDevices(unassigned), totalDevices: unassigned.length,
      });
    }
    return groups;
  }, [buildings, devices]);

  const toggleDevice = (id: string) => {
    setSelectedDeviceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    if (incFieldErrors.devices) setIncFieldErrors(prev => ({ ...prev, devices: '' }));
  };

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
    if (isSubmitting) return;
    setIncError('');
    const errors: { [key: string]: string } = {};

    if (!incTitle || incTitle.trim().length < 3) {
      errors.title = 'El título del incidente debe tener al menos 3 caracteres.';
    }
    if (selectedDeviceIds.length === 0) {
      errors.devices = 'Debes seleccionar al menos un equipo afectado.';
    }
    if (!incDesc || incDesc.trim().length < 5) {
      errors.desc = 'La descripción debe tener al menos 5 caracteres.';
    }
    const eventDateTime = parseEventDateTime(incDate.trim(), incTime.trim());
    if (!eventDateTime) {
      errors.event = 'Ingresa una fecha válida (AAAA-MM-DD) y una hora válida (HH:mm).';
    } else if (eventDateTime.getTime() > Date.now()) {
      errors.event = 'La fecha y hora del incidente no pueden estar en el futuro.';
    }

    setIncFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setIncError(Object.values(errors)[0]);
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedDevs = devices.filter(d => selectedDeviceIds.includes(d.id));
      const location = selectedDevs[0]?.location || '';
      await api.createIncident({ 
        title: incTitle.trim(), 
        description: incDesc.trim(), 
        severity: incSeverity, 
        event_at: eventDateTime!.toISOString(),
        affected_devices: selectedDevs.map(device => ({
          id: device.id, name: device.name, ip: device.ipv4_address,
        })),
        initial_action: incInitialAction.trim(),
        location 
      });
      setShowIncidentModal(false); 
      setIncTitle(''); 
      setIncDesc(''); 
      setIncInitialAction('');
      setIncSeverity('high');
      setIncError('');
      setIncFieldErrors({});
      loadData(true);
    } catch (err: any) { 
      setIncError(err?.message || 'Error al guardar el incidente');
      console.error(err); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAction = async () => {
    if (!actionIncident || isSavingAction) return;
    if (actionText.trim().length < 5) {
      setActionError('Describe la acción realizada con al menos 5 caracteres.');
      return;
    }
    try {
      setIsSavingAction(true);
      const updated = await api.addIncidentAction(actionIncident.id, actionText, actionKind);
      setIncidents(prev => prev.map(incident => incident.id === updated.id ? updated : incident));
      setActionIncident(null);
    } catch (err: any) {
      setActionError(err?.message || 'No se pudo guardar el seguimiento.');
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleDeleteIncident = async (id: string) => {
    // Actualización optimista instantánea (0ms)
    const prevIncidents = [...incidents];
    setIncidents(prev => prev.filter(inc => inc.id !== id));
    try { 
      await api.deleteIncident(id); 
    } catch (err) { 
      console.error(err); 
      setIncidents(prevIncidents);
    }
  };

  const handleSaveMaintenance = async () => {
    if (isSubmittingMaint) return;
    setMntError('');
    const errors: { [key: string]: string } = {};

    if (!mntTitle || mntTitle.trim().length < 3) {
      errors.title = 'El título del mantenimiento debe tener al menos 3 caracteres.';
    }
    if (!mntDevice || mntDevice.trim().length < 2) {
      errors.device = 'Ingresa el nombre o identificador del equipo.';
    }
    
    // Validación estricta de fecha YYYY-MM-DD
    const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!mntDate || !dateRegex.test(mntDate.trim())) {
      errors.date = 'La fecha debe tener formato YYYY-MM-DD (ej. 2026-09-15).';
    }

    setMntFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setMntError(Object.values(errors)[0]);
      return;
    }

    const typeLabels: Record<string, string> = { 
      preventive: 'Preventivo', 
      firmware: 'Actualización de Firmware', 
      cleaning: 'Limpieza y Desempolvado', 
      ups_battery: 'Revisión de Energía / UPS', 
      audit: 'Auditoría de Seguridad' 
    };

    try {
      setIsSubmittingMaint(true);
      await api.createMaintenance({ 
        title: mntTitle.trim(), 
        type: mntType, 
        type_label: typeLabels[mntType] || 'Preventivo', 
        device_name: mntDevice.trim(), 
        location: mntLocation.trim() || 'No especificada', 
        scheduled_date: mntDate.trim(), 
        time_window: mntWindow.trim() || '02:00 - 05:00 hrs', 
        impact: 'none', 
        technician: mntTech.trim() || 'Personal de Guardia', 
        notes: mntNotes.trim() 
      });
      setShowMaintenanceModal(false); 
      setMntTitle(''); 
      setMntDevice(''); 
      setMntLocation(''); 
      setMntNotes(''); 
      setMntTech('');
      setMntError('');
      setMntFieldErrors({});
      loadData(true);
    } catch (err: any) { 
      setMntError(err?.message || 'Error al agendar mantenimiento');
      console.error(err); 
    } finally {
      setIsSubmittingMaint(false);
    }
  };

  const isSmallMobile = width < 380;
  const isDesktop = width >= 1024;

  if (loading && incidents.length === 0 && maintenances.length === 0) {
    return (
      <LinearGradient colors={colors.gradient} style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF453A" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isDesktop ? '6%' : isTablet ? '4%' : 16 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.innerWrapper}>
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={styles.headerBadge}>CENTRO DE CONTROL</Text>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }, isSmallMobile && { fontSize: 22 }]}>Incidentes & Mantenimiento</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>{incidents.filter(i => i.status !== 'resolved').length} incidentes activos • {maintenances.length} tareas programadas</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.reportButton} activeOpacity={0.8} onPress={handleOpenIncidentModal}>
                <Feather name="alert-triangle" size={13} color="#FF453A" />
                <Text style={styles.reportButtonText}>Reportar Falla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.scheduleButton} activeOpacity={0.8} onPress={handleOpenMaintenanceModal}>
                <Feather name="calendar" size={13} color="#0A84FF" />
                <Text style={styles.scheduleButtonText}>Agendar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filtros de Severidad */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
            {SEVERITY_FILTERS.map(f => { 
              const isActive = activeSeverityFilter === f; 
              return (
                <TouchableOpacity 
                  key={f} 
                  style={[
                    styles.filterChip, 
                    { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                    isActive && { backgroundColor: colors.chipActiveBg, borderColor: colors.chipActiveBg }
                  ]} 
                  activeOpacity={0.7} 
                  onPress={() => setActiveSeverityFilter(f)}
                >
                  <Text style={[
                    styles.filterChipText, 
                    { color: colors.textSecondary },
                    isActive && { color: colors.chipActiveText }
                  ]}>{f}</Text>
                </TouchableOpacity>
              ); 
            })}
          </ScrollView>

          {/* Layout Principal: 2 columnas en Desktop, Stack en Mobile/Tablet */}
          <View style={[styles.desktopSplit, isDesktop && styles.desktopSplitActive]}>
            {/* Columna / Sección Incidentes */}
            <View style={[styles.columnWrapper, isDesktop && { flex: 1 }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Incidentes Reportados</Text>
                <Text style={[styles.sectionCount, { backgroundColor: colors.chipBg, color: colors.textSecondary }]}>{filteredIncidents.length}</Text>
              </View>
              <View style={styles.cardList}>
                {filteredIncidents.map(inc => {
                  const sev = severityConfig[inc.severity]; const stat = statusConfig[inc.status];
                  return (
                    <BlurView 
                      key={inc.id} 
                      intensity={colors.blurIntensity} 
                      tint={colors.blurTint} 
                      style={[styles.incidentCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    >
                      <View style={styles.incTopRow}>
                        <View style={[styles.sevBadge, { backgroundColor: sev.bg }]}><Feather name={sev.icon} size={13} color={sev.color} /><Text style={[styles.sevText, { color: sev.color }]}>{sev.label}</Text></View>
                        <View style={[styles.statBadge, { borderColor: stat.color }]}><View style={[styles.statDot, { backgroundColor: stat.color }]} /><Text style={[styles.statText, { color: stat.color }]}>{stat.label}</Text></View>
                      </View>
                      <Text style={[styles.incTitle, { color: colors.textPrimary }]}>{inc.title}</Text>
                      <Text style={[styles.incDesc, { color: colors.textSecondary }]}>{inc.description}</Text>
                      <View style={styles.incMeta}>
                        <View style={styles.metaItem}><Feather name="clock" size={12} color={colors.textTertiary} /><Text style={[styles.metaText, { color: colors.textTertiary }]}>Evento: {formatEventDateTime(inc.event_at || inc.created_at)}</Text></View>
                        <View style={styles.metaItem}><Feather name="user" size={12} color={colors.textTertiary} /><Text style={[styles.metaText, { color: colors.textTertiary }]}>Registró: {inc.reported_by || 'No registrado'}</Text></View>
                        {(inc.affected_devices || []).map((device, index) => (
                          <View key={`${device.id}-${index}`} style={styles.metaItem}>
                            <Feather name="cpu" size={12} color={colors.textTertiary} />
                            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{device.name}{device.ip ? ` · ${device.ip}` : ''}</Text>
                          </View>
                        ))}
                        <View style={styles.metaItem}><Feather name="map-pin" size={12} color={colors.textTertiary} /><Text style={[styles.metaText, { color: colors.textTertiary }]}>{inc.location}</Text></View>
                      </View>
                      {!!inc.actions?.length && (
                        <View style={[styles.actionHistory, { borderColor: colors.divider }]}>
                          {inc.actions.map((action, index) => (
                            <View key={`${action.at}-${index}`}>
                              <Text style={[styles.actionHistoryTitle, { color: colors.textPrimary }]}>
                                {action.kind === 'resolution' ? 'Solución' : 'Seguimiento'} · {formatEventDateTime(action.at)}
                              </Text>
                              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{action.text}</Text>
                              <Text style={[styles.metaText, { color: colors.textTertiary }]}>{action.by}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      <View style={styles.incActions}>
                        <TouchableOpacity
                          style={[styles.resolveBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                          activeOpacity={0.7}
                          onPress={() => openActionModal(inc, 'follow_up')}
                        >
                          <Feather name="edit-3" size={13} color={colors.textSecondary} />
                          <Text style={[styles.resolveBtnText, { color: colors.textSecondary }]}>Seguimiento</Text>
                        </TouchableOpacity>
                        {inc.status !== 'resolved' && (
                          <TouchableOpacity 
                            style={[styles.resolveBtn, { backgroundColor: isDark ? 'rgba(48, 209, 88, 0.12)' : 'rgba(48, 209, 88, 0.1)', borderColor: 'rgba(48, 209, 88, 0.3)' }]} 
                            activeOpacity={0.7} 
                            onPress={() => openActionModal(inc, 'resolution')}
                          >
                            <Feather name="check-circle" size={13} color="#30D158" />
                            <Text style={styles.resolveBtnText}>Resolver</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors.chipBg }]} activeOpacity={0.7} onPress={() => handleDeleteIncident(inc.id)}>
                          <Feather name="trash-2" size={14} color="#FF453A" />
                        </TouchableOpacity>
                      </View>
                    </BlurView>
                  );
                })}
                {filteredIncidents.length === 0 && <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No hay incidentes con este filtro.</Text>}
              </View>
            </View>

            {/* Columna / Sección Mantenimientos */}
            <View style={[styles.columnWrapper, isDesktop && { flex: 1 }, !isDesktop && { marginTop: 24 }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Mantenimientos Programados</Text>
                <Text style={[styles.sectionCount, { backgroundColor: colors.chipBg, color: colors.textSecondary }]}>{maintenances.length}</Text>
              </View>
              <View style={styles.cardList}>
                {maintenances.map(mnt => {
                  const tc = maintTypeConfig[mnt.type] || maintTypeConfig.preventive;
                  return (
                    <BlurView 
                      key={mnt.id} 
                      intensity={colors.blurIntensity} 
                      tint={colors.blurTint} 
                      style={[styles.maintCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    >
                      <View style={styles.maintTopRow}>
                        <View style={[styles.maintTypeBadge, { backgroundColor: `${tc.color}20`, borderColor: `${tc.color}40` }]}><Feather name={tc.icon} size={13} color={tc.color} /><Text style={[styles.maintTypeText, { color: tc.color }]}>{tc.label}</Text></View>
                        <Text style={[styles.maintDate, { color: colors.textTertiary }]}>{mnt.scheduled_date}</Text>
                      </View>
                      <Text style={[styles.maintTitle, { color: colors.textPrimary }]}>{mnt.title}</Text>
                      <View style={styles.maintMeta}>
                        <View style={styles.metaItem}><Feather name="cpu" size={12} color={colors.textTertiary} /><Text style={[styles.metaText, { color: colors.textTertiary }]}>{mnt.device_name}</Text></View>
                        <View style={styles.metaItem}><Feather name="map-pin" size={12} color={colors.textTertiary} /><Text style={[styles.metaText, { color: colors.textTertiary }]}>{mnt.location}</Text></View>
                        {mnt.technician ? <View style={styles.metaItem}><Feather name="user" size={12} color={colors.textTertiary} /><Text style={[styles.metaText, { color: colors.textTertiary }]}>{mnt.technician}</Text></View> : null}
                      </View>
                      {mnt.notes ? <Text style={[styles.maintNotes, { color: colors.textSecondary }]}>{mnt.notes}</Text> : null}
                    </BlurView>
                  );
                })}
                {maintenances.length === 0 && <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No hay mantenimientos programados.</Text>}
              </View>
            </View>
          </View>
        </View>

        {/* Modal Reportar Incidente */}
        <GlassModal visible={showIncidentModal} onClose={() => setShowIncidentModal(false)} title="Reportar Incidente" subtitle="Registra una falla o evento crítico en la infraestructura">
          {incError !== '' && (
            <View style={styles.modalErrorContainer}>
              <Feather name="alert-circle" size={15} color="#FF453A" />
              <Text style={styles.modalErrorText}>{incError}</Text>
            </View>
          )}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Título del Incidente *</Text>
          <TextInput 
            placeholder="ej. Pérdida de conectividad en Enlace Fibra" 
            placeholderTextColor={colors.placeholder} 
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }, incFieldErrors.title && styles.inputError]} 
            value={incTitle} 
            onChangeText={(val) => {
              setIncTitle(val);
              if (incFieldErrors.title) setIncFieldErrors(prev => ({ ...prev, title: '' }));
            }} 
          />
          {incFieldErrors.title && <Text style={styles.fieldErrorText}>{incFieldErrors.title}</Text>}

          <View style={[styles.formRow, isSmallMobile && { flexDirection: 'column', gap: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Fecha del evento (AAAA-MM-DD) *</Text>
              <TextInput
                value={incDate}
                onChangeText={setIncDate}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.placeholder}
                keyboardType="numbers-and-punctuation"
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }, incFieldErrors.event && styles.inputError]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Hora del evento (HH:mm) *</Text>
              <TextInput
                value={incTime}
                onChangeText={setIncTime}
                placeholder="HH:mm"
                placeholderTextColor={colors.placeholder}
                keyboardType="numbers-and-punctuation"
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }, incFieldErrors.event && styles.inputError]}
              />
            </View>
          </View>
          {incFieldErrors.event && <Text style={styles.fieldErrorText}>{incFieldErrors.event}</Text>}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Persona que registra</Text>
          <Text style={[styles.metaText, { color: colors.textPrimary, marginBottom: 12 }]}>{user?.email || user?.id || 'Sesión no disponible'}</Text>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Severidad *</Text>
          <View style={styles.severityRow}>
            {(['critical', 'high', 'medium', 'low'] as const).map(s => { 
              const cfg = severityConfig[s]; 
              return (
                <TouchableOpacity 
                  key={s} 
                  style={[
                    styles.severityOption, 
                    { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                    incSeverity === s && { backgroundColor: cfg.bg, borderColor: cfg.color }
                  ]} 
                  activeOpacity={0.7} 
                  onPress={() => setIncSeverity(s)}
                >
                  <Feather name={cfg.icon} size={13} color={incSeverity === s ? cfg.color : colors.textTertiary} />
                  <Text style={[styles.severityOptionText, { color: colors.textSecondary }, incSeverity === s && { color: cfg.color }]}>{cfg.label}</Text>
                </TouchableOpacity>
              ); 
            })}
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Equipos Afectados *</Text>
          {incFieldErrors.devices && <Text style={styles.fieldErrorText}>{incFieldErrors.devices}</Text>}
          <ScrollView style={{ maxHeight: 200, marginBottom: 12 }}>
            {groupedHierarchy.map(({ building: bld, categories, totalDevices }) => (
              <View key={bld.id}>
                <TouchableOpacity 
                  style={[styles.buildingHeader, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]} 
                  activeOpacity={0.7} 
                  onPress={() => setExpandedBuildingId(expandedBuildingId === bld.id ? null : bld.id)}
                >
                  <Feather name={expandedBuildingId === bld.id ? 'chevron-down' : 'chevron-right'} size={13} color={colors.textPrimary} />
                  <Text style={[styles.buildingName, { color: colors.textPrimary }]}>{bld.name}</Text>
                  <Text style={[styles.buildingCount, { backgroundColor: colors.inputBg, color: colors.textSecondary }]}>{totalDevices}</Text>
                </TouchableOpacity>
                {expandedBuildingId === bld.id && Object.entries(categories).map(([cat, devs]) => (
                  <View key={cat} style={styles.categoryGroup}>
                    <View style={styles.categoryHeader}><Feather name={getDeviceIcon(cat)} size={11} color="#0A84FF" /><Text style={[styles.categoryName, { color: colors.textSecondary }]}>{cat}</Text></View>
                    {devs.map(dev => { 
                      const isChecked = selectedDeviceIds.includes(dev.id); 
                      return (
                        <TouchableOpacity 
                          key={dev.id} 
                          style={[
                            styles.deviceOption, 
                            { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                            isChecked && styles.deviceOptionActive
                          ]} 
                          activeOpacity={0.7} 
                          onPress={() => toggleDevice(dev.id)}
                        >
                          <Feather name={isChecked ? 'check-square' : 'square'} size={13} color={isChecked ? '#0A84FF' : colors.textTertiary} />
                          <View style={styles.deviceOptionText}><Text style={[styles.deviceOptionName, { color: colors.textPrimary }]}>{dev.name}</Text><Text style={[styles.deviceOptionIp, { color: colors.textTertiary }]}>{dev.ipv4_address}</Text></View>
                        </TouchableOpacity>
                      ); 
                    })}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Descripción del Incidente *</Text>
          <TextInput 
            placeholder="Describe el incidente en detalle..." 
            placeholderTextColor={colors.placeholder} 
            multiline 
            numberOfLines={3} 
            style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }, incFieldErrors.desc && styles.inputError]} 
            value={incDesc} 
            onChangeText={(val) => {
              setIncDesc(val);
              if (incFieldErrors.desc) setIncFieldErrors(prev => ({ ...prev, desc: '' }));
            }} 
          />
          {incFieldErrors.desc && <Text style={styles.fieldErrorText}>{incFieldErrors.desc}</Text>}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Acción realizada o seguimiento inicial</Text>
          <TextInput
            placeholder="Opcional: anota las acciones que ya realizaste..."
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={2}
            style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
            value={incInitialAction}
            onChangeText={setIncInitialAction}
          />

          <TouchableOpacity 
            style={[styles.submitIncident, isSubmitting && { opacity: 0.6 }]} 
            disabled={isSubmitting} 
            activeOpacity={0.8} 
            onPress={handleSaveIncident}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitIncidentText}>Enviar Reporte de Incidente</Text>
            )}
          </TouchableOpacity>
        </GlassModal>

        <GlassModal
          visible={actionIncident !== null}
          onClose={() => { if (!isSavingAction) setActionIncident(null); }}
          title={actionKind === 'resolution' ? 'Resolver incidente' : 'Agregar seguimiento'}
          subtitle={actionIncident?.title}
        >
          {actionError !== '' && <Text style={styles.fieldErrorText}>{actionError}</Text>}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            {actionKind === 'resolution' ? 'Solución aplicada *' : 'Acción realizada o seguimiento *'}
          </Text>
          <TextInput
            placeholder={actionKind === 'resolution' ? 'Describe cómo se solucionó el incidente...' : 'Describe el avance o la acción realizada...'}
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
            style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
            value={actionText}
            onChangeText={setActionText}
          />
          <TouchableOpacity
            style={[styles.submitIncident, isSavingAction && { opacity: 0.6 }]}
            disabled={isSavingAction}
            activeOpacity={0.8}
            onPress={handleSaveAction}
          >
            {isSavingAction ? <ActivityIndicator size="small" color="#FFFFFF" /> :
              <Text style={styles.submitIncidentText}>{actionKind === 'resolution' ? 'Guardar solución y resolver' : 'Guardar seguimiento'}</Text>}
          </TouchableOpacity>
        </GlassModal>

        {/* Modal Agendar Mantenimiento */}
        <GlassModal visible={showMaintenanceModal} onClose={() => setShowMaintenanceModal(false)} title="Agendar Mantenimiento" subtitle="Programa una tarea de mantenimiento preventivo o correctivo">
          {mntError !== '' && (
            <View style={styles.modalErrorContainer}>
              <Feather name="alert-circle" size={15} color="#FF453A" />
              <Text style={styles.modalErrorText}>{mntError}</Text>
            </View>
          )}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Título *</Text>
          <TextInput 
            placeholder="ej. Actualización de firmware IOS-XE" 
            placeholderTextColor={colors.placeholder} 
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }, mntFieldErrors.title && styles.inputError]} 
            value={mntTitle} 
            onChangeText={(val) => {
              setMntTitle(val);
              if (mntFieldErrors.title) setMntFieldErrors(prev => ({ ...prev, title: '' }));
            }} 
          />
          {mntFieldErrors.title && <Text style={styles.fieldErrorText}>{mntFieldErrors.title}</Text>}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tipo de Mantenimiento *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {Object.entries(maintTypeConfig).map(([key, cfg]) => (
              <TouchableOpacity 
                key={key} 
                style={[
                  styles.typeOption, 
                  { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                  mntType === key && { backgroundColor: `${cfg.color}20`, borderColor: cfg.color }
                ]} 
                activeOpacity={0.7} 
                onPress={() => setMntType(key as any)}
              >
                <Feather name={cfg.icon} size={12} color={mntType === key ? cfg.color : colors.textTertiary} />
                <Text style={[styles.typeOptionText, { color: colors.textSecondary }, mntType === key && { color: cfg.color }]}>{cfg.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.formRow, isSmallMobile && { flexDirection: 'column', gap: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Equipo(s) Afectados *</Text>
              <TextInput 
                placeholder="ej. Switch Core" 
                placeholderTextColor={colors.placeholder} 
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }, mntFieldErrors.device && styles.inputError]} 
                value={mntDevice} 
                onChangeText={(val) => {
                  setMntDevice(val);
                  if (mntFieldErrors.device) setMntFieldErrors(prev => ({ ...prev, device: '' }));
                }} 
              />
              {mntFieldErrors.device && <Text style={styles.fieldErrorText}>{mntFieldErrors.device}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Ubicación</Text>
              <TextInput placeholder="ej. Edificio A" placeholderTextColor={colors.placeholder} style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={mntLocation} onChangeText={setMntLocation} />
            </View>
          </View>

          <View style={[styles.formRow, isSmallMobile && { flexDirection: 'column', gap: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Fecha Programada (YYYY-MM-DD) *</Text>
              <TextInput 
                placeholder="YYYY-MM-DD" 
                placeholderTextColor={colors.placeholder} 
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }, mntFieldErrors.date && styles.inputError]} 
                value={mntDate} 
                onChangeText={(val) => {
                  setMntDate(val);
                  if (mntFieldErrors.date) setMntFieldErrors(prev => ({ ...prev, date: '' }));
                }} 
              />
              {mntFieldErrors.date && <Text style={styles.fieldErrorText}>{mntFieldErrors.date}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Ventana Horaria</Text>
              <TextInput placeholder="02:00 - 05:00 hrs" placeholderTextColor={colors.placeholder} style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={mntWindow} onChangeText={setMntWindow} />
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Técnico Responsable</Text>
          <TextInput placeholder="Nombre del técnico o equipo" placeholderTextColor={colors.placeholder} style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={mntTech} onChangeText={setMntTech} />
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notas Adicionales</Text>
          <TextInput placeholder="Observaciones..." placeholderTextColor={colors.placeholder} multiline numberOfLines={2} style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={mntNotes} onChangeText={setMntNotes} />
          <TouchableOpacity 
            style={[styles.submitMaint, isSubmittingMaint && { opacity: 0.6 }]} 
            disabled={isSubmittingMaint} 
            activeOpacity={0.8} 
            onPress={handleSaveMaintenance}
          >
            {isSubmittingMaint ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitMaintText}>Programar Mantenimiento</Text>
            )}
          </TouchableOpacity>
        </GlassModal>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 45, paddingBottom: 110 },
  innerWrapper: { maxWidth: 1200, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 },
  headerBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#FF453A', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#FFFFFF', letterSpacing: 0.3 },
  headerSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255, 255, 255, 0.45)', marginTop: 2 },
  headerButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  reportButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11, backgroundColor: 'rgba(255, 69, 58, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.3)' },
  reportButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: '#FF453A' },
  scheduleButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11, backgroundColor: 'rgba(10, 132, 255, 0.12)', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.3)' },
  scheduleButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: '#0A84FF' },
  filtersRow: { gap: 8, marginBottom: 18 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 15, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  filterChipActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  filterChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)' },
  filterChipTextActive: { color: '#000000' },
  desktopSplit: { flexDirection: 'column' },
  desktopSplitActive: { flexDirection: 'row', gap: 20 },
  columnWrapper: { width: '100%' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#FFFFFF' },
  sectionCount: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' },
  cardList: { gap: 12 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic', paddingVertical: 10 },
  incidentCard: { padding: 16, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  incTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sevBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  sevText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, letterSpacing: 0.5 },
  statBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, borderWidth: 1 },
  statDot: { width: 5, height: 5, borderRadius: 2.5 },
  statText: { fontFamily: 'Poppins_600SemiBold', fontSize: 9.5 },
  incTitle: { fontFamily: 'Poppins_700Bold', fontSize: 14.5, color: '#FFFFFF', marginBottom: 3 },
  incDesc: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 17, marginBottom: 8 },
  incMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10, paddingTop: 8, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: 'rgba(255, 255, 255, 0.5)' },
  actionHistory: { gap: 8, borderTopWidth: 1, paddingTop: 10, marginBottom: 10 },
  actionHistoryTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, marginBottom: 2 },
  incActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, backgroundColor: 'rgba(48, 209, 88, 0.12)', borderWidth: 1, borderColor: 'rgba(48, 209, 88, 0.3)' },
  resolveBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#30D158' },
  deleteBtn: { padding: 5 },
  maintCard: { padding: 16, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  maintTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  maintTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  maintTypeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5 },
  maintDate: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)' },
  maintTitle: { fontFamily: 'Poppins_700Bold', fontSize: 14.5, color: '#FFFFFF', marginBottom: 6 },
  maintMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 8, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  maintNotes: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  inputLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 5 },
  input: { fontFamily: 'Poppins_400Regular', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 13, padding: 12, color: '#FFFFFF', fontSize: 13.5, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) as any },
  inputError: { borderColor: '#FF453A', backgroundColor: 'rgba(255, 69, 58, 0.06)' },
  fieldErrorText: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: '#FF453A', marginTop: -8, marginBottom: 10, marginLeft: 4 },
  modalErrorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 69, 58, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.3)', borderRadius: 11, padding: 10, marginBottom: 14, gap: 8 },
  modalErrorText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#FF453A', flex: 1 },
  formRow: { flexDirection: 'row', gap: 10 },
  textArea: { height: 55, textAlignVertical: 'top' },
  severityRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  severityOption: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  severityOptionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: 'rgba(255, 255, 255, 0.5)' },
  typeOption: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', marginRight: 6 },
  typeOptionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: 'rgba(255, 255, 255, 0.5)' },
  buildingHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 9, backgroundColor: 'rgba(255, 255, 255, 0.04)', marginBottom: 3 },
  buildingName: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: '#FFFFFF', flex: 1 },
  buildingCount: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: 'rgba(255, 255, 255, 0.4)' },
  categoryGroup: { marginLeft: 14, marginBottom: 4 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3 },
  categoryName: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: 'rgba(255, 255, 255, 0.5)' },
  deviceOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 7, borderRadius: 7, marginBottom: 2 },
  deviceOptionActive: { backgroundColor: 'rgba(10, 132, 255, 0.08)' },
  deviceOptionText: { flex: 1 },
  deviceOptionName: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: '#FFFFFF' },
  deviceOptionIp: { fontFamily: 'Poppins_400Regular', fontSize: 9.5, color: 'rgba(255, 255, 255, 0.4)' },
  submitIncident: { backgroundColor: '#FF453A', paddingVertical: 14, borderRadius: 13, alignItems: 'center', marginTop: 6 },
  submitIncidentText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: '#FFFFFF' },
  submitMaint: { backgroundColor: '#0A84FF', paddingVertical: 14, borderRadius: 13, alignItems: 'center', marginTop: 6 },
  submitMaintText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: '#FFFFFF' },
});
