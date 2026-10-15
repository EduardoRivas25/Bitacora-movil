import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import * as api from '../../services/api';
import { Device } from '../../types';
import PortInventoryScreen from './PortInventoryScreen';

export default function PortInventoryRouteScreen() {
  const { colors } = useTheme();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(useCallback(() => {
    let isActive = true;
    setLoading(true);
    setLoadError('');
    api.fetchDevices().then(result => {
      if (isActive) setDevices(result);
    }).catch(error => {
      console.error('No se pudieron cargar los dispositivos para el inventario de puertos:', error);
      if (isActive) setLoadError('No se pudieron cargar los switches. Verifica tu conexión e inténtalo de nuevo.');
    }).finally(() => {
      if (isActive) setLoading(false);
    });
    return () => { isActive = false; };
  }, [reloadKey]));

  if (loading) {
    return (
      <LinearGradient colors={colors.gradient} style={styles.centered}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={[styles.message, { color: colors.textSecondary }]}>Cargando switches...</Text>
      </LinearGradient>
    );
  }

  if (loadError) {
    return (
      <LinearGradient colors={colors.gradient} style={styles.centered}>
        <Feather name="alert-circle" size={28} color="#FF453A" />
        <Text style={[styles.message, { color: colors.textPrimary }]}>{loadError}</Text>
        <TouchableOpacity onPress={() => setReloadKey(value => value + 1)} style={styles.retryButton}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return <PortInventoryScreen devices={devices} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  message: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 14,
    maxWidth: 320,
  },
  retryButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 16,
  },
  retryText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
});
