import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import GlassModal from '../../components/ui/GlassModal';
import * as api from '../../services/api';
import { Device, Building, Subnet } from '../../types';
import { 
  validateIPv4, 
  validateMAC, 
  formatMACInput, 
  validateGPS, 
  validateRequired 
} from '../../utils/validators';

const CATEGORIES = ['Todos', 'Switches', 'Routers', 'Servidores', 'Access Points', 'Workstations', 'Firewalls'];

export default function DeviceListScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [devices, setDevices] = useState<Device[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [subnets, setSubnets] = useState<(Subnet & { network_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Formulario Dispositivo
  const [devName, setDevName] = useState('');
  const [devMac, setDevMac] = useState('');
  const [devBrand, setDevBrand] = useState('');
  const [devLocation, setDevLocation] = useState('');
  const [devIp, setDevIp] = useState('');
  const [devSubnet, setDevSubnet] = useState('');
  const [devBuilding, setDevBuilding] = useState('');
  const [devDept, setDevDept] = useState('');
  const [devLat, setDevLat] = useState('19.4326');
  const [devLng, setDevLng] = useState('-99.1332');
  const [devDesc, setDevDesc] = useState('');
  const [modalError, setModalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Modal para Crear Edificio desde Dispositivos
  const [showNewBuildingModal, setShowNewBuildingModal] = useState(false);
  const [newBldName, setNewBldName] = useState('');
  const [newBldCode, setNewBldCode] = useState('');
  const [newBldLat, setNewBldLat] = useState('19.4326');
  const [newBldLng, setNewBldLng] = useState('-99.1332');
  const [newBldDept, setNewBldDept] = useState('');
  const [newBldError, setNewBldError] = useState('');

  // Control de bloqueo contra múltiples clics
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingBld, setIsSubmittingBld] = useState(false);

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && devices.length === 0) setLoading(true);
      const [devs, blds, subs] = await Promise.all([api.fetchDevices(isSilent), api.fetchBuildings(isSilent), api.fetchAllSubnetsFlat(isSilent)]);
      setDevices(devs); setBuildings(blds); setSubnets(subs);
      if (blds.length > 0 && !devBuilding) setDevBuilding(blds[0].id);
      if (subs.length > 0 && !devSubnet) setDevSubnet(subs[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [devBuilding, devSubnet, devices.length]);

  useFocusEffect(useCallback(() => { loadData(true); }, [loadData]));

  const handleOpenAddDevice = () => {
    setModalError('');
    setFieldErrors({});
    setShowModal(true);
  };

  const handleOpenNewBuildingModal = () => {
    setNewBldError('');
    setNewBldName('');
    setNewBldCode('');
    setNewBldLat(devLat || '19.4326');
    setNewBldLng(devLng || '-99.1332');
    setNewBldDept('');
    setShowNewBuildingModal(true);
  };

  const handleSaveNewBuilding = async () => {
    if (isSubmittingBld) return;
    setNewBldError('');
    if (!newBldName.trim() || newBldName.trim().length < 2) {
      setNewBldError('Ingresa el nombre del edificio o ubicación.');
      return;
    }
    if (!newBldCode.trim() || newBldCode.trim().length < 2) {
      setNewBldError('Ingresa un código identificador (ej. EDIF-C).');
      return;
    }
    const gpsVal = validateGPS(newBldLat, newBldLng);
    if (!gpsVal.valid) {
      setNewBldError(gpsVal.error!);
      return;
    }

    try {
      setIsSubmittingBld(true);
      const created = await api.createBuilding({
        name: newBldName.trim(),
        code: newBldCode.toUpperCase().trim(),
        latitude: parseFloat(newBldLat),
        longitude: parseFloat(newBldLng),
        department_name: newBldDept.trim() || undefined,
      });

      const updatedBlds = await api.fetchBuildings(true);
      setBuildings(updatedBlds);
      setDevBuilding(created.id);
      setDevLat(newBldLat);
      setDevLng(newBldLng);
      setDevLocation(`${newBldName.trim()}${newBldDept.trim() ? ' - ' + newBldDept.trim() : ''}`);
      setShowNewBuildingModal(false);
    } catch (err: any) {
      console.error(err);
      setNewBldError(err?.message || 'Error al guardar el edificio');
    } finally {
      setIsSubmittingBld(false);
    }
  };

  const handleSelectBuilding = (bldId: string) => {
    setDevBuilding(bldId);
    const bld = buildings.find(b => b.id === bldId);
    if (bld) { 
      setDevLat(bld.latitude.toString()); 
      setDevLng(bld.longitude.toString()); 
      if (bld.departments.length > 0) { 
        setDevDept(bld.departments[0].id); 
        setDevLocation(`${bld.name} - ${bld.departments[0].name}`); 
      } else {
        setDevLocation(bld.name);
      }
    }
  };

  const handleMacChange = (text: string) => {
    const formatted = formatMACInput(text);
    setDevMac(formatted);
    if (fieldErrors.mac) setFieldErrors(prev => ({ ...prev, mac: '' }));
  };

  const filteredDevices = devices.filter((dev) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (
      (dev.name || '').toLowerCase().includes(q) ||
      (dev.ipv4_address || '').includes(q) ||
      (dev.mac_address || '').toLowerCase().includes(q) ||
      (dev.manufacturer || '').toLowerCase().includes(q) ||
      (dev.location || '').toLowerCase().includes(q)
    );

    if (!matchesSearch) return false;
    if (selectedCategory === 'Todos') return true;
    if (selectedCategory === 'Switches') return dev.name.toLowerCase().includes('switch');
    if (selectedCategory === 'Routers') return dev.name.toLowerCase().includes('router');
    if (selectedCategory === 'Servidores') return dev.name.toLowerCase().includes('servidor') || (dev.manufacturer || '').includes('HP');
    if (selectedCategory === 'Access Points') return dev.name.toLowerCase().includes('point') || dev.name.toLowerCase().includes('unifi');
    if (selectedCategory === 'Workstations') return dev.name.toLowerCase().includes('imac') || dev.name.toLowerCase().includes('pc');
    if (selectedCategory === 'Firewalls') return dev.name.toLowerCase().includes('firewall') || dev.name.toLowerCase().includes('fortigate');
    return true;
  });

  const handleSaveDevice = async () => {
    if (isSubmitting) return;
    setModalError('');
    const errors: { [key: string]: string } = {};

    const nameVal = validateRequired(devName, 2, 'El nombre del dispositivo');
    if (!nameVal.valid) errors.name = nameVal.error!;

    const ipVal = validateIPv4(devIp);
    if (!ipVal.valid) errors.ip = ipVal.error!;

    const macVal = validateMAC(devMac);
    if (!macVal.valid) errors.mac = macVal.error!;

    if (!devSubnet) {
      errors.subnet = 'Debes seleccionar una subred de destino.';
    }

    const gpsVal = validateGPS(devLat, devLng);
    if (!gpsVal.valid) errors.gps = gpsVal.error!;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setModalError(Object.values(errors)[0]);
      return;
    }

    const bld = buildings.find(b => b.id === devBuilding);
    const dept = bld?.departments.find(d => d.id === devDept);
    try {
      setIsSubmitting(true);
      const created = await api.createDevice({
        name: devName.trim(), 
        mac_address: macVal.formatted || devMac.toUpperCase().trim(), 
        manufacturer: devBrand.trim() || 'Genérico',
        location: devLocation.trim() || `${bld?.name || 'Edificio'} - ${dept?.name || 'General'}`,
        ipv4_address: devIp.trim(), 
        subnet_id: devSubnet, 
        description: devDesc.trim() || 'Dispositivo registrado en inventario.',
        latitude: parseFloat(devLat) || bld?.latitude || 19.4326, 
        longitude: parseFloat(devLng) || bld?.longitude || -99.1332,
        building_id: devBuilding || undefined, 
        department_id: devDept || undefined,
      });
      setShowModal(false); 
      setDevName(''); 
      setDevMac(''); 
      setDevBrand(''); 
      setDevLocation(''); 
      setDevIp(''); 
      setDevDesc('');
      setModalError('');
      setFieldErrors({});
      loadData(true);
    } catch (err: any) { 
      setModalError(err?.message || 'Error al guardar el dispositivo');
      console.error(err); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    // Actualización optimista instantánea (0ms)
    const prevDevices = [...devices];
    setDevices(prev => prev.filter(d => d.id !== id));
    try {
      await api.deleteDevice(id);
    } catch (err) {
      console.error(err);
      setDevices(prevDevices);
    }
  };

  const getDeviceIcon = (name: string): keyof typeof Feather.glyphMap => {
    const lower = name.toLowerCase();
    if (lower.includes('switch')) return 'server'; if (lower.includes('router')) return 'radio';
    if (lower.includes('servidor')) return 'hard-drive'; if (lower.includes('point') || lower.includes('unifi')) return 'wifi';
    if (lower.includes('firewall')) return 'shield'; if (lower.includes('imac') || lower.includes('pc')) return 'monitor';
    return 'cpu';
  };

  const isSmallMobile = width < 380;
  const isDesktop = width >= 1024;
  const cardWidth = isDesktop ? '31.8%' : isTablet ? '48.5%' : '100%';

  if (loading && devices.length === 0) {
    return (<LinearGradient colors={['#050505', '#121212']} style={styles.container}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#0A84FF" /></View></LinearGradient>);
  }

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isDesktop ? '6%' : isTablet ? '4%' : 16 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.innerWrapper}>
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={styles.headerBadge}>INVENTARIO DE EQUIPOS</Text>
              <Text style={[styles.headerTitle, isSmallMobile && { fontSize: 22 }]}>Dispositivos</Text>
              <Text style={styles.headerSubtitle}>{devices.length} Equipos registrados en la infraestructura</Text>
            </View>
            <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={handleOpenAddDevice}>
              <Feather name="plus" size={17} color="#000000" />
              <Text style={styles.addButtonText}>Nuevo Equipo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Feather name="search" size={16} color="rgba(255, 255, 255, 0.4)" />
            <TextInput placeholder="Buscar por IP, MAC, nombre, ubicación..." placeholderTextColor="rgba(255, 255, 255, 0.3)" style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery.length > 0 && (<TouchableOpacity onPress={() => setSearchQuery('')}><Feather name="x" size={14} color="rgba(255, 255, 255, 0.4)" /></TouchableOpacity>)}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
            {CATEGORIES.map((cat) => { const isActive = selectedCategory === cat; return (<TouchableOpacity key={cat} style={[styles.categoryChip, isActive && styles.categoryChipActive]} activeOpacity={0.7} onPress={() => setSelectedCategory(cat)}><Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>{cat}</Text></TouchableOpacity>); })}
          </ScrollView>

          <View style={styles.deviceList}>
            {filteredDevices.map((dev) => { const icon = getDeviceIcon(dev.name); return (
              <BlurView key={dev.id} intensity={30} tint="dark" style={[styles.deviceCard, { width: cardWidth }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.deviceIconWrapper}><Feather name={icon} size={19} color="#0A84FF" /></View>
                  <View style={styles.deviceTitleBlock}>
                    <View style={styles.titleWithStatus}><Text style={styles.deviceName} numberOfLines={1}>{dev.name}</Text><View style={styles.statusDot} /></View>
                    <Text style={styles.manufacturerText} numberOfLines={1}>{dev.manufacturer} • {dev.location}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteButton} activeOpacity={0.7} onPress={() => handleDeleteDevice(dev.id)}>
                    <Feather name="trash-2" size={15} color="rgba(255, 69, 58, 0.7)" />
                  </TouchableOpacity>
                </View>
                <View style={styles.specsContainer}>
                  <View style={styles.specBadge}><Text style={styles.specLabel}>IPv4</Text><Text style={styles.specValueIp} numberOfLines={1}>{dev.ipv4_address}</Text></View>
                  <View style={styles.specBadge}><Text style={styles.specLabel}>MAC</Text><Text style={styles.specValueMac} numberOfLines={1}>{dev.mac_address}</Text></View>
                </View>
                <View style={styles.subnetFooter}>
                  <View style={styles.subnetTag}><Feather name="layers" size={12} color="#BF5AF2" /><Text style={styles.subnetTagText} numberOfLines={1}>{dev.subnet_name || 'VLAN Asignada'}</Text></View>
                  <Text style={styles.networkSubtag} numberOfLines={1}>{dev.network_name || 'Red Central'}</Text>
                </View>
              </BlurView>); })}
            {filteredDevices.length === 0 && <Text style={styles.emptyText}>No se encontraron dispositivos con ese criterio.</Text>}
          </View>
        </View>

        {/* Modal Registrar Nuevo Dispositivo */}
        <GlassModal visible={showModal} onClose={() => setShowModal(false)} title="Registrar Dispositivo" subtitle="Asocia un nuevo equipo a una subred activa">
          {modalError !== '' && (
            <View style={styles.modalErrorContainer}>
              <Feather name="alert-circle" size={15} color="#FF453A" />
              <Text style={styles.modalErrorText}>{modalError}</Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Nombre del Dispositivo *</Text>
          <TextInput 
            placeholder="ej. Switch Distribución Edificio B" 
            placeholderTextColor="rgba(255, 255, 255, 0.25)" 
            style={[styles.input, fieldErrors.name && styles.inputError]} 
            value={devName} 
            onChangeText={(val) => {
              setDevName(val);
              if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
            }} 
          />
          {fieldErrors.name && <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text>}
          
          <View style={[styles.formRow, isSmallMobile && { flexDirection: 'column', gap: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Dirección IPv4 *</Text>
              <TextInput 
                placeholder="ej. 10.0.10.20" 
                placeholderTextColor="rgba(255, 255, 255, 0.25)" 
                style={[styles.input, fieldErrors.ip && styles.inputError]} 
                value={devIp} 
                onChangeText={(val) => {
                  setDevIp(val);
                  if (fieldErrors.ip) setFieldErrors(prev => ({ ...prev, ip: '' }));
                }} 
              />
              {fieldErrors.ip && <Text style={styles.fieldErrorText}>{fieldErrors.ip}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Dirección MAC *</Text>
              <TextInput 
                placeholder="AA:BB:CC:DD:EE:FF" 
                placeholderTextColor="rgba(255, 255, 255, 0.25)" 
                autoCapitalize="characters"
                maxLength={17}
                style={[styles.input, fieldErrors.mac && styles.inputError]} 
                value={devMac} 
                onChangeText={handleMacChange} 
              />
              {fieldErrors.mac && <Text style={styles.fieldErrorText}>{fieldErrors.mac}</Text>}
            </View>
          </View>

          <View style={[styles.formRow, isSmallMobile && { flexDirection: 'column', gap: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Fabricante / Marca</Text>
              <TextInput placeholder="ej. Cisco / Ubiquiti" placeholderTextColor="rgba(255, 255, 255, 0.25)" style={styles.input} value={devBrand} onChangeText={setDevBrand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Ubicación Física</Text>
              <TextInput placeholder="ej. Rack 02 - Piso 1" placeholderTextColor="rgba(255, 255, 255, 0.25)" style={styles.input} value={devLocation} onChangeText={setDevLocation} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
            <Text style={styles.inputLabel}>Edificio / Ubicación Física *</Text>
            <TouchableOpacity onPress={handleOpenNewBuildingModal} activeOpacity={0.7} style={styles.addBldSmallBtn}>
              <Feather name="plus" size={12} color="#0A84FF" />
              <Text style={styles.addBldSmallBtnText}>Añadir Ubicación</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buildingSelector}>
            {buildings.map((bld) => (
              <TouchableOpacity key={bld.id} style={[styles.buildingOption, devBuilding === bld.id && styles.buildingOptionActive]} onPress={() => handleSelectBuilding(bld.id)}>
                <Text style={[styles.buildingOptionText, devBuilding === bld.id && styles.buildingOptionTextActive]}>{bld.code}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.formRow, isSmallMobile && { flexDirection: 'column', gap: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Latitud GPS</Text>
              <TextInput 
                placeholder="19.4326" 
                placeholderTextColor="rgba(255, 255, 255, 0.25)" 
                style={[styles.input, fieldErrors.gps && styles.inputError]} 
                value={devLat} 
                onChangeText={(val) => {
                  setDevLat(val);
                  if (fieldErrors.gps) setFieldErrors(prev => ({ ...prev, gps: '' }));
                }} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Longitud GPS</Text>
              <TextInput 
                placeholder="-99.1332" 
                placeholderTextColor="rgba(255, 255, 255, 0.25)" 
                style={[styles.input, fieldErrors.gps && styles.inputError]} 
                value={devLng} 
                onChangeText={(val) => {
                  setDevLng(val);
                  if (fieldErrors.gps) setFieldErrors(prev => ({ ...prev, gps: '' }));
                }} 
              />
            </View>
          </View>
          {fieldErrors.gps && <Text style={styles.fieldErrorText}>{fieldErrors.gps}</Text>}

          <Text style={styles.inputLabel}>Subred de Destino *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {subnets.map((sub) => (
              <TouchableOpacity key={sub.id} style={[styles.subnetOption, devSubnet === sub.id && styles.subnetOptionActive]} onPress={() => setDevSubnet(sub.id)}>
                <Text style={styles.subnetOptionText} numberOfLines={1}>{sub.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.inputLabel}>Descripción u Observaciones</Text>
          <TextInput placeholder="Rol del equipo en la red..." placeholderTextColor="rgba(255, 255, 255, 0.25)" multiline numberOfLines={2} style={[styles.input, styles.textArea]} value={devDesc} onChangeText={setDevDesc} />

          <TouchableOpacity 
            style={[styles.modalSubmitButton, isSubmitting && { opacity: 0.6 }]} 
            disabled={isSubmitting} 
            activeOpacity={0.8} 
            onPress={handleSaveDevice}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.modalSubmitButtonText}>Guardar en Inventario</Text>
            )}
          </TouchableOpacity>
        </GlassModal>

        {/* Modal Rápido para Crear Edificio desde Dispositivos */}
        <GlassModal 
          visible={showNewBuildingModal} 
          onClose={() => setShowNewBuildingModal(false)} 
          title="Nueva Ubicación Física" 
          subtitle="Registra un edificio con coordenadas GPS"
        >
          {newBldError !== '' && (
            <View style={styles.modalErrorContainer}>
              <Feather name="alert-circle" size={15} color="#FF453A" />
              <Text style={styles.modalErrorText}>{newBldError}</Text>
            </View>
          )}
          <Text style={styles.inputLabel}>Nombre del Edificio *</Text>
          <TextInput placeholder="ej. Edificio D" placeholderTextColor="rgba(255, 255, 255, 0.25)" style={styles.input} value={newBldName} onChangeText={setNewBldName} />
          
          <Text style={styles.inputLabel}>Código Corto *</Text>
          <TextInput placeholder="ej. EDIF-D" placeholderTextColor="rgba(255, 255, 255, 0.25)" autoCapitalize="characters" style={styles.input} value={newBldCode} onChangeText={setNewBldCode} />
          
          <View style={[styles.formRow, isSmallMobile && { flexDirection: 'column', gap: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Latitud *</Text>
              <TextInput placeholder="19.4326" placeholderTextColor="rgba(255, 255, 255, 0.25)" style={styles.input} value={newBldLat} onChangeText={setNewBldLat} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Longitud *</Text>
              <TextInput placeholder="-99.1332" placeholderTextColor="rgba(255, 255, 255, 0.25)" style={styles.input} value={newBldLng} onChangeText={setNewBldLng} />
            </View>
          </View>

          <Text style={styles.inputLabel}>Departamento / Área Inicial</Text>
          <TextInput placeholder="ej. Sala de Racks" placeholderTextColor="rgba(255, 255, 255, 0.25)" style={styles.input} value={newBldDept} onChangeText={setNewBldDept} />

          <TouchableOpacity 
            style={[styles.modalSubmitButton, isSubmittingBld && { opacity: 0.6 }]} 
            disabled={isSubmittingBld} 
            activeOpacity={0.8} 
            onPress={handleSaveNewBuilding}
          >
            {isSubmittingBld ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.modalSubmitButtonText}>Guardar Ubicación</Text>
            )}
          </TouchableOpacity>
        </GlassModal>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 45, paddingBottom: 110 },
  innerWrapper: { maxWidth: 1200, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 },
  headerBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#30D158', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 26, color: '#FFFFFF', letterSpacing: 0.3 },
  headerSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255, 255, 255, 0.45)', marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, gap: 5 },
  addButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: '#000000' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, gap: 10 },
  searchInput: { flex: 1, fontFamily: 'Poppins_400Regular', color: '#FFFFFF', fontSize: 13, ...Platform.select({ web: { outlineStyle: 'none' } }) as any },
  categoriesContainer: { gap: 8, marginBottom: 18, paddingVertical: 4 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  categoryChipActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  categoryChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.7)' },
  categoryChipTextActive: { color: '#000000' },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic', paddingVertical: 16, textAlign: 'center', width: '100%' },
  deviceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  deviceCard: { padding: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  deviceIconWrapper: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(10, 132, 255, 0.12)', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  deviceTitleBlock: { flex: 1 },
  titleWithStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deviceName: { fontFamily: 'Poppins_700Bold', fontSize: 14.5, color: '#FFFFFF' },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#30D158' },
  manufacturerText: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.45)', marginTop: 1 },
  deleteButton: { padding: 5 },
  specsContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  specBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, gap: 6 },
  specLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 9.5, color: 'rgba(255, 255, 255, 0.4)' },
  specValueIp: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: '#0A84FF', flex: 1 },
  specValueMac: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: '#FFFFFF', letterSpacing: 0.5, flex: 1 },
  subnetFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  subnetTag: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '65%' },
  subnetTagText: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: '#BF5AF2' },
  networkSubtag: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: 'rgba(255, 255, 255, 0.35)', maxWidth: '35%' },
  inputLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 5 },
  input: { fontFamily: 'Poppins_400Regular', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 13, padding: 12, color: '#FFFFFF', fontSize: 13.5, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) as any },
  inputError: { borderColor: '#FF453A', backgroundColor: 'rgba(255, 69, 58, 0.06)' },
  fieldErrorText: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: '#FF453A', marginTop: -8, marginBottom: 10, marginLeft: 4 },
  modalErrorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 69, 58, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.3)', borderRadius: 11, padding: 10, marginBottom: 14, gap: 8 },
  modalErrorText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#FF453A', flex: 1 },
  formRow: { flexDirection: 'row', gap: 10 },
  buildingSelector: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  addBldSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 4 },
  addBldSmallBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#0A84FF' },
  buildingOption: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 9, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center' },
  buildingOptionActive: { backgroundColor: 'rgba(10, 132, 255, 0.2)', borderColor: '#0A84FF' },
  buildingOptionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: 'rgba(255, 255, 255, 0.6)' },
  buildingOptionTextActive: { color: '#0A84FF' },
  subnetOption: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 9, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', marginRight: 6 },
  subnetOptionActive: { backgroundColor: 'rgba(191, 90, 242, 0.2)', borderColor: '#BF5AF2' },
  subnetOptionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#FFFFFF' },
  textArea: { height: 55, textAlignVertical: 'top' },
  modalSubmitButton: { backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: 13, alignItems: 'center', marginTop: 8 },
  modalSubmitButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: '#000000' },
});
