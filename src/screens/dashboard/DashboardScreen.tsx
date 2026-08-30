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
import { fetchDashboardStats, fetchRecentActivities, DashboardStats } from '../../services/api';
import { RecentActivity } from '../../types';

const APP_LOGO = require('../../../assets/logobitacoraredes.png');

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isSmallMobile = width < 380;
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;
  const navigation = useNavigation<any>();
  const { signOut, user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && !stats) setLoading(true);
      const [dashStats, recentActs] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentActivities(),
      ]);
      setStats(dashStats);
      setActivities(recentActs);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [stats]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  const handleActivityPress = (actId: string) => {
    if (actId.startsWith('inc-') || actId.startsWith('mnt-')) {
      navigation.navigate('Incidentes');
    } else if (actId.startsWith('cfg-')) {
      navigation.navigate('Configuraciones');
    } else if (actId.startsWith('dev-')) {
      navigation.navigate('Dispositivos');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

  if (!stats) {
    return (
      <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins_400Regular', marginTop: 12 }}>Cargando datos...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Ancho dinámico para las tarjetas de métricas
  const metricCardWidth = isDesktop ? '23.5%' : isSmallMobile ? '100%' : '48.5%';

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingHorizontal: isDesktop ? '6%' : isTablet ? '4%' : 16 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerBrand}>
              <View style={[styles.logoContainer, isSmallMobile && { width: 44, height: 44 }]}>
                <Image 
                  source={APP_LOGO} 
                  style={styles.logoImage} 
                  resizeMode="contain"
                />
              </View>
              <View style={styles.headerTextContainer}>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusBadgeText}>SISTEMA EN LÍNEA</Text>
                </View>
                <Text style={[styles.headerTitle, isSmallMobile && { fontSize: 20, lineHeight: 24 }]}>Bitácora Digital</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {user?.email ? user.email : 'Administración de Redes & Dispositivos'}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.searchHeaderButton}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Buscar')}
              >
                <Feather name="search" size={18} color="#FFFFFF" />
              </TouchableOpacity>

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
            {/* Card 1: Redes */}
            <BlurView 
              intensity={30} 
              tint="dark" 
              style={[styles.metricCard, { width: metricCardWidth }]}
            >
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricCardLabel}>Redes Base</Text>
                <View style={[styles.metricIconBadge, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                  <Feather name="wifi" size={16} color="#0A84FF" />
                </View>
              </View>
              <Text style={styles.metricCardValue}>{stats.totalNetworks}</Text>
              <TouchableOpacity 
                style={styles.metricAction}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Redes')}
              >
                <Text style={styles.metricActionText}>Ver redes</Text>
                <Feather name="chevron-right" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </BlurView>

            {/* Card 2: Subredes */}
            <BlurView 
              intensity={30} 
              tint="dark" 
              style={[styles.metricCard, { width: metricCardWidth }]}
            >
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricCardLabel}>Subredes VLAN</Text>
                <View style={[styles.metricIconBadge, { backgroundColor: 'rgba(191, 90, 242, 0.15)' }]}>
                  <Feather name="layers" size={16} color="#BF5AF2" />
                </View>
              </View>
              <Text style={styles.metricCardValue}>{stats.totalSubnets}</Text>
              <TouchableOpacity 
                style={styles.metricAction}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Redes')}
              >
                <Text style={styles.metricActionText}>Ver VLANs</Text>
                <Feather name="chevron-right" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </BlurView>

            {/* Card 3: Dispositivos */}
            <BlurView 
              intensity={30} 
              tint="dark" 
              style={[styles.metricCard, { width: metricCardWidth }]}
            >
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricCardLabel}>Equipos</Text>
                <View style={[styles.metricIconBadge, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                  <Feather name="cpu" size={16} color="#30D158" />
                </View>
              </View>
              <Text style={styles.metricCardValue}>{stats.totalDevices}</Text>
              <TouchableOpacity 
                style={styles.metricAction}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Dispositivos')}
              >
                <Text style={styles.metricActionText}>Inventario</Text>
                <Feather name="chevron-right" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </BlurView>

            {/* Card 4: Incidentes */}
            <BlurView 
              intensity={30} 
              tint="dark" 
              style={[styles.metricCard, { width: metricCardWidth }]}
            >
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricCardLabel}>Incidentes</Text>
                <View style={[styles.metricIconBadge, { backgroundColor: 'rgba(255, 69, 58, 0.15)' }]}>
                  <Feather name="alert-triangle" size={16} color="#FF453A" />
                </View>
              </View>
              <Text style={[styles.metricCardValue, stats.activeIncidents > 0 && { color: '#FF453A' }]}>{stats.activeIncidents}</Text>
              <TouchableOpacity 
                style={styles.metricAction}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Incidentes')}
              >
                <Text style={styles.metricActionText}>Atender</Text>
                <Feather name="chevron-right" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </BlurView>
          </View>

          {/* ⚡ Acciones Rápidas */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          </View>
          <View style={[styles.quickActionsGrid, isMobile && { flexDirection: 'column' }]}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Redes')}
            >
              <View style={[styles.quickActionIconBg, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                <Feather name="plus" size={19} color="#0A84FF" />
              </View>
              <View style={styles.quickActionTextGroup}>
                <Text style={styles.quickActionTitle}>Nueva Red</Text>
                <Text style={styles.quickActionSubtitle}>Crear segmento IPv4</Text>
              </View>
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Dispositivos')}
            >
              <View style={[styles.quickActionIconBg, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                <Feather name="hard-drive" size={19} color="#30D158" />
              </View>
              <View style={styles.quickActionTextGroup}>
                <Text style={styles.quickActionTitle}>Registrar Equipo</Text>
                <Text style={styles.quickActionSubtitle}>Asignar MAC e IP</Text>
              </View>
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Buscar')}
            >
              <View style={[styles.quickActionIconBg, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
                <Feather name="search" size={19} color="#FF9F0A" />
              </View>
              <View style={styles.quickActionTextGroup}>
                <Text style={styles.quickActionTitle}>Escanear / Buscar</Text>
                <Text style={styles.quickActionSubtitle}>Por IP, MAC o VLAN</Text>
              </View>
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          </View>

          {/* 📐 Distribución en Dos Columnas para Tablets / Desktop */}
          <View style={[styles.splitSection, { flexDirection: isDesktop ? 'row' : 'column' }]}>
            
            {/* Columna Izquierda: Capacidad de Direccionamiento IP */}
            <View style={[styles.splitCol, { flex: isDesktop ? 1 : undefined }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Capacidad de Direccionamiento IP</Text>
              </View>

              <BlurView intensity={30} tint="dark" style={styles.capacityCard}>
                <View style={styles.capacityHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.capacityMainTitle}>Uso General de Subredes</Text>
                    <Text style={styles.capacityMainSub}>Distribución de hosts asignados vs. disponibles</Text>
                  </View>
                  <View style={styles.capacityBadge}>
                    <Text style={styles.capacityBadgeText}>{stats.subnetsWithUsage.length} VLANs</Text>
                  </View>
                </View>

                {stats.subnetsWithUsage.map((subnet, idx) => (
                  <View key={idx} style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={styles.progressName} numberOfLines={1}>{subnet.name}</Text>
                        <Text style={styles.progressIp}>{subnet.address}/{subnet.cidr} • {subnet.deviceCount} de {subnet.maxHosts} IPs</Text>
                      </View>
                      <Text style={styles.progressPercent}>{subnet.percentage}%</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarThumb, { width: `${Math.min(subnet.percentage, 100)}%`, backgroundColor: subnet.color }]} />
                    </View>
                  </View>
                ))}

                {stats.subnetsWithUsage.length === 0 && (
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Poppins_400Regular', fontSize: 13 }}>No hay subredes con dispositivos asignados.</Text>
                )}
              </BlurView>
            </View>

            {/* Columna Derecha: Eventos de Infraestructura Activos */}
            <View style={[styles.splitCol, { flex: isDesktop ? 1 : undefined }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Eventos de Infraestructura</Text>
              </View>

              <View style={styles.activityList}>
                {activities.slice(0, 4).map((act) => (
                  <TouchableOpacity 
                    key={act.id} 
                    activeOpacity={0.7} 
                    onPress={() => handleActivityPress(act.id)}
                  >
                    <BlurView intensity={25} tint="dark" style={styles.activityCard}>
                      <View style={[styles.activityStatusIndicator, { backgroundColor: act.color }]} />
                      <View style={styles.activityContent}>
                        <View style={styles.activityRowTop}>
                          <Text style={styles.activityDeviceName} numberOfLines={1}>{act.name}</Text>
                          <Text style={styles.activityTimestamp}>{act.timestamp}</Text>
                        </View>
                        <Text style={styles.activityDetailText} numberOfLines={2}>{act.statusText}</Text>
                      </View>
                      <Feather name="chevron-right" size={13} color="rgba(255,255,255,0.25)" style={{ marginLeft: 6 }} />
                    </BlurView>
                  </TouchableOpacity>
                ))}

                {activities.length === 0 && (
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Poppins_400Regular', fontSize: 13 }}>No hay actividad reciente registrada.</Text>
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
  logoContainer: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center', padding: 5 },
  logoImage: { width: '100%', height: '100%' },
  headerTextContainer: { justifyContent: 'center', flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#30D158' },
  statusBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 9.5, color: '#30D158', letterSpacing: 1 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#FFFFFF', lineHeight: 26 },
  headerSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.45)' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchHeaderButton: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', justifyContent: 'center' },
  logoutHeaderButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, height: 38, borderRadius: 11, backgroundColor: 'rgba(255, 69, 58, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.3)' },
  logoutButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: '#FF453A' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 24 },
  metricCard: { padding: 15, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  metricCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  metricIconBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  metricCardLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)' },
  metricCardValue: { fontFamily: 'Poppins_700Bold', fontSize: 26, color: '#FFFFFF', marginBottom: 10 },
  metricAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingVertical: 6, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  metricActionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#FFFFFF' },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#FFFFFF', letterSpacing: 0.3 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  quickActionCard: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', gap: 10 },
  quickActionIconBg: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  quickActionTextGroup: { flex: 1 },
  quickActionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: '#FFFFFF' },
  quickActionSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: 'rgba(255, 255, 255, 0.45)' },
  splitSection: { gap: 18 },
  splitCol: { gap: 10 },
  capacityCard: { padding: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  capacityMainTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: '#FFFFFF' },
  capacityMainSub: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: 'rgba(255, 255, 255, 0.45)' },
  capacityBadge: { backgroundColor: 'rgba(10, 132, 255, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  capacityBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 9.5, color: '#0A84FF' },
  progressItem: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  progressName: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: '#FFFFFF' },
  progressIp: { fontFamily: 'Poppins_400Regular', fontSize: 9.5, color: 'rgba(255, 255, 255, 0.45)' },
  progressPercent: { fontFamily: 'Poppins_700Bold', fontSize: 11.5, color: '#FFFFFF' },
  progressBarTrack: { height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255, 255, 255, 0.06)', overflow: 'hidden' },
  progressBarThumb: { height: '100%', borderRadius: 2.5 },
  activityList: { gap: 9 },
  activityCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  activityStatusIndicator: { width: 7, height: 7, borderRadius: 3.5, marginRight: 10 },
  activityContent: { flex: 1 },
  activityRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  activityDeviceName: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: '#FFFFFF' },
  activityTimestamp: { fontFamily: 'Poppins_400Regular', fontSize: 9.5, color: 'rgba(255, 255, 255, 0.4)' },
  activityDetailText: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: 'rgba(255, 255, 255, 0.6)' },
});