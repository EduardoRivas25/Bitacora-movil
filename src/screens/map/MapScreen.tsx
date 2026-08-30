import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  useWindowDimensions, 
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Map } from '../../components/ui/map';
import GlassModal from '../../components/ui/GlassModal';
import * as api from '../../services/api';
import { Device, Building } from '../../types';
import { validateGPS, validateRequired } from '../../utils/validators';

export default function MapScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [devices, setDevices] = useState<Device[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [activeTab, setActiveTab] = useState<'devices' | 'buildings'>('devices');
  const [loading, setLoading] = useState(true);

  // Modal Nuevo Edificio
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [bldName, setBldName] = useState('');
  const [bldCode, setBldCode] = useState('');
  const [bldLat, setBldLat] = useState('19.4326');
  const [bldLng, setBldLng] = useState('-99.1332');
  const [bldDeptName, setBldDeptName] = useState('');
  const [bldDeptFloor, setBldDeptFloor] = useState('Planta Baja');
  const [bldDesc, setBldDesc] = useState('');
  const [bldError, setBldError] = useState('');
  const [bldFieldErrors, setBldFieldErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && devices.length === 0 && buildings.length === 0) setLoading(true);
      const [devs, blds] = await Promise.all([api.fetchDevices(isSilent), api.fetchBuildings(isSilent)]);
      setDevices(devs);
      setBuildings(blds);
    } catch (err) {
      console.error('Error cargando datos para mapa:', err);
    } finally {
      setLoading(false);
    }
  }, [devices.length, buildings.length]);

  useFocusEffect(useCallback(() => { loadData(true); }, [loadData]));

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

  const handleOpenAddBuilding = () => {
    setBldError('');
    setBldFieldErrors({});
    setShowBuildingModal(true);
  };

  const handleSaveBuilding = async () => {
    if (isSubmitting) return;
    setBldError('');
    const errors: { [key: string]: string } = {};

    const nameVal = validateRequired(bldName, 2, 'El nombre del edificio');
    if (!nameVal.valid) errors.name = nameVal.error!;

    const codeVal = validateRequired(bldCode, 2, 'El código');
    if (!codeVal.valid) errors.code = codeVal.error!;

    const gpsVal = validateGPS(bldLat, bldLng);
    if (!gpsVal.valid) errors.gps = gpsVal.error!;

    setBldFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setBldError(Object.values(errors)[0]);
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createBuilding({
        name: bldName.trim(),
        code: bldCode.toUpperCase().trim(),
        latitude: parseFloat(bldLat),
        longitude: parseFloat(bldLng),
        description: bldDesc.trim(),
        department_name: bldDeptName.trim() || undefined,
        department_floor: bldDeptFloor.trim() || 'Planta Baja',
      });

      setShowBuildingModal(false);
      setBldName('');
      setBldCode('');
      setBldDesc('');
      setBldDeptName('');
      setBldDeptFloor('Planta Baja');
      setBldError('');
      setBldFieldErrors({});
      loadData(true);
    } catch (err: any) {
      console.error(err);
      setBldError(err?.message || 'Error al registrar el edificio');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBuilding = async (id: string, name: string) => {
    // Actualización optimista instantánea (0ms)
    const prevBuildings = [...buildings];
    setBuildings(prev => prev.filter(b => b.id !== id));
    if (selectedBuilding?.id === id) setSelectedBuilding(null);
    try {
      await api.deleteBuilding(id);
    } catch (err: any) {
      console.error(err);
      setBuildings(prevBuildings);
      Alert.alert('Error', err?.message || 'No se pudo eliminar el edificio');
    }
  };

  if (loading && devices.length === 0 && buildings.length === 0) {
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
        <View style={styles.headerActions}>
          {(selectedBuilding || selectedDevice) && (
            <TouchableOpacity 
              style={styles.resetViewBtn} 
              activeOpacity={0.8} 
              onPress={() => {
                setSelectedBuilding(null);
                setSelectedDevice(null);
              }}
            >
              <Feather name="maximize-2" size={13} color="#0A84FF" />
              <Text style={styles.resetViewBtnText}>Ver Todos</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addBuildingBtn} activeOpacity={0.8} onPress={handleOpenAddBuilding}>
            <Feather name="plus" size={14} color="#000000" />
            <Text style={styles.addBuildingBtnText}>Nuevo Edificio</Text>
          </TouchableOpacity>
          <View style={styles.counterBadge}>
            <Feather name="map-pin" size={13} color="#0A84FF" />
            <Text style={styles.counterText}>{mappedCount} equipos • {buildings.length} ubicaciones</Text>
          </View>
        </View>
      </View>

      <View style={[styles.mainLayout, isTablet && styles.mainLayoutTablet]}>
        <View style={[styles.mapContainer, isTablet && styles.mapContainerTablet]}>
          <Map
            center={
              selectedBuilding
                ? [selectedBuilding.latitude, selectedBuilding.longitude]
                : (selectedDevice?.latitude && selectedDevice?.longitude)
                  ? [selectedDevice.latitude, selectedDevice.longitude]
                  : undefined
            }
            zoom={selectedBuilding || selectedDevice ? 18 : 16}
            devices={devices}
            buildings={buildings}
            selectedDeviceId={selectedDevice?.id}
            onSelectDevice={(d) => {
              setSelectedDevice(d);
              setSelectedBuilding(null);
            }}
            height="100%"
          />
        </View>

        <View style={[styles.sidePanel, isTablet && styles.sidePanelTablet]}>
          {/* Selector de Pestañas en Panel Lateral */}
          <View style={styles.tabSelector}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'devices' && styles.tabButtonActive]}
              onPress={() => setActiveTab('devices')}
              activeOpacity={0.7}
            >
              <Feather name="cpu" size={13} color={activeTab === 'devices' ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} />
              <Text style={[styles.tabButtonText, activeTab === 'devices' && styles.tabButtonTextActive]}>
                Equipos ({devices.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'buildings' && styles.tabButtonActive]}
              onPress={() => setActiveTab('buildings')}
              activeOpacity={0.7}
            >
              <Feather name="home" size={13} color={activeTab === 'buildings' ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} />
              <Text style={[styles.tabButtonText, activeTab === 'buildings' && styles.tabButtonTextActive]}>
                Edificios ({buildings.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Dispositivos */}
          {activeTab === 'devices' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {devices.map((dev) => {
                const isSelected = selectedDevice?.id === dev.id;
                const color = getDeviceColor(dev.name);
                return (
                  <TouchableOpacity
                    key={dev.id}
                    style={[styles.deviceItem, isSelected && styles.deviceItemActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedDevice(dev);
                      setSelectedBuilding(null);
                    }}
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
          )}

          {/* Lista de Edificios / Ubicaciones */}
          {activeTab === 'buildings' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {buildings.map((bld) => {
                const isSelected = selectedBuilding?.id === bld.id;
                return (
                  <TouchableOpacity
                    key={bld.id}
                    style={[styles.buildingCardItem, isSelected && styles.buildingCardItemActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedBuilding(bld);
                      setSelectedDevice(null);
                    }}
                  >
                    <View style={styles.bldTop}>
                      <View style={styles.bldBadge}>
                        <Text style={styles.bldBadgeText}>{bld.code}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.deleteBldBtn} 
                        onPress={() => handleDeleteBuilding(bld.id, bld.name)}
                        activeOpacity={0.7}
                      >
                        <Feather name="trash-2" size={13} color="#FF453A" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.bldName} numberOfLines={1}>{bld.name}</Text>
                    <Text style={styles.bldGps}>GPS: {bld.latitude.toFixed(4)}, {bld.longitude.toFixed(4)}</Text>
                    {bld.departments && bld.departments.length > 0 && (
                      <View style={styles.deptRow}>
                        <Feather name="layers" size={11} color="#BF5AF2" />
                        <Text style={styles.deptText} numberOfLines={1}>
                          {bld.departments.map(d => d.name).join(', ')}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {buildings.length === 0 && (
                <Text style={styles.emptyText}>No hay edificios registrados aún.</Text>
              )}
            </ScrollView>
          )}

          {/* Tarjeta de Detalles del Dispositivo Seleccionado */}
          {activeTab === 'devices' && selectedDevice && (
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

      {/* Modal Crear Nuevo Edificio */}
      <GlassModal 
        visible={showBuildingModal} 
        onClose={() => setShowBuildingModal(false)} 
        title="Registrar Edificio / Ubicación" 
        subtitle="Agrega un punto de infraestructura con coordenadas GPS"
      >
        {bldError !== '' && (
          <View style={styles.modalErrorContainer}>
            <Feather name="alert-circle" size={15} color="#FF453A" />
            <Text style={styles.modalErrorText}>{bldError}</Text>
          </View>
        )}

        <Text style={styles.inputLabel}>Nombre del Edificio / Pabellón *</Text>
        <TextInput 
          placeholder="ej. Edificio C - Ingenierías y Cómputo" 
          placeholderTextColor="rgba(255, 255, 255, 0.25)" 
          style={[styles.input, bldFieldErrors.name && styles.inputError]} 
          value={bldName} 
          onChangeText={(val) => {
            setBldName(val);
            if (bldFieldErrors.name) setBldFieldErrors(prev => ({ ...prev, name: '' }));
          }} 
        />
        {bldFieldErrors.name && <Text style={styles.fieldErrorText}>{bldFieldErrors.name}</Text>}

        <Text style={styles.inputLabel}>Código Corto *</Text>
        <TextInput 
          placeholder="ej. EDIF-C" 
          placeholderTextColor="rgba(255, 255, 255, 0.25)" 
          autoCapitalize="characters"
          style={[styles.input, bldFieldErrors.code && styles.inputError]} 
          value={bldCode} 
          onChangeText={(val) => {
            setBldCode(val);
            if (bldFieldErrors.code) setBldFieldErrors(prev => ({ ...prev, code: '' }));
          }} 
        />
        {bldFieldErrors.code && <Text style={styles.fieldErrorText}>{bldFieldErrors.code}</Text>}

        <View style={styles.formRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Latitud GPS *</Text>
            <TextInput 
              placeholder="19.4326" 
              placeholderTextColor="rgba(255, 255, 255, 0.25)" 
              style={[styles.input, bldFieldErrors.gps && styles.inputError]} 
              value={bldLat} 
              onChangeText={(val) => {
                setBldLat(val);
                if (bldFieldErrors.gps) setBldFieldErrors(prev => ({ ...prev, gps: '' }));
              }} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Longitud GPS *</Text>
            <TextInput 
              placeholder="-99.1332" 
              placeholderTextColor="rgba(255, 255, 255, 0.25)" 
              style={[styles.input, bldFieldErrors.gps && styles.inputError]} 
              value={bldLng} 
              onChangeText={(val) => {
                setBldLng(val);
                if (bldFieldErrors.gps) setBldFieldErrors(prev => ({ ...prev, gps: '' }));
              }} 
            />
          </View>
        </View>
        {bldFieldErrors.gps && <Text style={styles.fieldErrorText}>{bldFieldErrors.gps}</Text>}

        <View style={styles.formRow}>
          <View style={{ flex: 2 }}>
            <Text style={styles.inputLabel}>Departamento / Área Inicial</Text>
            <TextInput 
              placeholder="ej. Laboratorio de Redes y Telecom" 
              placeholderTextColor="rgba(255, 255, 255, 0.25)" 
              style={styles.input} 
              value={bldDeptName} 
              onChangeText={setBldDeptName} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Piso / Nivel</Text>
            <TextInput 
              placeholder="Piso 1" 
              placeholderTextColor="rgba(255, 255, 255, 0.25)" 
              style={styles.input} 
              value={bldDeptFloor} 
              onChangeText={setBldDeptFloor} 
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>Descripción u Observaciones</Text>
        <TextInput 
          placeholder="Uso del edificio, racks o infraestructura ubicada aquí..." 
          placeholderTextColor="rgba(255, 255, 255, 0.25)" 
          multiline 
          numberOfLines={2} 
          style={[styles.input, styles.textArea]} 
          value={bldDesc} 
          onChangeText={setBldDesc} 
        />

        <TouchableOpacity 
          style={[styles.modalSubmitButton, isSubmitting && { opacity: 0.6 }]} 
          disabled={isSubmitting} 
          activeOpacity={0.8} 
          onPress={handleSaveBuilding}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.modalSubmitButtonText}>Guardar Edificio en Mapa</Text>
          )}
        </TouchableOpacity>
      </GlassModal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: '5%', paddingTop: 45, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#30D158', letterSpacing: 1.5 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#FFFFFF', lineHeight: 28 },
  headerActions: { alignItems: 'flex-end', gap: 6, flexDirection: 'row' },
  resetViewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10, 132, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.35)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 5 },
  resetViewBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#0A84FF' },
  addBuildingBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, gap: 5 },
  addBuildingBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#000000' },
  counterBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(10, 132, 255, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.25)' },
  counterText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#0A84FF' },
  mainLayout: { flex: 1, flexDirection: 'column', padding: 10 },
  mainLayoutTablet: { flexDirection: 'row', paddingHorizontal: '3%' },
  mapContainer: { flex: 1, borderRadius: 16, overflow: 'hidden', minHeight: 350, marginBottom: 10 },
  mapContainerTablet: { flex: 3, marginBottom: 0, marginRight: 12 },
  sidePanel: { flex: 1, maxHeight: 340 },
  sidePanelTablet: { flex: 1, maxHeight: undefined },
  tabSelector: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, padding: 3, marginBottom: 10, gap: 4 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 9 },
  tabButtonActive: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  tabButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: 'rgba(255, 255, 255, 0.45)' },
  tabButtonTextActive: { color: '#FFFFFF' },
  deviceItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.04)', marginBottom: 6 },
  deviceItemActive: { borderColor: '#0A84FF', backgroundColor: 'rgba(10, 132, 255, 0.1)' },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  deviceInfo: { flex: 1 },
  deviceName: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#FFFFFF' },
  deviceIp: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: 'rgba(255, 255, 255, 0.5)' },
  buildingCardItem: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', marginBottom: 8 },
  buildingCardItemActive: { borderColor: '#30D158', backgroundColor: 'rgba(48, 209, 88, 0.08)' },
  bldTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  bldBadge: { backgroundColor: 'rgba(10, 132, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  bldBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#0A84FF' },
  deleteBldBtn: { padding: 4 },
  bldName: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#FFFFFF', marginBottom: 2 },
  bldGps: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: 'rgba(255, 255, 255, 0.45)', marginBottom: 4 },
  deptRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  deptText: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: '#BF5AF2', flex: 1 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic', paddingVertical: 14, textAlign: 'center' },
  detailCard: { padding: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)', marginTop: 10 },
  detailName: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#FFFFFF', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: 'rgba(255, 255, 255, 0.4)' },
  detailValue: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#FFFFFF' },
  inputLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 6 },
  input: { fontFamily: 'Poppins_400Regular', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 14, padding: 14, color: '#FFFFFF', fontSize: 14, marginBottom: 14, ...Platform.select({ web: { outlineStyle: 'none' } }) as any },
  inputError: { borderColor: '#FF453A', backgroundColor: 'rgba(255, 69, 58, 0.06)' },
  fieldErrorText: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#FF453A', marginTop: -10, marginBottom: 12, marginLeft: 4 },
  modalErrorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 69, 58, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.3)', borderRadius: 12, padding: 12, marginBottom: 16, gap: 8 },
  modalErrorText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#FF453A', flex: 1 },
  formRow: { flexDirection: 'row', gap: 12 },
  textArea: { height: 60, textAlignVertical: 'top' },
  modalSubmitButton: { backgroundColor: '#FFFFFF', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  modalSubmitButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#000000' },
});
