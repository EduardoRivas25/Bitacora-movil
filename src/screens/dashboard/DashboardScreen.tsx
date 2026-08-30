import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isTablet ? '10%' : '5%' }]}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Panel de Control</Text>
          <Text style={styles.headerSubtitle}>Resumen general del sistema</Text>
        </View>

        <View style={[styles.grid, { flexDirection: isTablet ? 'row' : 'column' }]}>
          <BlurView intensity={30} tint="dark" style={[styles.card, { flex: isTablet ? 1 : undefined }]}>
            <Text style={styles.cardLabel}>Dispositivos Activos</Text>
            <Text style={styles.cardValue}>24</Text>
            <TouchableOpacity style={styles.cardAction}>
              <Text style={styles.cardActionText}>Gestionar</Text>
            </TouchableOpacity>
          </BlurView>

          <BlurView intensity={30} tint="dark" style={[styles.card, { flex: isTablet ? 1 : undefined }]}>
            <Text style={styles.cardLabel}>Redes Monitoreadas</Text>
            <Text style={styles.cardValue}>8</Text>
            <TouchableOpacity style={styles.cardAction}>
              <Text style={styles.cardActionText}>Ver detalles</Text>
            </TouchableOpacity>
          </BlurView>
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 40,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  grid: {
    gap: 20,
  },
  card: {
    padding: 25,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cardLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 10,
  },
  cardValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 38,
    color: '#FFFFFF',
    marginBottom: 25,
  },
  cardAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardActionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});