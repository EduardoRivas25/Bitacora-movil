import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as api from '../../services/api';
import { Device } from '../../types';

const SEARCH_FILTERS = ['Todo', 'Nombre', 'IPv4', 'MAC', 'Fabricante', 'Ubicación'];
const POPULAR_QUERIES = ['Cisco', '10.0.10.', 'UniFi', 'MikroTik', 'Rack 01', 'Apple', 'Fortinet'];

export default function SearchScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const isSmallMobile = width < 380;
  const isDesktop = width >= 1024;
  const cardWidth = isDesktop ? '31.8%' : isTablet ? '48.5%' : '100%';

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todo');
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDevices = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && allDevices.length === 0) setLoading(true);
      const data = await api.fetchDevices(isSilent);
      setAllDevices(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [allDevices.length]);

  useFocusEffect(useCallback(() => { loadDevices(true); }, [loadDevices]));

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

  if (loading && allDevices.length === 0) {
    return (<LinearGradient colors={['#050505', '#121212']} style={styles.container}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#FF9F0A" /></View></LinearGradient>);
  }

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isDesktop ? '6%' : isTablet ? '4%' : 16 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.innerWrapper}>
          <View style={styles.header}>
            <Text style={styles.headerBadge}>BÚSQUEDA GLOBAL</Text>
            <Text style={[styles.headerTitle, isSmallMobile && { fontSize: 22 }]}>Buscador de Red</Text>
            <Text style={styles.headerSubtitle}>Localiza equipos por IP, MAC, nombre o ubicación ({allDevices.length} equipos en BD)</Text>
          </View>
          <BlurView intensity={30} tint="dark" style={styles.searchBarWrapper}>
            <Feather name="search" size={18} color="rgba(255, 255, 255, 0.4)" style={styles.searchIcon} />
            <TextInput placeholder="Buscar dispositivo, IP, MAC o rack..." placeholderTextColor="rgba(255, 255, 255, 0.25)" style={styles.searchInput} value={query} onChangeText={setQuery} autoCapitalize="none" />
            {query.length > 0 && (<TouchableOpacity style={styles.clearBtn} onPress={() => setQuery('')} activeOpacity={0.7}><Feather name="x" size={15} color="rgba(255, 255, 255, 0.6)" /></TouchableOpacity>)}
          </BlurView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {SEARCH_FILTERS.map((filter) => { const isActive = activeFilter === filter; return (<TouchableOpacity key={filter} style={[styles.filterChip, isActive && styles.filterChipActive]} activeOpacity={0.7} onPress={() => setActiveFilter(filter)}><Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{filter}</Text></TouchableOpacity>); })}
          </ScrollView>
          {!query.trim() && (<View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionTitle}>BÚSQUEDAS FRECUENTES</Text>
            <View style={styles.suggestionChips}>{POPULAR_QUERIES.map((item) => (<TouchableOpacity key={item} style={styles.suggestionChip} activeOpacity={0.7} onPress={() => setQuery(item)}><Feather name="clock" size={12} color="rgba(255, 255, 255, 0.4)" /><Text style={styles.suggestionChipText}>{item}</Text></TouchableOpacity>))}</View>
            <BlurView intensity={20} tint="dark" style={styles.hintCard}><Feather name="info" size={18} color="#0A84FF" style={{ marginRight: 10 }} /><View style={{ flex: 1 }}><Text style={styles.hintTitle}>Búsqueda inteligente</Text><Text style={styles.hintText}>Los datos provienen directamente de la base de datos Supabase. Puedes buscar por cualquier campo del dispositivo.</Text></View></BlurView>
          </View>)}
          {query.trim().length > 0 && (<View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}><Text style={styles.resultsCount}>{filteredResults.length} {filteredResults.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}</Text></View>
            {filteredResults.length === 0 ? (<BlurView intensity={20} tint="dark" style={styles.emptyCard}><Feather name="alert-circle" size={32} color="rgba(255, 255, 255, 0.3)" /><Text style={styles.emptyTitle}>Sin coincidencias</Text><Text style={styles.emptySubtitle}>No se encontró ningún equipo que coincida con "{query}".</Text></BlurView>
            ) : (<View style={styles.resultsList}>{filteredResults.map((dev) => (
              <BlurView key={dev.id} intensity={30} tint="dark" style={[styles.resultCard, { width: cardWidth }]}>
                <View style={styles.resultTop}><View style={styles.deviceIconBadge}><Feather name="cpu" size={16} color="#0A84FF" /></View><View style={{ flex: 1 }}><Text style={styles.resultName} numberOfLines={1}>{dev.name}</Text><Text style={styles.resultBrand} numberOfLines={1}>{dev.manufacturer} • {dev.location}</Text></View></View>
                <View style={styles.resultSpecs}><View style={styles.specBox}><Text style={styles.specKey}>IPv4</Text><Text style={styles.specIp} numberOfLines={1}>{dev.ipv4_address}</Text></View><View style={styles.specBox}><Text style={styles.specKey}>MAC</Text><Text style={styles.specMac} numberOfLines={1}>{dev.mac_address}</Text></View></View>
                <View style={styles.resultSubnet}><Feather name="layers" size={11} color="#BF5AF2" /><Text style={styles.resultSubnetText} numberOfLines={1}>{dev.subnet_name || 'Sin VLAN asignada'}</Text></View>
              </BlurView>))}</View>)}
          </View>)}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 45, paddingBottom: 110 },
  innerWrapper: { maxWidth: 1200, width: '100%', alignSelf: 'center' },
  header: { marginBottom: 18 },
  headerBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#FF9F0A', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 26, color: '#FFFFFF', letterSpacing: 0.3 },
  headerSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255, 255, 255, 0.45)', marginTop: 2 },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.5)', marginBottom: 14 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#FFFFFF', ...Platform.select({ web: { outlineStyle: 'none' } }) as any },
  clearBtn: { padding: 5, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 10 },
  filterRow: { gap: 8, marginBottom: 20 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 15, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  filterChipActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  filterChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.6)' },
  filterChipTextActive: { color: '#000000' },
  suggestionsContainer: { marginTop: 8 },
  suggestionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: 1, marginBottom: 10 },
  suggestionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  suggestionChipText: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.7)' },
  hintCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.2)', backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  hintTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: '#FFFFFF', marginBottom: 2 },
  hintText: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.5)', lineHeight: 17 },
  resultsContainer: { marginTop: 4 },
  resultsHeader: { marginBottom: 12 },
  resultsCount: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' },
  emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 26, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', gap: 8 },
  emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#FFFFFF' },
  emptySubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255, 255, 255, 0.45)', textAlign: 'center' },
  resultsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  resultCard: { padding: 14, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  resultTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  deviceIconBadge: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(10, 132, 255, 0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  resultName: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#FFFFFF' },
  resultBrand: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.45)' },
  resultSpecs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  specBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.04)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, gap: 5 },
  specKey: { fontFamily: 'Poppins_600SemiBold', fontSize: 9.5, color: 'rgba(255, 255, 255, 0.4)' },
  specIp: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#0A84FF', flex: 1 },
  specMac: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: '#FFFFFF', flex: 1 },
  resultSubnet: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 8, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  resultSubnetText: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#BF5AF2' },
});
