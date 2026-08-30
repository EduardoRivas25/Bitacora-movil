import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  useWindowDimensions, 
  Platform 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import GlassModal from '../../components/ui/GlassModal';
import { MOCK_DEVICES, MOCK_NETWORKS, MOCK_BUILDINGS } from '../../mock/data';
import { Device, Building } from '../../types';

const CATEGORIES = ['Todos', 'Switches', 'Routers', 'Servidores', 'Access Points', 'Workstations', 'Firewalls'];

export default function DeviceListScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [showModal, setShowModal] = useState(false);

  // Formulario
  const [devName, setDevName] = useState('');
  const [devMac, setDevMac] = useState('');
  const [devBrand, setDevBrand] = useState('');
  const [devLocation, setDevLocation] = useState('');
  const [devIp, setDevIp] = useState('');
  const [devSubnet, setDevSubnet] = useState('sub-10');
  const [devBuilding, setDevBuilding] = useState('bld-1');
  const [devDept, setDevDept] = useState('dep-101');
  const [devLat, setDevLat] = useState('19.4326');
  const [devLng, setDevLng] = useState('-99.1332');
  const [devDesc, setDevDesc] = useState('');

  const handleSelectBuilding = (bldId: string) => {
    setDevBuilding(bldId);
    const bld = MOCK_BUILDINGS.find(b => b.id === bldId);
    if (bld) {
      setDevLat(bld.latitude.toString());
      setDevLng(bld.longitude.toString());
      if (bld.departments.length > 0) {
        setDevDept(bld.departments[0].id);
        setDevLocation(`${bld.name} - ${bld.departments[0].name}`);
      }
    }
  };

  // Filtrado por categoría
  const filteredDevices = devices.filter((dev) => {
    if (selectedCategory === 'Todos') return true;
    if (selectedCategory === 'Switches') return dev.name.toLowerCase().includes('switch');
    if (selectedCategory === 'Routers') return dev.name.toLowerCase().includes('router');
    if (selectedCategory === 'Servidores') return dev.name.toLowerCase().includes('servidor') || dev.manufacturer.includes('HP');
    if (selectedCategory === 'Access Points') return dev.name.toLowerCase().includes('point') || dev.name.toLowerCase().includes('unifi');
    if (selectedCategory === 'Workstations') return dev.name.toLowerCase().includes('imac') || dev.name.toLowerCase().includes('pc');
    if (selectedCategory === 'Firewalls') return dev.name.toLowerCase().includes('firewall') || dev.name.toLowerCase().includes('fortigate');
    return true;
  });

  const handleSaveDevice = () => {
    if (!devName || !devMac || !devIp) return;

    // Buscar nombre de subred y red
    let subnetName = 'VLAN 10 - Servidores y Almacenamiento';
    let networkName = 'Red Administrativa Central';
    for (const net of MOCK_NETWORKS) {
      const foundSub = net.subnets.find(s => s.id === devSubnet);
      if (foundSub) {
        subnetName = foundSub.name;
        networkName = net.name;
        break;
      }
    }

    // Buscar edificio y departamento
    const bld = MOCK_BUILDINGS.find(b => b.id === devBuilding);
    const dept = bld?.departments.find(d => d.id === devDept);

    const newDevice: Device = {
      id: `dev-${Date.now()}`,
      name: devName,
      mac_address: devMac.toUpperCase(),
      manufacturer: devBrand || 'Genérico',
      location: devLocation || `${bld?.name || 'Edificio'} - ${dept?.name || 'General'}`,
      ipv4_address: devIp,
      subnet_id: devSubnet,
      subnet_name: subnetName,
      network_name: networkName,
      building_id: devBuilding,
      building_name: bld?.name,
      department_id: devDept,
      department_name: dept?.name,
      latitude: parseFloat(devLat) || bld?.latitude || 19.4326,
      longitude: parseFloat(devLng) || bld?.longitude || -99.1332,
      description: devDesc || 'Dispositivo registrado en inventario y mapa.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setDevices([newDevice, ...devices]);
    setShowModal(false);
    setDevName('');
    setDevMac('');
    setDevBrand('');
    setDevLocation('');
    setDevIp('');
    setDevDesc('');
  };

  const handleDeleteDevice = (id: string) => {
    setDevices(devices.filter(d => d.id !== id));
  };

  const getDeviceIcon = (name: string): keyof typeof Feather.glyphMap => {
    const lower = name.toLowerCase();
    if (lower.includes('switch')) return 'server';
    if (lower.includes('router')) return 'radio';
    if (lower.includes('servidor')) return 'hard-drive';
    if (lower.includes('point') || lower.includes('unifi')) return 'wifi';
    if (lower.includes('firewall')) return 'shield';
    if (lower.includes('imac') || lower.includes('pc')) return 'monitor';
    return 'cpu';
  };

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingHorizontal: isTablet ? '10%' : '5%' }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerBadge}>INVENTARIO DE EQUIPOS</Text>
            <Text style={styles.headerTitle}>Dispositivos</Text>
            <Text style={styles.headerSubtitle}>
              {devices.length} Equipos registrados en la infraestructura
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => setShowModal(true)}
          >
            <Feather name="plus" size={18} color="#000000" />
            <Text style={styles.addButtonText}>Nuevo Equipo</Text>
          </TouchableOpacity>
        </View>

        {/* Chips de Categoría */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                activeOpacity={0.7}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lista de Dispositivos */}
        <View style={styles.deviceList}>
          {filteredDevices.map((dev) => {
            const icon = getDeviceIcon(dev.name);

            return (
              <BlurView key={dev.id} intensity={30} tint="dark" style={styles.deviceCard}>
                {/* Cabecera del Dispositivo */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.deviceIconWrapper}>
                    <Feather name={icon} size={20} color="#0A84FF" />
                  </View>

                  <View style={styles.deviceTitleBlock}>
                    <View style={styles.titleWithStatus}>
                      <Text style={styles.deviceName}>{dev.name}</Text>
                      <View style={styles.statusDot} />
                    </View>
                    <Text style={styles.manufacturerText}>{dev.manufacturer} • {dev.location}</Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.deleteButton}
                    activeOpacity={0.7}
                    onPress={() => handleDeleteDevice(dev.id)}
                  >
                    <Feather name="trash-2" size={16} color="rgba(255, 69, 58, 0.7)" />
                  </TouchableOpacity>
                </View>

                {/* Especificaciones de Red (Badges IP / MAC / Subnet) */}
                <View style={styles.specsContainer}>
                  {/* IP Badge */}
                  <View style={styles.specBadge}>
                    <Text style={styles.specLabel}>IPv4</Text>
                    <Text style={styles.specValueIp}>{dev.ipv4_address}</Text>
                  </View>

                  {/* MAC Badge */}
                  <View style={styles.specBadge}>
                    <Text style={styles.specLabel}>MAC</Text>
                    <Text style={styles.specValueMac}>{dev.mac_address}</Text>
                  </View>
                </View>

                {/* Red y Subred Asociada */}
                <View style={styles.subnetFooter}>
                  <View style={styles.subnetTag}>
                    <Feather name="layers" size={12} color="#BF5AF2" />
                    <Text style={styles.subnetTagText} numberOfLines={1}>
                      {dev.subnet_name || 'VLAN Asignada'}
                    </Text>
                  </View>
                  <Text style={styles.networkSubtag} numberOfLines={1}>
                    {dev.network_name || 'Red Central'}
                  </Text>
                </View>
              </BlurView>
            );
          })}
        </View>

        {/* Modal Nuevo Dispositivo */}
        <GlassModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          title="Registrar Dispositivo"
          subtitle="Asocia un nuevo equipo a una subred activa"
        >
          <Text style={styles.inputLabel}>Nombre del Dispositivo *</Text>
          <TextInput
            placeholder="ej. Switch Distribución Edificio B"
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            style={styles.input}
            value={devName}
            onChangeText={setDevName}
          />

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Dirección IPv4 *</Text>
              <TextInput
                placeholder="ej. 10.0.10.20"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                style={styles.input}
                value={devIp}
                onChangeText={setDevIp}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Dirección MAC *</Text>
              <TextInput
                placeholder="AA:BB:CC:DD:EE:FF"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                autoCapitalize="characters"
                style={styles.input}
                value={devMac}
                onChangeText={setDevMac}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Fabricante / Marca</Text>
              <TextInput
                placeholder="ej. Cisco / Ubiquiti"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                style={styles.input}
                value={devBrand}
                onChangeText={setDevBrand}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Ubicación Física</Text>
              <TextInput
                placeholder="ej. Rack 02 - Piso 1"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                style={styles.input}
                value={devLocation}
                onChangeText={setDevLocation}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Edificio / Ubicación Física *</Text>
          <View style={styles.buildingSelector}>
            {MOCK_BUILDINGS.map((bld) => (
              <TouchableOpacity
                key={bld.id}
                style={[styles.buildingOption, devBuilding === bld.id && styles.buildingOptionActive]}
                onPress={() => handleSelectBuilding(bld.id)}
              >
                <Text style={[styles.buildingOptionText, devBuilding === bld.id && styles.buildingOptionTextActive]}>
                  {bld.code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Latitud GPS</Text>
              <TextInput
                placeholder="19.4326"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                style={styles.input}
                value={devLat}
                onChangeText={setDevLat}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Longitud GPS</Text>
              <TextInput
                placeholder="-99.1332"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                style={styles.input}
                value={devLng}
                onChangeText={setDevLng}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Subred de Destino</Text>
          <View style={styles.subnetSelector}>
            <TouchableOpacity 
              style={[styles.subnetOption, devSubnet === 'sub-10' && styles.subnetOptionActive]}
              onPress={() => setDevSubnet('sub-10')}
            >
              <Text style={styles.subnetOptionText}>VLAN 10 - Servidores</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.subnetOption, devSubnet === 'sub-100' && styles.subnetOptionActive]}
              onPress={() => setDevSubnet('sub-100')}
            >
              <Text style={styles.subnetOptionText}>VLAN 100 - Lab Cisco</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Descripción u Observaciones</Text>
          <TextInput
            placeholder="Rol del equipo en la red..."
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            multiline
            numberOfLines={2}
            style={[styles.input, styles.textArea]}
            value={devDesc}
            onChangeText={setDevDesc}
          />

          <TouchableOpacity 
            style={styles.modalSubmitButton}
            activeOpacity={0.8}
            onPress={handleSaveDevice}
          >
            <Text style={styles.modalSubmitButtonText}>Guardar en Inventario</Text>
          </TouchableOpacity>
        </GlassModal>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 55,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerBadge: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#30D158',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  addButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#000000',
  },
  categoriesContainer: {
    gap: 10,
    marginBottom: 20,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  categoryChipText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  categoryChipTextActive: {
    color: '#000000',
  },
  deviceList: {
    gap: 16,
  },
  deviceCard: {
    padding: 18,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  deviceIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceTitleBlock: {
    flex: 1,
  },
  titleWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#30D158',
  },
  manufacturerText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 1,
  },
  deleteButton: {
    padding: 6,
  },
  specsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  specBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  specLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  specValueIp: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#0A84FF',
  },
  specValueMac: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subnetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  subnetTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '65%',
  },
  subnetTagText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#BF5AF2',
  },
  networkSubtag: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    maxWidth: '35%',
  },
  inputLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  input: {
    fontFamily: 'Poppins_400Regular',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 14,
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }) as any,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buildingSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  buildingOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  buildingOptionActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    borderColor: '#0A84FF',
  },
  buildingOptionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  buildingOptionTextActive: {
    color: '#0A84FF',
  },
  subnetSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  subnetOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  subnetOptionActive: {
    backgroundColor: 'rgba(191, 90, 242, 0.2)',
    borderColor: '#BF5AF2',
  },
  subnetOptionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  modalSubmitButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSubmitButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#000000',
  },
});
