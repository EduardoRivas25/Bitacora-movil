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
import { fetchDashboardStats, fetchRecentActivities, DashboardStats } from '../../services/api';
import { RecentActivity } from '../../types';

const APP_LOGO = require('../../../assets/logobitacoraredes.png');

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const isDesktop = width > 1024;
  const navigation = useNavigation<any>();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading || !stats) {
    return (
      <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins_400Regular', marginTop: 12 }}>Cargando datos...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingHorizontal: isDesktop ? '8%' : isTablet ? '6%' : '4%' }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header con Logo Oficial y Estado */}
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <View style={styles.logoContainer}>
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
              <Text style={styles.headerTitle}>Bitácora Digital</Text>
              <Text style={styles.headerSubtitle}>Administración de Redes & Dispositivos</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.searchHeaderButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Buscar')}
          >
            <Feather name="search" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 📊 Grid de Métricas Principales */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Redes */}
          <BlurView 
            intensity={30} 
            tint="dark" 
            style={[
              styles.metricCard, 
              { width: isDesktop ? '23.5%' : isTablet ? '48%' : '48%' }
            ]}
          >
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricCardLabel}>Redes Base</Text>
              <View style={[styles.metricIconBadge, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                <Feather name="wifi" size={17} color="#0A84FF" />
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
            style={[
              styles.metricCard, 
              { width: isDesktop ? '23.5%' : isTablet ? '48%' : '48%' }
            ]}
          >
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricCardLabel}>Subredes VLAN</Text>
              <View style={[styles.metricIconBadge, { backgroundColor: 'rgba(191, 90, 242, 0.15)' }]}>
                <Feather name="layers" size={17} color="#BF5AF2" />
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
            style={[
              styles.metricCard, 
              { width: isDesktop ? '23.5%' : isTablet ? '48%' : '48%' }
            ]}
          >
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricCardLabel}>Equipos</Text>
              <View style={[styles.metricIconBadge, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                <Feather name="cpu" size={17} color="#30D158" />
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
            style={[
              styles.metricCard, 
              { width: isDesktop ? '23.5%' : isTablet ? '48%' : '48%' }
            ]}
          >
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricCardLabel}>Incidentes</Text>
              <View style={[styles.metricIconBadge, { backgroundColor: 'rgba(255, 69, 58, 0.15)' }]}>
                <Feather name="alert-triangle" size={17} color="#FF453A" />
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
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Redes')}
          >
            <View style={[styles.quickActionIconBg, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
              <Feather name="plus" size={20} color="#0A84FF" />
            </View>
            <View style={styles.quickActionTextGroup}>
              <Text style={styles.quickActionTitle}>Nueva Red</Text>
              <Text style={styles.quickActionSubtitle}>Crear segmento IPv4</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Dispositivos')}
          >
            <View style={[styles.quickActionIconBg, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
              <Feather name="hard-drive" size={20} color="#30D158" />
            </View>
            <View style={styles.quickActionTextGroup}>
              <Text style={styles.quickActionTitle}>Registrar Equipo</Text>
              <Text style={styles.quickActionSubtitle}>Asignar MAC e IP</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Buscar')}
          >
            <View style={[styles.quickActionIconBg, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
              <Feather name="search" size={20} color="#FF9F0A" />
            </View>
            <View style={styles.quickActionTextGroup}>
              <Text style={styles.quickActionTitle}>Escanear / Buscar</Text>
              <Text style={styles.quickActionSubtitle}>Por IP, MAC o VLAN</Text>
            </View>
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
                <View>
                  <Text style={styles.capacityMainTitle}>Uso General de Subredes</Text>
                  <Text style={styles.capacityMainSub}>Distribución de hosts asignados vs. disponibles</Text>
                </View>
                <View style={styles.capacityBadge}>
                  <Text style={styles.capacityBadgeText}>{stats.subnetsWithUsage.length} VLANs Activas</Text>
                </View>
              </View>

              {stats.subnetsWithUsage.map((subnet, idx) => (
                <View key={idx} style={styles.progressItem}>
                  <View style={styles.progressHeader}>
                    <View>
                      <Text style={styles.progressName}>{subnet.name}</Text>
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

          {/* Columna Derecha: Actividad en Vivo */}
          <View style={[styles.splitCol, { flex: isDesktop ? 1 : undefined }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Eventos de Infraestructura</Text>
            </View>

            <View style={styles.activityList}>
              {activities.map((act) => (
                <BlurView key={act.id} intensity={25} tint="dark" style={styles.activityCard}>
                  <View style={[styles.activityStatusIndicator, { backgroundColor: act.color }]} />
                  <View style={styles.activityContent}>
                    <View style={styles.activityRowTop}>
                      <Text style={styles.activityDeviceName}>{act.name}</Text>
                      <Text style={styles.activityTimestamp}>{act.timestamp}</Text>
                    </View>
                    <Text style={styles.activityDetailText}>{act.statusText}</Text>
                  </View>
                </BlurView>
              ))}

              {activities.length === 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Poppins_400Regular', fontSize: 13 }}>No hay actividad reciente registrada.</Text>
              )}
            </View>
          </View>

        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 50, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoContainer: { width: 52, height: 52, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center', padding: 6 },
  logoImage: { width: '100%', height: '100%' },
  headerTextContainer: { justifyContent: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#30D158' },
  statusBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#30D158', letterSpacing: 1 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#FFFFFF', lineHeight: 28 },
  headerSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255, 255, 255, 0.45)' },
  searchHeaderButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', justifyContent: 'center' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 26 },
  metricCard: { padding: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  metricCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  metricIconBadge: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  metricCardLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' },
  metricCardValue: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: '#FFFFFF', marginBottom: 12 },
  metricAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  metricActionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#FFFFFF' },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#FFFFFF', letterSpacing: 0.3 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 26 },
  quickActionCard: { flex: 1, minWidth: 150, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', gap: 12 },
  quickActionIconBg: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickActionTextGroup: { flex: 1 },
  quickActionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FFFFFF' },
  quickActionSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255, 255, 255, 0.45)' },
  splitSection: { gap: 20 },
  splitCol: { gap: 12 },
  capacityCard: { padding: 18, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  capacityMainTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' },
  capacityMainSub: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255, 255, 255, 0.45)' },
  capacityBadge: { backgroundColor: 'rgba(10, 132, 255, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  capacityBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#0A84FF' },
  progressItem: { marginBottom: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressName: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#FFFFFF' },
  progressIp: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: 'rgba(255, 255, 255, 0.45)' },
  progressPercent: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#FFFFFF' },
  progressBarTrack: { height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255, 255, 255, 0.06)', overflow: 'hidden' },
  progressBarThumb: { height: '100%', borderRadius: 2.5 },
  activityList: { gap: 10 },
  activityCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  activityStatusIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  activityContent: { flex: 1 },
  activityRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  activityDeviceName: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FFFFFF' },
  activityTimestamp: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: 'rgba(255, 255, 255, 0.4)' },
  activityDetailText: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' },
});