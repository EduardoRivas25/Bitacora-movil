import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Spacing, BorderRadius, FontSize, FontWeight } from '../../theme/spacing';
import { useAuth } from '../../contexts/AuthContext';
import type { RecentActivity } from '../../types';

const { width } = Dimensions.get('window');

// Datos mock para el dashboard
const MOCK_STATS = {
  totalNetworks: 12,
  activeDevices: 1402,
  totalSubnets: 36,
  alerts: 3,
};

const MOCK_RECENT_ACTIVITY: RecentActivity[] = [
  {
    id: '1',
    name: 'Oficina Principal Wi-Fi',
    status: 'online',
    statusText: 'Rendimiento óptimo',
    timestamp: 'Hace 2 min',
    icon: 'wifi',
    color: Colors.primary,
  },
  {
    id: '2',
    name: 'Red de Invitados',
    status: 'warning',
    statusText: 'Alta latencia',
    timestamp: 'Hace 15 min',
    icon: 'people',
    color: Colors.warning,
  },
  {
    id: '3',
    name: 'Almacén VPN',
    status: 'offline',
    statusText: 'Conexión perdida',
    timestamp: 'Hace 1 hora',
    icon: 'shield-checkmark',
    color: Colors.danger,
  },
  {
    id: '4',
    name: 'Servidor Principal',
    status: 'online',
    statusText: 'Funcionando normal',
    timestamp: 'Hace 3 min',
    icon: 'server',
    color: Colors.secondary,
  },
  {
    id: '5',
    name: 'Red Laboratorio B',
    status: 'online',
    statusText: 'Sin incidencias',
    timestamp: 'Hace 10 min',
    icon: 'git-network',
    color: Colors.primary,
  },
];

function StatCard({
  icon,
  label,
  value,
  color,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color: string;
  delay: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 60,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.statCard,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
    </Animated.View>
  );
}

function ActivityItem({
  item,
  index,
}: {
  item: RecentActivity;
  index: number;
}) {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: 300 + index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: 300 + index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const statusColor =
    item.status === 'online'
      ? Colors.secondary
      : item.status === 'warning'
      ? Colors.warning
      : Colors.danger;

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{ translateX: slideAnim }],
      }}>
      <TouchableOpacity style={styles.activityItem} activeOpacity={0.6}>
        <View style={[styles.activityIcon, { backgroundColor: item.color + '18' }]}>
          <Ionicons
            name={item.icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={item.color}
          />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityName}>{item.name}</Text>
          <Text style={styles.activityMeta}>
            {item.statusText} • {item.timestamp}
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="globe" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Red</Text>
          </View>
          <TouchableOpacity style={styles.avatarButton} onPress={signOut}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.onlineIndicator} />
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="git-network-outline"
            label="Total Redes"
            value={MOCK_STATS.totalNetworks}
            color={Colors.primary}
            delay={0}
          />
          <StatCard
            icon="hardware-chip-outline"
            label="Dispositivos"
            value={MOCK_STATS.activeDevices}
            color={Colors.secondary}
            delay={100}
          />
          <StatCard
            icon="layers-outline"
            label="Subredes"
            value={MOCK_STATS.totalSubnets}
            color={Colors.warning}
            delay={200}
          />
          <StatCard
            icon="alert-circle-outline"
            label="Alertas"
            value={MOCK_STATS.alerts}
            color={Colors.danger}
            delay={300}
          />
        </View>

        {/* Agregar Red Button */}
        <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color={Colors.textPrimary} />
          <Text style={styles.addButtonText}>Agregar Red</Text>
        </TouchableOpacity>

        {/* Actividad Reciente */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ACTIVIDAD RECIENTE</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          {MOCK_RECENT_ACTIVITY.map((item, index) => (
            <ActivityItem key={item.id} item={item} index={index} />
          ))}
        </View>

        {/* Info de red rápida */}
        <View style={styles.quickInfoCard}>
          <View style={styles.quickInfoHeader}>
            <Ionicons name="information-circle" size={18} color={Colors.primary} />
            <Text style={styles.quickInfoTitle}>Subred Primaria</Text>
          </View>
          <Text style={styles.quickInfoAddress}>192.168.1.0/24</Text>
          <Text style={styles.quickInfoMeta}>42 Hosts activos</Text>
        </View>

        {/* Spacer para tab bar */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const STAT_CARD_WIDTH = (width - Spacing.xxxl * 2 - Spacing.md) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: 30,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  avatarButton: {
    position: 'relative',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  avatarText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: STAT_CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 48,
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  // Activity List
  activityList: {
    gap: Spacing.xs,
    marginBottom: Spacing.xxl,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Quick Info
  quickInfoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickInfoTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickInfoAddress: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  quickInfoMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
