import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  useWindowDimensions, 
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getAccountRole } from '../../services/auth';
import ThemeToggle from '../../components/ThemeToggle';
import { fetchDashboardStats, fetchRecentActivities, fetchIncidents, fetchMaintenances, DashboardStats } from '../../services/api';
import { Incident, Maintenance, RecentActivity } from '../../types';

const LOGO_DARK = require('../../../assets/logobitacoraredes.png');
const LOGO_LIGHT = require('../../../assets/logobitacoraredesmodoclaro.png');

type ActionablePending = {
  id: string;
  title: string;
  detail: string;
  status: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  priority: number;
  date: number;
};

function getLocalDateKey(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getMaintenanceTimestamp(date: string) {
  const timestamp = new Date(`${date}T00:00:00`).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isSmallMobile = width < 380;
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;
  const navigation = useNavigation<any>();
  const { signOut, user, authMethod, authorizationError } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const appLogo = isDark ? LOGO_DARK : LOGO_LIGHT;
  const accountName = user?.profile?.name?.trim() || user?.email || 'Usuario';
  const accountRole = getAccountRole(user);
  const accountRoleLabel = accountRole || 'Rol no asignado';
  const authMethodLabel = authMethod === 'google'
    ? 'Google'
    : authMethod === 'apple'
      ? 'Apple'
      : authMethod === 'email'
        ? 'Correo y contraseña'
        : 'Acceso no identificado';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [openIncidents, setOpenIncidents] = useState<Incident[]>([]);
  const [pendingMaintenances, setPendingMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [dashStats, recentActs, incidents, maintenances] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentActivities(),
        fetchIncidents(),
        fetchMaintenances(),
      ]);
      setStats(dashStats);
      setActivities(recentActs);
      setOpenIncidents(incidents.filter(incident => incident.status !== 'resolved'));
      setPendingMaintenances(maintenances.filter(maintenance => maintenance.status !== 'completed'));
      setLoadError('');
    } catch (err) {
      console.error('Error cargando dashboard:', err);
      setLoadError('No se pudo cargar la información del inicio.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  const handleActivityPress = (actId: string) => {
    if (actId.startsWith('inc-') || actId.startsWith('mnt-')) {
      navigation.navigate('CentroControl', { screen: 'SeguimientoIncidentes' });
    } else if (actId.startsWith('cfg-')) {
      navigation.navigate('Configuraciones');
    } else if (actId.startsWith('dev-')) {
      navigation.navigate('Infraestructura', { screen: 'InventarioDispositivos' });
    }
  };

  const today = getLocalDateKey();
  const todayTimestamp = getMaintenanceTimestamp(today);
  const actionableItems: ActionablePending[] = [
    ...openIncidents.map(incident => ({
      id: `incident-${incident.id}`,
      title: incident.title,
      detail: incident.device_name || incident.location || 'Equipo o ubicación sin especificar',
      status: incident.status === 'in_progress' ? 'En progreso' : 'Abierto',
      icon: 'alert-triangle' as const,
      color: incident.severity === 'critical' ? '#FF453A' : incident.severity === 'high' ? '#FF9F0A' : '#FFD60A',
      priority: incident.severity === 'critical' ? 0 : incident.severity === 'high' ? 1 : 2,
      date: new Date(incident.event_at || incident.created_at).getTime() || 0,
    })),
    ...pendingMaintenances.map(maintenance => {
      const scheduledTimestamp = getMaintenanceTimestamp(maintenance.scheduled_date);
      const isOverdue = maintenance.status !== 'completed' && scheduledTimestamp < todayTimestamp;
      return {
        id: `maintenance-${maintenance.id}`,
        title: maintenance.title,
        detail: `${maintenance.device_name || 'Equipo sin especificar'} · ${maintenance.scheduled_date || 'Sin fecha'}`,
        status: isOverdue ? 'Atrasado' : maintenance.status === 'in_progress' ? 'En progreso' : 'Programado',
        icon: 'tool' as const,
        color: isOverdue ? '#FF453A' : '#0A84FF',
        priority: isOverdue ? 0 : maintenance.status === 'in_progress' ? 1 : 3,
        date: scheduledTimestamp,
      };
    }),
  ].sort((first, second) => first.priority - second.priority || first.date - second.date);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

  const gradientColors: [string, string] = isDark ? ['#050505', '#121212'] : ['#FFFFFF', '#FFFFFF'];
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const subtitleColor = isDark ? 'rgba(255, 255, 255, 0.45)' : '#475569';
  const cardBgColor = isDark ? 'rgba(0, 0, 0, 0.5)' : '#E2EAF2';
  const cardBorderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#9AAABD';
  const blurTint = isDark ? 'dark' : 'light';
  const blurIntensity = isDark ? 30 : 60;

  if (!stats) {
    return (
      <LinearGradient colors={gradientColors} style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {loadError ? (
            <>
              <Feather name="alert-circle" size={28} color="#FF9F0A" />
              <Text style={{ color: textColor, fontFamily: 'Poppins_600SemiBold', marginTop: 12, textAlign: 'center' }}>
                {loadError}
              </Text>
              <TouchableOpacity
                style={{ marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0A84FF' }}
                activeOpacity={0.8}
                onPress={() => void loadData(false)}>
                <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' }}>Reintentar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color="#0A84FF" />
              <Text style={{ color: subtitleColor, fontFamily: 'Poppins_400Regular', marginTop: 12 }}>
                Cargando datos...
              </Text>
            </>
          )}
        </View>
      </LinearGradient>
    );
  }

  const metricCardWidth = isDesktop ? '23.5%' : isSmallMobile ? '100%' : '48.5%';

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingHorizontal: isDesktop ? '6%' : isTablet ? '4%' : 16 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerWrapper}>
          {!!authorizationError && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,69,58,0.12)' : 'rgba(255,69,58,0.08)' }}>
              <Feather name="shield" size={17} color="#FF453A" />
              <Text style={{ flex: 1, color: textColor, fontFamily: 'Poppins_400Regular' }}>{authorizationError}</Text>
            </View>
          )}
          {!!loadError && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,159,10,0.12)' : 'rgba(255,159,10,0.10)' }}>
              <Text style={{ flex: 1, color: textColor, fontFamily: 'Poppins_400Regular' }}>
                {loadError} Se muestran los últimos datos disponibles.
              </Text>
              <TouchableOpacity activeOpacity={0.8} onPress={() => void loadData(false)}>
                <Text style={{ color: '#0A84FF', fontFamily: 'Poppins_600SemiBold' }}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerBrand}>
              <View style={[
                styles.logoContainer, 
                isSmallMobile && { width: 44, height: 44 },
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#D7E1EB',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#9AAABD'
                }
              ]}>
                <Image 
                  source={appLogo} 
                  style={styles.logoImage} 
                  resizeMode="contain"
                />
              </View>
              <View style={styles.headerTextContainer}>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusBadgeText}>SISTEMA EN LÍNEA</Text>
                </View>
                <Text style={[styles.headerTitle, isSmallMobile && { fontSize: 20, lineHeight: 24 }, { color: textColor }]}>
                  {accountName}
                </Text>
                <Text style={[styles.headerSubtitle, { color: subtitleColor }]} numberOfLines={1}>
                  {user?.email || 'Cuenta activa'}
                </Text>
                <Text style={[styles.headerSubtitle, styles.accountAccessSubtitle, { color: subtitleColor }]} numberOfLines={1}>
                  {accountRoleLabel} · Acceso con {authMethodLabel}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[
                  styles.searchHeaderButton,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#D7E1EB',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#9AAABD',
                  }
                ]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Buscar')}
              >
                <Feather name="search" size={18} color={textColor} />
              </TouchableOpacity>

              <ThemeToggle 
                style={[
                  styles.themeHeaderButton,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#D7E1EB',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#9AAABD',
                  }
                ]}
                size={17}
              />

              <TouchableOpacity 
                style={styles.logoutHeaderButton}
                activeOpacity={0.8}
                onPress={handleLogout}
              >
                <Feather name="log-out" size={15} color="#FF453A" />
                <Text style={styles.logoutButtonText}>Salir</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 📊 Grid de Métricas Principales */}
          <View style={styles.metricsGrid}>
            <BlurView 
              intensity={blurIntensity} 
              tint={blurTint} 
              style={[styles.metricCard, { width: metricCardWidth, backgroundColor: cardBgColor, borderColor: cardBorderColor }]}
            >
              <View style={styles.metricCardHeader}>
                <Text style={[styles.metricCardLabel, { color: subtitleColor }]}>Redes Base</Text>
                <View style={[styles.metricIconBadge, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                  <Feather name="wifi" size={16} color="#0A84FF" />
                </View>
              </View>
              <Text style={[styles.metricCardValue, { color: textColor }]}>{stats.totalNetworks}</Text>
              <TouchableOpacity 
                style={[
                  styles.metricAction,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#D2DDE8',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#9AAABD',
                  }
                ]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Infraestructura', { screen: 'RedesInternas' })}
              >
                <Text style={[styles.metricActionText, { color: textColor }]}>Ver redes</Text>
                <Feather name="chevron-right" size={13} color={textColor} />
              </TouchableOpacity>
            </BlurView>

            <BlurView 
              intensity={blurIntensity} 
              tint={blurTint} 
              style={[styles.metricCard, { width: metricCardWidth, backgroundColor: cardBgColor, borderColor: cardBorderColor }]}
            >
              <View style={styles.metricCardHeader}>
                <Text style={[styles.metricCardLabel, { color: subtitleColor }]}>Subredes VLAN</Text>
                <View style={[styles.metricIconBadge, { backgroundColor: 'rgba(191, 90, 242, 0.15)' }]}>
                  <Feather name="layers" size={16} color="#BF5AF2" />
                </View>
              </View>
              <Text style={[styles.metricCardValue, { color: textColor }]}>{stats.totalSubnets}</Text>
              <TouchableOpacity 
                style={[
                  styles.metricAction,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#D2DDE8',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#9AAABD',
                  }
                ]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Infraestructura', { screen: 'RedesInternas' })}
              >
                <Text style={[styles.metricActionText, { color: textColor }]}>Ver VLANs</Text>
                <Feather name="chevron-right" size={13} color={textColor} />
              </TouchableOpacity>
            </BlurView>

            <BlurView 
              intensity={blurIntensity} 
              tint={blurTint} 
              style={[styles.metricCard, { width: metricCardWidth, backgroundColor: cardBgColor, borderColor: cardBorderColor }]}
            >
              <View style={styles.metricCardHeader}>
                <Text style={[styles.metricCardLabel, { color: subtitleColor }]}>Equipos</Text>
                <View style={[styles.metricIconBadge, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                  <Feather name="cpu" size={16} color="#30D158" />
                </View>
              </View>
              <Text style={[styles.metricCardValue, { color: textColor }]}>{stats.totalDevices}</Text>
              <TouchableOpacity 
                style={[
                  styles.metricAction,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#D2DDE8',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#9AAABD',
                  }
                ]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Infraestructura', { screen: 'InventarioDispositivos' })}
              >
                <Text style={[styles.metricActionText, { color: textColor }]}>Inventario</Text>
                <Feather name="chevron-right" size={13} color={textColor} />
              </TouchableOpacity>
            </BlurView>

            <BlurView 
              intensity={blurIntensity} 
              tint={blurTint} 
              style={[styles.metricCard, { width: metricCardWidth, backgroundColor: cardBgColor, borderColor: cardBorderColor }]}
            >
              <View style={styles.metricCardHeader}>
                <Text style={[styles.metricCardLabel, { color: subtitleColor }]}>Incidentes</Text>
                <View style={[styles.metricIconBadge, { backgroundColor: 'rgba(255, 69, 58, 0.15)' }]}>
                  <Feather name="alert-triangle" size={16} color="#FF453A" />
                </View>
              </View>
              <Text style={[styles.metricCardValue, stats.activeIncidents > 0 ? { color: '#FF453A' } : { color: textColor }]}>
                {stats.activeIncidents}
              </Text>
              <TouchableOpacity 
                style={[
                  styles.metricAction,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#D2DDE8',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#9AAABD',
                  }
                ]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('CentroControl', { screen: 'SeguimientoIncidentes' })}
              >
                <Text style={[styles.metricActionText, { color: textColor }]}>Atender</Text>
                <Feather name="chevron-right" size={13} color={textColor} />
              </TouchableOpacity>
            </BlurView>
          </View>

          <View style={styles.pendingSection}>
            <View style={styles.pendingHeader}>
              <View style={styles.pendingHeadingGroup}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Pendientes accionables</Text>
                <Text style={[styles.pendingSummary, { color: subtitleColor }]}>
                  {openIncidents.length} incidentes · {pendingMaintenances.length} mantenimientos
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.pendingOpenAll, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.12)' : 'rgba(10, 132, 255, 0.08)' }]}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Abrir incidentes y mantenimientos"
                onPress={() => navigation.navigate('CentroControl', { screen: 'SeguimientoIncidentes' })}>
                <Text style={styles.pendingOpenAllText}>Ver bitácora</Text>
                <Feather name="arrow-up-right" size={13} color="#0A84FF" />
              </TouchableOpacity>
            </View>

            {actionableItems.length > 0 ? (
              <View style={styles.pendingList}>
                {actionableItems.slice(0, 5).map(item => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title}. ${item.status}. Abrir bitácora`}
                    onPress={() => navigation.navigate('CentroControl', { screen: 'SeguimientoIncidentes' })}>
                    <BlurView
                      intensity={blurIntensity}
                      tint={blurTint}
                      style={[styles.pendingCard, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                      <View style={[styles.pendingIcon, { backgroundColor: `${item.color}18` }]}>
                        <Feather name={item.icon} size={15} color={item.color} />
                      </View>
                      <View style={styles.pendingCopy}>
                        <Text style={[styles.pendingTitle, { color: textColor }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.pendingDetail, { color: subtitleColor }]} numberOfLines={1}>{item.detail}</Text>
                      </View>
                      <View style={styles.pendingAction}>
                        <Text style={[styles.pendingStatus, { color: item.color }]} numberOfLines={1}>{item.status}</Text>
                        <Feather name="chevron-right" size={14} color={subtitleColor} />
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                ))}
                {actionableItems.length > 5 && (
                  <TouchableOpacity
                    style={styles.pendingMoreButton}
                    activeOpacity={0.75}
                    onPress={() => navigation.navigate('CentroControl', { screen: 'SeguimientoIncidentes' })}>
                    <Text style={styles.pendingMoreText}>Ver los {actionableItems.length - 5} pendientes restantes</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={[styles.pendingEmptyCard, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                <Feather name="check-circle" size={20} color="#30D158" />
                <View style={styles.pendingCopy}>
                  <Text style={[styles.pendingTitle, { color: textColor }]}>Todo al día</Text>
                  <Text style={[styles.pendingDetail, { color: subtitleColor }]}>No hay incidentes ni mantenimientos pendientes.</Text>
                </View>
              </View>
            )}
          </View>

          {/* ⚡ Acciones Rápidas */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Acciones Rápidas</Text>
          </View>
          <View style={[styles.quickActionsGrid, isMobile && { flexDirection: 'column' }]}>
            <TouchableOpacity 
              style={[
                styles.quickActionCard,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#D7E1EB',
                  borderColor: cardBorderColor,
                }
              ]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Infraestructura', { screen: 'RedesInternas' })}
            >
              <View style={[styles.quickActionIconBg, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                <Feather name="plus" size={19} color="#0A84FF" />
              </View>
              <View style={styles.quickActionTextGroup}>
                <Text style={[styles.quickActionTitle, { color: textColor }]}>Nueva Red</Text>
                <Text style={[styles.quickActionSubtitle, { color: subtitleColor }]}>Crear segmento IPv4</Text>
              </View>
              <Feather name="chevron-right" size={16} color={isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.quickActionCard,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#D7E1EB',
                  borderColor: cardBorderColor,
                }
              ]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Infraestructura', { screen: 'InventarioDispositivos' })}
            >
              <View style={[styles.quickActionIconBg, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                <Feather name="hard-drive" size={19} color="#30D158" />
              </View>
              <View style={styles.quickActionTextGroup}>
                <Text style={[styles.quickActionTitle, { color: textColor }]}>Registrar Equipo</Text>
                <Text style={[styles.quickActionSubtitle, { color: subtitleColor }]}>Asignar MAC e IP</Text>
              </View>
              <Feather name="chevron-right" size={16} color={isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.quickActionCard,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#D7E1EB',
                  borderColor: cardBorderColor,
                }
              ]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Buscar')}
            >
              <View style={[styles.quickActionIconBg, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
                <Feather name="search" size={19} color="#FF9F0A" />
              </View>
              <View style={styles.quickActionTextGroup}>
                <Text style={[styles.quickActionTitle, { color: textColor }]}>Escanear / Buscar</Text>
                <Text style={[styles.quickActionSubtitle, { color: subtitleColor }]}>Por IP, MAC o VLAN</Text>
              </View>
              <Feather name="chevron-right" size={16} color={isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>
          </View>

          {/* 📐 Distribución en Dos Columnas */}
          <View style={[styles.splitSection, { flexDirection: isDesktop ? 'row' : 'column' }]}>
            
            <View style={[styles.splitCol, { flex: isDesktop ? 1 : undefined }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Capacidad de Direccionamiento IP</Text>
              </View>

              <BlurView 
                intensity={blurIntensity} 
                tint={blurTint} 
                style={[styles.capacityCard, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}
              >
                <View style={[styles.capacityHeader, { borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.capacityMainTitle, { color: textColor }]}>Uso General de Subredes</Text>
                    <Text style={[styles.capacityMainSub, { color: subtitleColor }]}>Distribución de hosts asignados vs. disponibles</Text>
                  </View>
                  <View style={styles.capacityBadge}>
                    <Text style={styles.capacityBadgeText}>{stats.subnetsWithUsage.length} VLANs</Text>
                  </View>
                </View>

                {stats.subnetsWithUsage.map((subnet, idx) => (
                  <View key={idx} style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={[styles.progressName, { color: textColor }]} numberOfLines={1}>{subnet.name}</Text>
                        <Text style={[styles.progressIp, { color: subtitleColor }]}>{subnet.address}/{subnet.cidr} • {subnet.deviceCount} de {subnet.maxHosts} IPs</Text>
                      </View>
                      <Text style={[styles.progressPercent, { color: textColor }]}>{subnet.percentage}%</Text>
                    </View>
                    <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }]}>
                      <View style={[styles.progressBarThumb, { width: `${Math.min(subnet.percentage, 100)}%`, backgroundColor: subnet.color }]} />
                    </View>
                  </View>
                ))}

                {stats.subnetsWithUsage.length === 0 && (
                  <Text style={{ color: subtitleColor, fontFamily: 'Poppins_400Regular', fontSize: 13 }}>No hay subredes con dispositivos asignados.</Text>
                )}
              </BlurView>
            </View>

            <View style={[styles.splitCol, { flex: isDesktop ? 1 : undefined }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Eventos de Infraestructura</Text>
              </View>

              <View style={styles.activityList}>
                {activities.slice(0, 4).map((act) => (
                  <TouchableOpacity 
                    key={act.id} 
                    activeOpacity={0.7} 
                    onPress={() => handleActivityPress(act.id)}
                  >
                    <BlurView 
                      intensity={blurIntensity} 
                      tint={blurTint} 
                      style={[styles.activityCard, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}
                    >
                      <View style={[styles.activityStatusIndicator, { backgroundColor: act.color }]} />
                      <View style={styles.activityContent}>
                        <View style={styles.activityRowTop}>
                          <Text style={[styles.activityDeviceName, { color: textColor }]} numberOfLines={1}>{act.name}</Text>
                          <Text style={[styles.activityTimestamp, { color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.45)' }]}>{act.timestamp}</Text>
                        </View>
                        <Text style={[styles.activityDetailText, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)' }]} numberOfLines={2}>{act.statusText}</Text>
                      </View>
                      <Feather name="chevron-right" size={13} color={isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0,0,0,0.25)'} style={{ marginLeft: 6 }} />
                    </BlurView>
                  </TouchableOpacity>
                ))}

                {activities.length === 0 && (
                  <Text style={{ color: subtitleColor, fontFamily: 'Poppins_400Regular', fontSize: 13 }}>No hay actividad reciente registrada.</Text>
                )}
              </View>
            </View>

          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 45, paddingBottom: 110 },
  innerWrapper: { maxWidth: 1200, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 240 },
  logoContainer: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden', borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 5 },
  logoImage: { width: '100%', height: '100%' },
  headerTextContainer: { justifyContent: 'center', flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#30D158' },
  statusBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 9.5, color: '#30D158', letterSpacing: 1 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, lineHeight: 26 },
  headerSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 11.5 },
  accountAccessSubtitle: { fontSize: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchHeaderButton: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  themeHeaderButton: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logoutHeaderButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, height: 38, borderRadius: 11, backgroundColor: 'rgba(255, 69, 58, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.3)' },
  logoutButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: '#FF453A' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 24 },
  metricCard: { padding: 15, borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
  metricCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  metricIconBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  metricCardLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11.5 },
  metricCardValue: { fontFamily: 'Poppins_700Bold', fontSize: 26, marginBottom: 10 },
  metricAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1 },
  metricActionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5 },
  pendingSection: { marginBottom: 24 },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 },
  pendingHeadingGroup: { flex: 1 },
  pendingSummary: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, marginTop: 2 },
  pendingOpenAll: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  pendingOpenAllText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#0A84FF' },
  pendingList: { gap: 8 },
  pendingCard: { flexDirection: 'row', alignItems: 'center', padding: 11, borderRadius: 14, overflow: 'hidden', borderWidth: 1, gap: 10 },
  pendingEmptyCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  pendingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pendingCopy: { flex: 1, minWidth: 0 },
  pendingTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  pendingDetail: { fontFamily: 'Poppins_400Regular', fontSize: 10, marginTop: 2 },
  pendingAction: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '34%' },
  pendingStatus: { fontFamily: 'Poppins_600SemiBold', fontSize: 9.5 },
  pendingMoreButton: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 3 },
  pendingMoreText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#0A84FF' },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, letterSpacing: 0.3 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  quickActionCard: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 16, borderWidth: 1, gap: 10 },
  quickActionIconBg: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  quickActionTextGroup: { flex: 1 },
  quickActionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5 },
  quickActionSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 10.5 },
  splitSection: { gap: 18 },
  splitCol: { gap: 10 },
  capacityCard: { padding: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1 },
  capacityMainTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5 },
  capacityMainSub: { fontFamily: 'Poppins_400Regular', fontSize: 10.5 },
  capacityBadge: { backgroundColor: 'rgba(10, 132, 255, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  capacityBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 9.5, color: '#0A84FF' },
  progressItem: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  progressName: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5 },
  progressIp: { fontFamily: 'Poppins_400Regular', fontSize: 9.5 },
  progressPercent: { fontFamily: 'Poppins_700Bold', fontSize: 11.5 },
  progressBarTrack: { height: 5, borderRadius: 2.5, overflow: 'hidden' },
  progressBarThumb: { height: '100%', borderRadius: 2.5 },
  activityList: { gap: 9 },
  activityCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  activityStatusIndicator: { width: 7, height: 7, borderRadius: 3.5, marginRight: 10 },
  activityContent: { flex: 1 },
  activityRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  activityDeviceName: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5 },
  activityTimestamp: { fontFamily: 'Poppins_400Regular', fontSize: 9.5 },
  activityDetailText: { fontFamily: 'Poppins_400Regular', fontSize: 10.5 },
});
