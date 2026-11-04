import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, type ThemeColors } from '../../contexts/ThemeContext';
import * as api from '../../services/api';
import { AuditLogRecord, Device, UserAccessRecord } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { REPORT_AREAS, ReportArea } from '../../services/reports';
import { generateAndShareReport } from '../../services/reportPdf';
import { isAdministrator } from '../../utils/permissions';
import { confirmDestructiveAction } from '../../utils/destructiveConfirmation';

const SEARCH_FILTERS = ['Todo', 'Nombre', 'IPv4', 'MAC', 'Fabricante', 'Ubicación'];
const POPULAR_QUERIES = ['Cisco', '10.0.10.', 'UniFi', 'MikroTik', 'Rack 01', 'Apple', 'Fortinet'];
type AdminTab = 'Usuarios' | 'Bitácora' | 'Documentos';

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function auditTableLabel(tableName: string) {
  const labels: Record<string, string> = {
    networks: 'Redes',
    subnets: 'Subredes',
    buildings: 'Edificios',
    departments: 'Departamentos',
    devices: 'Dispositivos',
    incidents: 'Incidentes',
    maintenances: 'Mantenimientos',
    device_configs: 'Configuraciones',
    switch_ports: 'Puertos',
    app_user_roles: 'Roles de cuenta',
  };
  return labels[tableName] || tableName;
}

function auditOperationLabel(operation: AuditLogRecord['operation']) {
  if (operation === 'INSERT') return 'Registro creado';
  if (operation === 'UPDATE') return 'Registro actualizado';
  return 'Registro eliminado';
}

function auditChangeSummary(entry: AuditLogRecord) {
  const before = entry.old_data || {};
  const after = entry.new_data || {};
  const changedFields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(key => !['id', 'created_at', 'updated_at'].includes(key))
    .filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map(key => key.replace(/_/g, ' '));

  if (entry.operation === 'INSERT') return `Campos registrados: ${changedFields.slice(0, 5).join(', ') || 'sin detalle'}`;
  if (entry.operation === 'DELETE') return `Campos previos: ${changedFields.slice(0, 5).join(', ') || 'sin detalle'}`;
  return `Campos modificados: ${changedFields.slice(0, 5).join(', ') || 'sin cambios detectados'}`;
}

export default function SearchScreen({ documentsOnly = false }: { documentsOnly?: boolean }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { user } = useAuth();
  const canManageAccess = isAdministrator(user);
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const isSmallMobile = width < 380;
  const isDesktop = width >= 1024;
  const cardWidth = isDesktop ? '31.8%' : isTablet ? '48.5%' : '100%';

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todo');
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('Usuarios');
  const [adminSearch, setAdminSearch] = useState('');
  const [managedAccounts, setManagedAccounts] = useState<UserAccessRecord[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState('');
  const [accountAction, setAccountAction] = useState<{ id: string; type: 'access' | 'role' } | null>(null);
  const [accountReloadKey, setAccountReloadKey] = useState(0);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditReloadKey, setAuditReloadKey] = useState(0);
  const [documentFrom, setDocumentFrom] = useState(todayISO);
  const [documentTo, setDocumentTo] = useState(todayISO);
  const [generatingDocument, setGeneratingDocument] = useState<ReportArea | null>(null);
  const [documentFeedback, setDocumentFeedback] = useState('');
  const [documentFeedbackIsError, setDocumentFeedbackIsError] = useState(false);

  const loadDevices = useCallback(async (isSilent = false) => {
    if (documentsOnly) return;
    try {
      if (!isSilent && allDevices.length === 0) setLoading(true);
      const data = await api.fetchDevices(isSilent);
      setAllDevices(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [allDevices.length, documentsOnly]);

  useFocusEffect(useCallback(() => {
    if (documentsOnly) return undefined;
    loadDevices(true);
    return undefined;
  }, [documentsOnly, loadDevices]));

  const selectedAdminTab: AdminTab = documentsOnly ? 'Documentos' : activeAdminTab;
  const visibleAdminTabs: readonly AdminTab[] = ['Usuarios', 'Bitácora', 'Documentos'];

  useFocusEffect(useCallback(() => {
    if (!canManageAccess || selectedAdminTab !== 'Usuarios') return undefined;
    let isActive = true;
    setAccountsLoading(true);
    setAccountsError('');
    api.fetchManagedAccounts().then(records => {
      if (isActive) setManagedAccounts(records);
    }).catch(error => {
      console.error('No se pudieron cargar las cuentas de InsForge:', error);
      if (isActive) setAccountsError('No se pudieron cargar las cuentas. Confirma que la migración de administración de cuentas esté aplicada y vuelve a intentar.');
    }).finally(() => {
      if (isActive) setAccountsLoading(false);
    });
    return () => { isActive = false; };
  }, [canManageAccess, selectedAdminTab, accountReloadKey]));

  useFocusEffect(useCallback(() => {
    if (!canManageAccess || selectedAdminTab !== 'Bitácora') return undefined;
    let isActive = true;
    setAuditLoading(true);
    setAuditError('');
    api.fetchAuditLogs().then(records => {
      if (isActive) setAuditLogs(records);
    }).catch(error => {
      console.error('No se pudo cargar el historial de auditoría:', error);
      if (isActive) setAuditError('No se pudo cargar el historial. Confirma que la migración de auditoría esté aplicada y vuelve a intentar.');
    }).finally(() => {
      if (isActive) setAuditLoading(false);
    });
    return () => { isActive = false; };
  }, [canManageAccess, selectedAdminTab, auditReloadKey]));

  const filteredResults = allDevices.filter((dev) => {
    if (!query.trim()) return false;
    const q = query.toLowerCase().trim();
    if (activeFilter === 'Nombre') return dev.name.toLowerCase().includes(q);
    if (activeFilter === 'IPv4') return dev.ipv4_address.toLowerCase().includes(q);
    if (activeFilter === 'MAC') return dev.mac_address.toLowerCase().includes(q);
    if (activeFilter === 'Fabricante') return dev.manufacturer.toLowerCase().includes(q);
    if (activeFilter === 'Ubicación') return dev.location.toLowerCase().includes(q);
    return (
      dev.name.toLowerCase().includes(q) || dev.ipv4_address.toLowerCase().includes(q) ||
      dev.mac_address.toLowerCase().includes(q) || dev.manufacturer.toLowerCase().includes(q) ||
      dev.location.toLowerCase().includes(q) || (dev.subnet_name && dev.subnet_name.toLowerCase().includes(q))
    );
  });

  const filteredAccounts = useMemo(() => {
    const q = adminSearch.trim().toLowerCase();
    return managedAccounts.filter(account => (
      !q || account.email.toLowerCase().includes(q) || account.role.toLowerCase().includes(q)
    ));
  }, [managedAccounts, adminSearch]);
  const filteredDocuments = useMemo(() => {
    const q = adminSearch.trim().toLowerCase();
    return REPORT_AREAS.filter(report => !q || report.title.toLowerCase().includes(q));
  }, [adminSearch]);
  const filteredAuditLogs = useMemo(() => {
    const q = adminSearch.trim().toLowerCase();
    return auditLogs.filter(entry => !q || [
      entry.actor_email || '',
      entry.actor_role || '',
      entry.table_name,
      entry.record_id,
      entry.operation,
    ].join(' ').toLowerCase().includes(q));
  }, [auditLogs, adminSearch]);

  const handleAccountAccessChange = async (account: UserAccessRecord) => {
    const nextActive = !account.active;
    if (!nextActive && !await confirmDestructiveAction(
      'Desactivar acceso',
      `¿Quieres bloquear el acceso de ${account.email}? La sesión dejará de acceder a los datos protegidos de la aplicación.`,
      'Desactivar',
    )) return;

    setAccountAction({ id: account.id, type: 'access' });
    setAccountsError('');
    try {
      await api.setManagedAccountActive(account.id, nextActive);
      setManagedAccounts(current => current.map(item => (
        item.id === account.id ? { ...item, active: nextActive } : item
      )));
    } catch (error) {
      console.error('No se pudo cambiar el acceso de la cuenta:', error);
      setAccountsError(error instanceof Error ? error.message : 'No se pudo cambiar el acceso de la cuenta.');
    } finally {
      setAccountAction(null);
    }
  };

  const handleAccountRoleChange = async (account: UserAccessRecord) => {
    if (account.id === user?.id) return;

    const nextRole: UserAccessRecord['role'] = account.role === 'Administrador'
      ? 'Técnico de red'
      : 'Administrador';
    const actionLabel = nextRole === 'Administrador' ? 'Hacer administrador' : 'Devolver a técnico';
    if (!await confirmDestructiveAction(
      'Cambiar rol de cuenta',
      `¿Quieres cambiar el rol de ${account.email} a ${nextRole}?`,
      actionLabel,
    )) return;

    setAccountAction({ id: account.id, type: 'role' });
    setAccountsError('');
    try {
      await api.setManagedAccountRole(account.id, nextRole);
      setManagedAccounts(current => current.map(item => (
        item.id === account.id ? { ...item, role: nextRole } : item
      )));
    } catch (error) {
      console.error('No se pudo cambiar el rol de la cuenta:', error);
      setAccountsError(error instanceof Error ? error.message : 'No se pudo cambiar el rol de la cuenta.');
    } finally {
      setAccountAction(null);
    }
  };

  const generateDocument = async (area: ReportArea) => {
    setDocumentFeedback('');
    setDocumentFeedbackIsError(false);
    setGeneratingDocument(area);
    try {
      const createdBy = user?.profile?.name?.trim() || user?.email || 'Usuario';
      await generateAndShareReport({
        area,
        from: documentFrom,
        to: documentTo,
        createdBy,
      });
      setDocumentFeedback(Platform.OS === 'web'
        ? 'Se abrió la impresión. Selecciona “Guardar como PDF”.'
        : 'El documento está listo para guardar o compartir.');
    } catch (error) {
      console.error('No se pudo generar el documento desde búsqueda:', error);
      setDocumentFeedback(error instanceof Error ? error.message : 'No se pudo generar el PDF.');
      setDocumentFeedbackIsError(true);
    } finally {
      setGeneratingDocument(null);
    }
  };

  if (!documentsOnly && loading && allDevices.length === 0) {
    return (<LinearGradient colors={colors.gradient} style={styles.container}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={isDark ? '#FF9F0A' : '#915400'} /></View></LinearGradient>);
  }

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <ScrollView contentContainerStyle={[
        styles.scrollContent,
        documentsOnly && styles.documentsOnlyScrollContent,
        { paddingHorizontal: isDesktop ? '6%' : isTablet ? '4%' : 16 },
      ]} showsVerticalScrollIndicator={false}>
        <View style={styles.innerWrapper}>
          {!documentsOnly && (
            <>
          <View style={styles.header}>
            <Text style={[styles.headerBadge, !isDark && { color: '#915400' }]}>BÚSQUEDA GLOBAL</Text>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }, isSmallMobile && { fontSize: 22 }]}>Buscador de Red</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Localiza equipos por IP, MAC, nombre o ubicación ({allDevices.length} equipos en BD)</Text>
          </View>
          <BlurView intensity={colors.blurIntensity} tint={colors.blurTint} style={[styles.searchBarWrapper, { backgroundColor: colors.searchBg, borderColor: colors.searchBorder }]}>
            <Feather name="search" size={18} color={colors.textTertiary} style={styles.searchIcon} />
            <TextInput placeholder="Buscar dispositivo, IP, MAC o rack..." placeholderTextColor={colors.placeholder} style={[styles.searchInput, { color: colors.textPrimary }]} value={query} onChangeText={setQuery} autoCapitalize="none" />
            {query.length > 0 && (<TouchableOpacity style={[styles.clearBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]} onPress={() => setQuery('')} activeOpacity={0.7}><Feather name="x" size={15} color={colors.textSecondary} /></TouchableOpacity>)}
          </BlurView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {SEARCH_FILTERS.map((filter) => { 
              const isActive = activeFilter === filter; 
              return (
                <TouchableOpacity 
                  key={filter} 
                  style={[
                    styles.filterChip, 
                    { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                    isActive && { backgroundColor: colors.chipActiveBg, borderColor: colors.chipActiveBg }
                  ]} 
                  activeOpacity={0.7} 
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text style={[
                    styles.filterChipText, 
                    { color: colors.textSecondary },
                    isActive && { color: colors.chipActiveText }
                  ]}>{filter}</Text>
                </TouchableOpacity>
              ); 
            })}
          </ScrollView>
          {!query.trim() && (<View style={styles.suggestionsContainer}>
            <Text style={[styles.suggestionTitle, { color: colors.textTertiary }]}>BÚSQUEDAS FRECUENTES</Text>
            <View style={styles.suggestionChips}>
              {POPULAR_QUERIES.map((item) => (
                <TouchableOpacity 
                  key={item} 
                  style={[styles.suggestionChip, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]} 
                  activeOpacity={0.7} 
                  onPress={() => setQuery(item)}
                >
                  <Feather name="clock" size={12} color={colors.textTertiary} />
                  <Text style={[styles.suggestionChipText, { color: colors.textSecondary }]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <BlurView intensity={colors.blurIntensity} tint={colors.blurTint} style={[styles.hintCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}><Feather name="info" size={18} color="#0A84FF" style={{ marginRight: 10 }} /><View style={{ flex: 1 }}><Text style={[styles.hintTitle, { color: colors.textPrimary }]}>Búsqueda inteligente</Text><Text style={[styles.hintText, { color: colors.textSecondary }]}>Los datos provienen directamente de InsForge. Puedes buscar por cualquier campo del dispositivo.</Text></View></BlurView>
          </View>)}
          {query.trim().length > 0 && (<View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}><Text style={[styles.resultsCount, { color: colors.textSecondary }]}>{filteredResults.length} {filteredResults.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}</Text></View>
            {filteredResults.length === 0 ? (<BlurView intensity={colors.blurIntensity} tint={colors.blurTint} style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}><Feather name="alert-circle" size={32} color={colors.textTertiary} /><Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sin coincidencias</Text><Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>No se encontró ningún equipo que coincida con "{query}".</Text></BlurView>
            ) : (<View style={styles.resultsList}>{filteredResults.map((dev) => (
              <BlurView key={dev.id} intensity={colors.blurIntensity} tint={colors.blurTint} style={[styles.resultCard, { width: cardWidth, backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <View style={styles.resultTop}><View style={styles.deviceIconBadge}><Feather name="cpu" size={16} color="#0A84FF" /></View><View style={{ flex: 1 }}><Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={1}>{dev.name}</Text><Text style={[styles.resultBrand, { color: colors.textSecondary }]} numberOfLines={1}>{dev.manufacturer} • {dev.location}</Text></View></View>
                <View style={styles.resultSpecs}><View style={[styles.specBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' }]}><Text style={[styles.specKey, { color: colors.textTertiary }]}>IPv4</Text><Text style={styles.specIp} numberOfLines={1}>{dev.ipv4_address}</Text></View><View style={[styles.specBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' }]}><Text style={[styles.specKey, { color: colors.textTertiary }]}>MAC</Text><Text style={[styles.specMac, { color: colors.textPrimary }]} numberOfLines={1}>{dev.mac_address}</Text></View></View>
                <View style={[styles.resultSubnet, { borderColor: colors.divider }]}><Feather name="layers" size={11} color="#BF5AF2" /><Text style={styles.resultSubnetText} numberOfLines={1}>{dev.subnet_name || 'Sin VLAN asignada'}</Text></View>
              </BlurView>))}</View>)}
          </View>)}
            </>
          )}

          {(documentsOnly || canManageAccess) && <BlurView intensity={colors.blurIntensity} tint={colors.blurTint} style={[styles.adminPanel, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.adminHeader}>
              <Text style={[styles.adminTitle, { color: colors.textPrimary }]}>
                {documentsOnly ? 'Reportes y documentación' : 'Administración de usuarios y acceso'}
              </Text>
              {!documentsOnly && (
                <Text style={[styles.adminMeta, !isDark && { color: '#915400' }]}>{managedAccounts.length} cuentas</Text>
              )}
            </View>

            {!documentsOnly && <View style={styles.adminTabsRow}>
              {visibleAdminTabs.map(tab => (
                <TouchableOpacity
                  key={tab}
                  activeOpacity={0.8}
                  onPress={() => setActiveAdminTab(tab)}
                  style={[
                    styles.adminTab, 
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.cardBorder },
                    selectedAdminTab === tab && { backgroundColor: colors.chipActiveBg, borderColor: colors.chipActiveBg }
                  ]}
                >
                  <Text style={[
                    styles.adminTabText, 
                    { color: colors.textSecondary },
                    selectedAdminTab === tab && { color: colors.chipActiveText }
                  ]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </View>}

            <View style={[styles.adminSearchRow, { backgroundColor: colors.searchBg, borderColor: colors.searchBorder }]}>
              <Feather name="search" size={15} color={colors.textTertiary} />
              <TextInput
                placeholder={selectedAdminTab === 'Documentos'
                  ? 'Buscar tipo de documento...'
                  : selectedAdminTab === 'Bitácora'
                    ? 'Buscar por usuario, módulo, acción o registro...'
                    : 'Buscar por correo o rol...'}
                placeholderTextColor={colors.placeholder}
                style={[styles.adminSearchInput, { color: colors.textPrimary }]}
                value={adminSearch}
                onChangeText={setAdminSearch}
              />
            </View>

            {selectedAdminTab === 'Usuarios' && (
              <View style={styles.adminList}>
                <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
                  Activa o desactiva el acceso y cambia el rol entre Técnico de red y Administrador.
                </Text>
                {accountsLoading && (
                  <View style={styles.auditLoading}>
                    <ActivityIndicator size="small" color="#0A84FF" />
                    <Text style={[styles.userMeta, { color: colors.textSecondary }]}>Cargando cuentas de InsForge...</Text>
                  </View>
                )}
                {accountsError !== '' && (
                  <View>
                    <Text style={[styles.emptyState, { color: '#FF453A' }]}>{accountsError}</Text>
                    <TouchableOpacity
                      style={[styles.primaryAction, { backgroundColor: colors.buttonBg, alignSelf: 'flex-start', marginTop: 8 }]}
                      onPress={() => setAccountReloadKey(value => value + 1)}>
                      <Text style={[styles.primaryActionText, { color: colors.buttonText }]}>Reintentar</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {!accountsLoading && !accountsError && filteredAccounts.map(account => (
                  <View key={account.id} style={[styles.userCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', borderColor: colors.cardBorder }]}>
                    <View style={styles.userCardHeader}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>{account.email}</Text>
                        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{account.role}</Text>
                      </View>
                      <View style={[styles.statusPill, account.active ? styles.statusActive : styles.statusRejected]}>
                        <Text style={styles.statusText}>{account.active ? 'Activo' : 'Desactivado'}</Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        disabled={accountAction !== null || (account.id === user?.id && account.active)}
                        style={[
                          styles.primaryAction,
                          { backgroundColor: account.active ? 'rgba(255,69,58,0.12)' : colors.buttonBg, opacity: accountAction && accountAction.id !== account.id ? 0.55 : 1 },
                        ]}
                        onPress={() => void handleAccountAccessChange(account)}>
                        {accountAction?.id === account.id && accountAction.type === 'access'
                          ? <ActivityIndicator size="small" color={account.active ? '#FF453A' : colors.buttonText} />
                          : <Text style={[styles.primaryActionText, { color: account.active ? '#FF453A' : colors.buttonText }]}>
                            {account.id === user?.id && account.active ? 'Tu propia cuenta' : account.active ? 'Desactivar acceso' : 'Activar acceso'}
                          </Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        disabled={accountAction !== null || account.id === user?.id}
                        style={[
                          styles.primaryAction,
                          { backgroundColor: 'rgba(10,132,255,0.12)', opacity: accountAction && accountAction.id !== account.id ? 0.55 : 1 },
                        ]}
                        onPress={() => void handleAccountRoleChange(account)}>
                        {accountAction?.id === account.id && accountAction.type === 'role'
                          ? <ActivityIndicator size="small" color="#0A84FF" />
                          : <Text style={[styles.primaryActionText, { color: '#0A84FF' }]}>
                            {account.id === user?.id
                              ? 'No puedes cambiar tu rol'
                              : account.role === 'Administrador' ? 'Devolver a técnico' : 'Hacer administrador'}
                          </Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {!accountsLoading && !accountsError && filteredAccounts.length === 0 && (
                  <Text style={[styles.emptyState, { color: colors.textTertiary }]}>
                    {managedAccounts.length === 0 ? 'No hay cuentas asignadas en la tabla de roles.' : 'No hay cuentas que coincidan con la búsqueda.'}
                  </Text>
                )}
              </View>
            )}

            {selectedAdminTab === 'Bitácora' && (
              <View style={styles.adminList}>
                {auditLoading && (
                  <View style={styles.auditLoading}>
                    <ActivityIndicator size="small" color="#0A84FF" />
                    <Text style={[styles.userMeta, { color: colors.textSecondary }]}>Cargando historial protegido...</Text>
                  </View>
                )}
                {auditError ? (
                  <View>
                    <Text style={[styles.userDetail, { color: '#FF453A' }]}>{auditError}</Text>
                    <TouchableOpacity
                      style={[styles.primaryAction, { backgroundColor: colors.buttonBg, alignSelf: 'flex-start', marginTop: 8 }]}
                      onPress={() => setAuditReloadKey(value => value + 1)}>
                      <Text style={[styles.primaryActionText, { color: colors.buttonText }]}>Reintentar</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {!auditLoading && !auditError && filteredAuditLogs.map(entry => (
                  <View key={entry.id} style={[styles.auditCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', borderColor: colors.cardBorder }]}>
                    <View style={styles.userCardHeader}>
                      <View>
                        <Text style={[styles.userName, { color: colors.textPrimary }]}>{entry.actor_email || entry.actor_id || 'Acción de sistema'}</Text>
                        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{auditTableLabel(entry.table_name)}</Text>
                      </View>
                      <View style={[
                        styles.statusPill,
                        entry.operation === 'DELETE' ? styles.statusRejected : entry.operation === 'UPDATE' ? styles.statusPending : styles.statusActive,
                      ]}>
                        <Text style={styles.statusText}>{auditOperationLabel(entry.operation)}</Text>
                      </View>
                    </View>
                    <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
                      Rol: {entry.actor_role || 'No identificado'} · Registro: {entry.record_id}
                    </Text>
                    <Text style={[styles.userDetail, { color: colors.textSecondary }]}>{auditChangeSummary(entry)}</Text>
                    <Text style={[styles.userMeta, { color: colors.textTertiary }]}>
                      {new Date(entry.changed_at).toLocaleString('es-MX')}
                    </Text>
                  </View>
                ))}
                {!auditLoading && !auditError && filteredAuditLogs.length === 0 && (
                  <Text style={[styles.emptyState, { color: colors.textSecondary }]}>
                    {auditLogs.length ? 'No hay registros que coincidan con la búsqueda.' : 'Aún no hay cambios registrados.'}
                  </Text>
                )}
              </View>
            )}

            {selectedAdminTab === 'Documentos' && (
              <View style={styles.adminList}>
                <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
                  Elige el periodo y genera un documento con los datos actuales de InsForge.
                </Text>
                <View style={styles.documentDateRow}>
                  <TextInput
                    accessibilityLabel="Fecha inicial del documento"
                    value={documentFrom}
                    onChangeText={setDocumentFrom}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={colors.placeholder}
                    style={[styles.documentDateInput, { color: colors.textPrimary, backgroundColor: colors.searchBg, borderColor: colors.searchBorder }]}
                  />
                  <TextInput
                    accessibilityLabel="Fecha final del documento"
                    value={documentTo}
                    onChangeText={setDocumentTo}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={colors.placeholder}
                    style={[styles.documentDateInput, { color: colors.textPrimary, backgroundColor: colors.searchBg, borderColor: colors.searchBorder }]}
                  />
                </View>
                {documentFeedback ? (
                  <Text style={[styles.documentFeedback, { color: documentFeedbackIsError ? '#FF453A' : '#30D158' }]}>
                    {documentFeedback}
                  </Text>
                ) : null}
                {filteredDocuments.map((report) => (
                  <View key={report.id} style={[styles.docCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', borderColor: colors.cardBorder }]}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.userName, { color: colors.textPrimary }]}>{report.title}</Text>
                      <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
                        {documentFrom} a {documentTo} · datos actuales del sistema
                      </Text>
                    </View>
                    <TouchableOpacity
                      disabled={generatingDocument !== null}
                      style={[styles.primaryAction, { backgroundColor: colors.buttonBg, paddingHorizontal: 16, opacity: generatingDocument && generatingDocument !== report.id ? 0.55 : 1 }]}
                      onPress={() => void generateDocument(report.id)}
                    >
                      <Text style={[styles.primaryActionText, { color: colors.buttonText }]}>
                        {generatingDocument === report.id ? 'Generando...' : 'Generar PDF'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {filteredDocuments.length === 0 ? (
                  <Text style={[styles.emptyState, { color: colors.textSecondary }]}>No hay tipos de documento que coincidan.</Text>
                ) : null}
              </View>
            )}
          </BlurView>}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 45, paddingBottom: 110 },
  documentsOnlyScrollContent: { paddingTop: 18 },
  innerWrapper: { maxWidth: 1200, width: '100%', alignSelf: 'center' },
  header: { marginBottom: 18 },
  headerBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#FF9F0A', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 26, color: colors.textPrimary, letterSpacing: 0.3 },
  headerSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, marginBottom: 14 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14, color: colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' } }) as any },
  clearBtn: { padding: 5, backgroundColor: colors.chipBg, borderRadius: 10 },
  filterRow: { gap: 8, marginBottom: 20 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 15, backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.cardBorder },
  filterChipActive: { backgroundColor: colors.buttonBg, borderColor: colors.buttonBg },
  filterChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: colors.textSecondary },
  filterChipTextActive: { color: colors.buttonText },
  suggestionsContainer: { marginTop: 8 },
  suggestionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: colors.textSecondary, letterSpacing: 1, marginBottom: 10 },
  suggestionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.cardBorder },
  suggestionChipText: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: colors.textSecondary },
  hintCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.2)', backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  hintTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: colors.textPrimary, marginBottom: 2 },
  hintText: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: colors.textSecondary, lineHeight: 17 },
  resultsContainer: { marginTop: 4 },
  resultsHeader: { marginBottom: 12 },
  resultsCount: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: colors.textSecondary },
  emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 26, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, gap: 8 },
  emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: colors.textPrimary },
  emptySubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: colors.textTertiary, textAlign: 'center' },
  resultsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  resultCard: { padding: 14, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg },
  resultTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  deviceIconBadge: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(10, 132, 255, 0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  resultName: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: colors.textPrimary },
  resultBrand: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: colors.textTertiary },
  resultSpecs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  specBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.chipBg, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, gap: 5 },
  specKey: { fontFamily: 'Poppins_600SemiBold', fontSize: 9.5, color: colors.textSecondary },
  specIp: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#0A84FF', flex: 1 },
  specMac: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: colors.textPrimary, flex: 1 },
  resultSubnet: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 8, borderTopWidth: 1, borderColor: colors.cardBorder },
  resultSubnetText: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#BF5AF2' },
  adminPanel: { marginTop: 24, padding: 18, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  adminHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  adminTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: colors.textPrimary },
  adminMeta: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#FF9F0A' },
  adminTabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  adminTab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  adminTabActive: { backgroundColor: colors.buttonBg },
  adminTabText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  adminTabTextActive: { color: colors.buttonText },
  adminSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 12 },
  adminSearchInput: { flex: 1, color: colors.textPrimary, fontFamily: 'Poppins_400Regular', fontSize: 12 },
  adminList: { gap: 10 },
  userCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 12 },
  userCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  userName: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: colors.textPrimary },
  userEmail: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusPending: { backgroundColor: 'rgba(255,159,10,0.14)' },
  statusActive: { backgroundColor: 'rgba(48,209,88,0.14)' },
  statusRejected: { backgroundColor: 'rgba(255,69,58,0.14)' },
  statusText: { fontFamily: 'Poppins_600SemiBold', fontSize: 9.5, color: colors.textPrimary, textTransform: 'capitalize' },
  userMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  userDetail: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginTop: 8, lineHeight: 18 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  primaryAction: { flex: 1, backgroundColor: colors.buttonBg, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  primaryActionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: colors.buttonText },
  secondaryAction: { flex: 1, backgroundColor: 'rgba(255,69,58,0.12)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,69,58,0.3)' },
  secondaryActionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#FF453A' },
  auditCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 12 },
  auditLoading: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 },
  docCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 12 },
  documentDateRow: { flexDirection: 'row', gap: 8, marginTop: 5, marginBottom: 8 },
  documentDateInput: { flex: 1, minWidth: 0, height: 40, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, fontFamily: 'Poppins_400Regular', fontSize: 11 },
  documentFeedback: { fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 17 },
  emptyState: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.5)', paddingVertical: 12 },
});
