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
import { Map } from '../../components/ui/map';
import GlassModal from '../../components/ui/GlassModal';
import { MOCK_DEVICES, MOCK_BUILDINGS } from '../../mock/data';
import { Device, Building } from '../../types';

export default function MapScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);
  const [buildings, setBuildings] = useState<Building[]>(MOCK_BUILDINGS);
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string>('all');
  
  // Modales
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Formulario Edificio
  const [bldName, setBldName] = useState('');
  const [bldCode, setBldCode] = useState('');
  const [bldLat, setBldLat] = useState('19.4330');
  const [bldLng, setBldLng] = useState('-99.1325');
  const [bldDesc, setBldDesc] = useState('');
  const [depName, setDepName] = useState('');
  const [depFloor, setDepFloor] = useState('Piso 1');

  // Filtrado de dispositivos según edificio seleccionado
  const visibleDevices = devices.filter(d => {
    if (selectedBuildingFilter === 'all') return true;
    return d.building_id === selectedBuildingFilter;
  });

  const handleSaveBuilding = () => {
    if (!bldName || !bldCode) return;

    const newBuilding: Building = {
      id: `bld-${Date.now()}`,
      name: bldName,
      code: bldCode.toUpperCase(),
      latitude: parseFloat(bldLat) || 19.4326,
      longitude: parseFloat(bldLng) || -99.1332,
      description: bldDesc || 'Nuevo edificio agregado a la infraestructura.',
      departments: depName ? [
        {
          id: `dep-${Date.now()}`,
          building_id: `bld-${Date.now()}`,
          name: depName,
          floor: depFloor || 'Planta Baja',
        }
      ] : [],
    };

    setBuildings([...buildings, newBuilding]);
    setShowBuildingModal(false);
    setBldName('');
    setBldCode('');
    setBldDesc('');
    setDepName('');
  };

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingHorizontal: isTablet ? '8%' : '4%' }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerBadge}>GEOLOCALIZACIÓN Y CROQUIS</Text>
            <Text style={styles.headerTitle}>Mapa de Infraestructura</Text>
            <Text style={styles.headerSubtitle}>
              {visibleDevices.length} Equipos georreferenciados en {buildings.length} Edificios
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => setShowBuildingModal(true)}
          >
            <Feather name="plus" size={16} color="#000000" />
            <Text style={styles.addButtonText}>Nuevo Edificio</Text>
          </TouchableOpacity>
        </View>

        {/* Filtros por Edificio */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.buildingChips}
        >
          <TouchableOpacity
            style={[styles.chip, selectedBuildingFilter === 'all' && styles.chipActive]}
            activeOpacity={0.7}
            onPress={() => setSelectedBuildingFilter('all')}
          >
            <Text style={[styles.chipText, selectedBuildingFilter === 'all' && styles.chipTextActive]}>
              Todos los Edificios ({devices.length})
            </Text>
          </TouchableOpacity>

          {buildings.map((bld) => {
            const count = devices.filter(d => d.building_id === bld.id).length;
            const isActive = selectedBuildingFilter === bld.id;
            return (
              <TouchableOpacity
                key={bld.id}
                style={[styles.chip, isActive && styles.chipActive]}
                activeOpacity={0.7}
                onPress={() => setSelectedBuildingFilter(bld.id)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {bld.code} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Contenedor del Mapa */}
        <View style={styles.mapCardWrapper}>
          <Map 
            center={[-99.1332, 19.4326]}
            zoom={16}
            devices={visibleDevices}
            buildings={buildings}
            height={420}
          />
        </View>

        {/* Resumen de Edificios y Departamentos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Edificios y Departamentos Registrados</Text>
        </View>

        <View style={styles.buildingsGrid}>
          {buildings.map((bld) => {
            const bldDevices = devices.filter(d => d.building_id === bld.id);

            return (
              <BlurView key={bld.id} intensity={30} tint="dark" style={styles.buildingCard}>
                <View style={styles.buildingCardHeader}>
                  <View style={styles.buildingIconBadge}>
                    <Feather name="layers" size={18} color="#0A84FF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.buildingName}>{bld.name}</Text>
                    <Text style={styles.buildingCoords}>Lat: {bld.latitude.toFixed(4)}, Lng: {bld.longitude.toFixed(4)}</Text>
                  </View>
                  <View style={styles.deviceCountPill}>
                    <Text style={styles.deviceCountText}>{bldDevices.length} Equipos</Text>
                  </View>
                </View>

                <Text style={styles.buildingDesc}>{bld.description}</Text>

                {/* Lista de Departamentos */}
                <View style={styles.deptList}>
                  <Text style={styles.deptHeaderTitle}>DEPARTAMENTOS / PISOS</Text>
                  {bld.departments.map((dept) => (
                    <View key={dept.id} style={styles.deptItem}>
                      <Feather name="folder" size={12} color="#BF5AF2" style={{ marginRight: 6 }} />
                      <Text style={styles.deptName}>{dept.name}</Text>
                      <Text style={styles.deptFloor}>{dept.floor}</Text>
                    </View>
                  ))}
                </View>
              </BlurView>
            );
          })}
        </View>

        {/* Modal Crear Edificio / Departamento */}
        <GlassModal
          visible={showBuildingModal}
          onClose={() => setShowBuildingModal(false)}
          title="Crear Edificio / Ubicación"
          subtitle="Agrega una nueva ubicación física con coordenadas GPS"
        >
          <Text style={styles.inputLabel}>Nombre del Edificio / Sede *</Text>
          <TextInput
            placeholder="ej. Edificio D - Centro de Cómputo"
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            style={styles.input}
            value={bldName}
            onChangeText={setBldName}
          />

          <Text style={styles.inputLabel}>Código / Identificador *</Text>
          <TextInput
            placeholder="ej. EDIF-D"
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            autoCapitalize="characters"
            style={styles.input}
            value={bldCode}
            onChangeText={setBldCode}
          />

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Latitud GPS</Text>
              <TextInput
                placeholder="19.4326"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                style={styles.input}
                value={bldLat}
                onChangeText={setBldLat}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Longitud GPS</Text>
              <TextInput
                placeholder="-99.1332"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                style={styles.input}
                value={bldLng}
                onChangeText={setBldLng}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Departamento / Área Inicial</Text>
          <TextInput
            placeholder="ej. Sala de Servidores Principal"
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            style={styles.input}
            value={depName}
            onChangeText={setDepName}
          />

          <Text style={styles.inputLabel}>Piso / Nivel</Text>
          <TextInput
            placeholder="ej. Planta Baja / Piso 2"
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            style={styles.input}
            value={depFloor}
            onChangeText={setDepFloor}
          />

          <Text style={styles.inputLabel}>Descripción u Observaciones</Text>
          <TextInput
            placeholder="Detalles sobre el acceso o infraestructura del edificio..."
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            multiline
            numberOfLines={2}
            style={[styles.input, styles.textArea]}
            value={bldDesc}
            onChangeText={setBldDesc}
          />

          <TouchableOpacity 
            style={styles.modalSubmitButton}
            activeOpacity={0.8}
            onPress={handleSaveBuilding}
          >
            <Text style={styles.modalSubmitButtonText}>Guardar Edificio en Mapa</Text>
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
    paddingTop: 50,
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
    color: '#0A84FF',
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#000000',
  },
  buildingChips: {
    gap: 8,
    marginBottom: 20,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  chipText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  chipTextActive: {
    color: '#000000',
  },
  mapCardWrapper: {
    marginBottom: 28,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  buildingsGrid: {
    gap: 16,
  },
  buildingCard: {
    padding: 18,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  buildingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  buildingIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildingName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  buildingCoords: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  deviceCountPill: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deviceCountText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#30D158',
  },
  buildingDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 14,
  },
  deptList: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  deptHeaderTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 1,
    marginBottom: 2,
  },
  deptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  deptName: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#FFFFFF',
  },
  deptFloor: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
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
