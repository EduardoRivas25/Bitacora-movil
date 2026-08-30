import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Map } from '../../components/ui/map';
import * as api from '../../services/api';
import { Device, Building } from '../../types';

export default function MapScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [devices, setDevices] = useState<Device[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [devs, blds] = await Promise.all([api.fetchDevices(), api.fetchBuildings()]);
      setDevices(devs);
      setBuildings(blds);
      if (devs.length > 0) setSelectedDevice(devs[0]);
    } catch (err) {
      console.error('Error cargando datos para mapa:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const getDeviceColor = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('switch')) return '#0A84FF';
    if (lower.includes('router')) return '#30D158';
    if (lower.includes('firewall')) return '#FF9F0A';
    if (lower.includes('servidor')) return '#BF5AF2';
    if (lower.includes('access') || lower.includes('unifi')) return '#32D74B';
    if (lower.includes('imac')) return '#FF6482';
    return '#64D2FF';
  };

  if (loading) {
    return (
      <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0A84FF" />
        </View>
      </LinearGradient>
    );
  }

  const mappedCount = devices.filter(d => d.latitude && d.longitude).length;

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerBadge}>LOCALIZACIÓN GPS EN TIEMPO REAL</Text>
          <Text style={styles.headerTitle}>Mapa de Red</Text>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.counterBadge}>
            <Feather name="map-pin" size={14} color="#0A84FF" />
            <Text style={styles.counterText}>{mappedCount} equipos mapeados</Text>
          </View>
        </View>
      </View>

      <View style={[styles.mainLayout, isTablet && styles.mainLayoutTablet]}>
        <View style={[styles.mapContainer, isTablet && styles.mapContainerTablet]}>
          <Map
            devices={devices}
            buildings={buildings}
            selectedDeviceId={selectedDevice?.id}
            onSelectDevice={(d) => setSelectedDevice(d)}
            height="100%"
          />
        </View>

        <View style={[styles.sidePanel, isTablet && styles.sidePanelTablet]}>
          <Text style={styles.panelTitle}>DISPOSITIVOS</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {devices.map((dev) => {
              const isSelected = selectedDevice?.id === dev.id;
              const color = getDeviceColor(dev.name);
              return (
                <TouchableOpacity
                  key={dev.id}
                  style={[styles.deviceItem, isSelected && styles.deviceItemActive]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedDevice(dev)}
                >
                  <View style={[styles.colorDot, { backgroundColor: color }]} />
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName} numberOfLines={1}>{dev.name}</Text>
                    <Text style={styles.deviceIp}>{dev.ipv4_address} • {dev.location}</Text>
                  </View>
                  {dev.latitude && <Feather name="map-pin" size={12} color={color} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedDevice && (
            <BlurView intensity={30} tint="dark" style={styles.detailCard}>
              <Text style={styles.detailName}>{selectedDevice.name}</Text>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>IPv4</Text><Text style={styles.detailValue}>{selectedDevice.ipv4_address}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>MAC</Text><Text style={styles.detailValue}>{selectedDevice.mac_address}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Ubicación</Text><Text style={styles.detailValue}>{selectedDevice.location}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>GPS</Text><Text style={styles.detailValue}>{selectedDevice.latitude?.toFixed(4)}, {selectedDevice.longitude?.toFixed(4)}</Text></View>
            </BlurView>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: '5%', paddingTop: 45, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#30D158', letterSpacing: 1.5 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#FFFFFF', lineHeight: 28 },
  headerStats: { alignItems: 'flex-end' },
  counterBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(10, 132, 255, 0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.25)' },
  counterText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#0A84FF' },
  mainLayout: { flex: 1, flexDirection: 'column', padding: 10 },
  mainLayoutTablet: { flexDirection: 'row', paddingHorizontal: '3%' },
  mapContainer: { flex: 1, borderRadius: 16, overflow: 'hidden', minHeight: 350, marginBottom: 10 },
  mapContainerTablet: { flex: 3, marginBottom: 0, marginRight: 12 },
  sidePanel: { flex: 1, maxHeight: 300 },
  sidePanelTablet: { flex: 1, maxHeight: undefined },
  panelTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 },
  deviceItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.04)', marginBottom: 6 },
  deviceItemActive: { borderColor: '#0A84FF', backgroundColor: 'rgba(10, 132, 255, 0.1)' },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  deviceInfo: { flex: 1 },
  deviceName: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#FFFFFF' },
  deviceIp: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: 'rgba(255, 255, 255, 0.5)' },
  detailCard: { padding: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)', marginTop: 10 },
  detailName: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#FFFFFF', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: 'rgba(255, 255, 255, 0.4)' },
  detailValue: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#FFFFFF' },
});
