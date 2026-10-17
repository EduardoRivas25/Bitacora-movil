import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, useWindowDimensions, Platform, ActivityIndicator 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import GlassModal from '../../components/ui/GlassModal';
import { useTheme, type ThemeColors } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { Device, Building, Subnet, Incident, Maintenance, DeviceConfig } from '../../types';
import { 
  validateIPv4, validateMAC, formatMACInput, 
  validateGPS, validateRequired 
} from '../../utils/validators';
import { canManageDevices, isAdministrator } from '../../utils/permissions';
import { confirmDestructiveAction, showUserNotice } from '../../utils/destructiveConfirmation';

const CATEGORIES = ['Todos', 'Switches', 'Routers', 'Servidores', 'Access Points', 'Workstations', 'Firewalls'];
const DEVICE_SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'name_asc', label: 'Nombre A-Z' },
  { value: 'name_desc', label: 'Nombre Z-A' },
  { value: 'ip_asc', label: 'Dirección IP' },
] as const;

type DeviceSortOption = typeof DEVICE_SORT_OPTIONS[number]['value'];

export default function DeviceListScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const canEditDevices = canManageDevices(user);
  const canDeleteRecords = isAdministrator(user);
  const canManageBuildings = isAdministrator(user);
  const isTablet = width > 768;
  const isSmallMobile = width < 380;
  const isDesktop = width >= 1024;
  const cardWidth = isDesktop ? '31.8%' : isTablet ? '48.5%' : '100%';

  const [devices, setDevices] = useState<Device[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [subnets, setSubnets] = useState<(Subnet & { network_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedSubnet, setSelectedSubnet] = useState('');
  const [sortOrder, setSortOrder] = useState<DeviceSortOption>('newest');
  const [showModal, setShowModal] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [detailDevice, setDetailDevice] = useState<Device | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [deviceIncidents, setDeviceIncidents] = useState<Incident[]>([]);
  const [deviceMaintenances, setDeviceMaintenances] = useState<Maintenance[]>([]);
  const [deviceConfigs, setDeviceConfigs] = useState<DeviceConfig[]>([]);

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

  // Modal Nuevo Edificio
  const [showNewBuildingModal, setShowNewBuildingModal] = useState(false);
  const [newBldName, setNewBldName] = useState('');
  const [newBldCode, setNewBldCode] = useState('');
  const [newBldLat, setNewBldLat] = useState('19.4326');
  const [newBldLng, setNewBldLng] = useState('-99.1332');
  const [newBldDept, setNewBldDept] = useState('');
  const [newBldError, setNewBldError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingBld, setIsSubmittingBld] = useState(false);

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && devices.length === 0) setLoading(true);
      const [devs, blds, subs] = await Promise.all([
        api.fetchDevices(isSilent), 
        api.fetchBuildings(isSilent), 
        api.fetchAllSubnetsFlat(isSilent)
      ]);
      setDevices(devs); 
      setBuildings(blds); 
      setSubnets(subs);
      
      if (blds.length > 0 && !devBuilding) setDevBuilding(blds[0].id);
      if (subs.length > 0 && !devSubnet) setDevSubnet(subs[0].id);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  }, [devBuilding, devSubnet, devices.length]);

  useFocusEffect(useCallback(() => { loadData(true); }, [loadData]));

  const loadDeviceDetails = async (device: Device) => {
    setDetailDevice(device);
    setDetailLoading(true);
    setDetailError('');
    try {
      const [incidents, maintenances, configs] = await Promise.all([
        api.fetchIncidents(),
        api.fetchMaintenances(),
        api.fetchConfigs(),
      ]);
      const normalizedName = device.name.trim().toLocaleLowerCase();
      setDeviceIncidents(incidents.filter(incident =>
        incident.device_id === device.id ||
        incident.affected_devices?.some(affectedDevice => affectedDevice.id === device.id),
      ));
      setDeviceMaintenances(maintenances.filter(maintenance => {
        if (maintenance.device_id) return maintenance.device_id === device.id;
        return (maintenance.device_name || '').trim().toLocaleLowerCase() === normalizedName &&
          (!maintenance.location || !device.location ||
            maintenance.location.trim().toLocaleLowerCase() === device.location.trim().toLocaleLowerCase());
      }));
      setDeviceConfigs(configs.filter(config => config.device_id === device.id));
    } catch (error) {
      console.error('No se pudieron cargar los datos relacionados del dispositivo:', error);
      setDetailError('No se pudo cargar toda la información relacionada. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDeviceDetails = () => {
    setDetailDevice(null);
    setDetailError('');
  };

  const handleOpenAddDevice = () => {
    setEditingDeviceId(null);
    setDevName(''); setDevMac(''); setDevBrand(''); setDevLocation('');
    setDevIp(''); setDevDesc(''); setModalError(''); setFieldErrors({});
    setShowModal(true);
  };

  const handleOpenEditDevice = (device: Device) => {
    setEditingDeviceId(device.id);
    setDevName(device.name);
    setDevMac(device.mac_address);
    setDevBrand(device.manufacturer || '');
    setDevLocation(device.location || '');
    setDevIp(device.ipv4_address);
    setDevSubnet(device.subnet_id);
    setDevBuilding(device.building_id || '');
    setDevDept(device.department_id || '');
    setDevLat(String(device.latitude ?? 19.4326));
    setDevLng(String(device.longitude ?? -99.1332));
    setDevDesc(device.description || '');
    setModalError(''); setFieldErrors({});
    setShowModal(true);
  };

  const handleOpenNewBuildingModal = () => {
    if (!canManageBuildings) return;
    setNewBldError(''); setNewBldName(''); setNewBldCode('');
    setNewBldLat(devLat || '19.4326'); setNewBldLng(devLng || '-99.1332'); setNewBldDept('');
    setShowNewBuildingModal(true);
  };

  const handleSaveNewBuilding = async () => {
    if (!canManageBuildings) return;
    if (isSubmittingBld) return;
    setNewBldError('');
    
    if (!newBldName.trim() || newBldName.trim().length < 2) return setNewBldError('Ingresa el nombre del edificio.');
    if (!newBldCode.trim() || newBldCode.trim().length < 2) return setNewBldError('Ingresa un código identificador (ej. EDIF-C).');
    
    const gpsVal = validateGPS(newBldLat, newBldLng);
    if (!gpsVal.valid) return setNewBldError(gpsVal.error!);

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
      setDevDept(bld.departments.length > 0 ? bld.departments[0].id : '');
      setDevLocation(bld.departments.length > 0 ? `${bld.name} - ${bld.departments[0].name}` : bld.name);
    }
  };

  const handleMacChange = (text: string) => {
    setDevMac(formatMACInput(text));
    if (fieldErrors.mac) setFieldErrors(prev => ({ ...prev, mac: '' }));
  };

  const filteredDevices = devices.filter((dev) => {
    const q = searchQuery.trim().toLowerCase();
    const name = (dev.name || '').toLowerCase();
    const manufacturer = (dev.manufacturer || '').toLowerCase();
    const matchesSearch = !q || (
      name.includes(q) ||
      (dev.ipv4_address || '').toLowerCase().includes(q) ||
      (dev.mac_address || '').toLowerCase().includes(q) ||
      manufacturer.includes(q) ||
      (dev.location || '').toLowerCase().includes(q) ||
      (dev.subnet_name || '').toLowerCase().includes(q) ||
      (dev.building_name || '').toLowerCase().includes(q)
    );

    const matchesCategory =
      selectedCategory === 'Todos' ||
      (selectedCategory === 'Switches' && name.includes('switch')) ||
      (selectedCategory === 'Routers' && name.includes('router')) ||
      (selectedCategory === 'Servidores' && (name.includes('servidor') || manufacturer.includes('hp'))) ||
      (selectedCategory === 'Access Points' && (name.includes('point') || name.includes('unifi'))) ||
      (selectedCategory === 'Workstations' && (name.includes('imac') || name.includes('pc'))) ||
      (selectedCategory === 'Firewalls' && (name.includes('firewall') || name.includes('fortigate')));

    return matchesSearch &&
      matchesCategory &&
      (!selectedManufacturer || (dev.manufacturer || '').trim() === selectedManufacturer) &&
      (!selectedBuilding || dev.building_id === selectedBuilding) &&
      (!selectedSubnet || dev.subnet_id === selectedSubnet);
  }).sort((a, b) => {
    switch (sortOrder) {
      case 'oldest':
        return getDeviceTimestamp(a.created_at) - getDeviceTimestamp(b.created_at);
      case 'name_asc':
        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      case 'name_desc':
        return b.name.localeCompare(a.name, 'es', { sensitivity: 'base' });
      case 'ip_asc':
        return compareIPv4Addresses(a.ipv4_address, b.ipv4_address);
      case 'newest':
      default:
        return getDeviceTimestamp(b.created_at) - getDeviceTimestamp(a.created_at);
    }
  });

  const manufacturers = [...new Set(
    devices.map(device => (device.manufacturer || '').trim()).filter(Boolean),
  )].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  const activeAdvancedFilters = [selectedManufacturer, selectedBuilding, selectedSubnet].filter(Boolean).length;
  const renderFilterOptions = (
    options: { label: string; value: string }[],
    selectedValue: string,
    onSelect: (value: string) => void,
  ) => (
    <View style={styles.filterOptions}>
      {options.map(option => {
        const isSelected = selectedValue === option.value;
        return (
          <TouchableOpacity
            key={option.value || 'all'}
            style={[
              styles.filterOption,
              { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
              isSelected && { backgroundColor: colors.chipActiveBg, borderColor: colors.chipActiveBg },
            ]}
            activeOpacity={0.75}
            onPress={() => onSelect(option.value)}>
            <Text style={[
              styles.filterOptionText,
              { color: colors.textSecondary },
              isSelected && { color: colors.chipActiveText },
            ]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
  const selectSortOrder = (value: string) => {
    const option = DEVICE_SORT_OPTIONS.find(candidate => candidate.value === value);
    if (option) setSortOrder(option.value);
  };

  const resetAdvancedFilters = () => {
    setSelectedManufacturer('');
    setSelectedBuilding('');
    setSelectedSubnet('');
    setSortOrder('newest');
  };

  const handleSaveDevice = async () => {
    if (!canEditDevices) return;
    if (isSubmitting) return;
    setModalError('');
    const errors: { [key: string]: string } = {};

    const nameVal = validateRequired(devName, 2, 'El nombre');
    if (!nameVal.valid) errors.name = nameVal.error!;

    const ipVal = validateIPv4(devIp);
    if (!ipVal.valid) errors.ip = ipVal.error!;

    const macVal = validateMAC(devMac);
    if (!macVal.valid) errors.mac = macVal.error!;

    if (!devSubnet) errors.subnet = 'Selecciona una subred destino.';

    const gpsVal = validateGPS(devLat, devLng);
    if (!gpsVal.valid) errors.gps = gpsVal.error!;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return setModalError(Object.values(errors)[0]);

    const bld = buildings.find(b => b.id === devBuilding);
    const dept = bld?.departments.find(d => d.id === devDept);

    try {
      setIsSubmitting(true);
      const deviceData = {
        name: devName.trim(), 
        mac_address: macVal.formatted || devMac.toUpperCase().trim(), 
        manufacturer: devBrand.trim() || 'Genérico',
        location: devLocation.trim() || `${bld?.name || 'Edificio'} - ${dept?.name || 'General'}`,
        ipv4_address: devIp.trim(), 
        subnet_id: devSubnet, 
        description: devDesc.trim() || 'Equipo registrado en inventario.',
        latitude: parseFloat(devLat) || bld?.latitude || 19.4326, 
        longitude: parseFloat(devLng) || bld?.longitude || -99.1332,
        building_id: devBuilding || undefined, 
        department_id: devDept || undefined,
      };

      if (editingDeviceId) {
        await api.updateDevice(editingDeviceId, deviceData);
      } else {
        await api.createDevice(deviceData);
      }

      setShowModal(false); 
      setEditingDeviceId(null);
      loadData(true);
    } catch (err: any) { 
      setModalError(err?.message || 'Error al guardar el dispositivo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDevice = async (id: string, name: string) => {
    if (!canDeleteRecords) return;
    const confirmed = await confirmDestructiveAction(
      'Eliminar dispositivo',
      `¿Seguro que quieres eliminar “${name}”? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    const prevDevices = [...devices];
    setDevices(prev => prev.filter(d => d.id !== id));
    try {
      await api.deleteDevice(id);
    } catch (err) {
      console.error('Error eliminando dispositivo:', err);
      setDevices(prevDevices);
      showUserNotice('No se pudo eliminar', 'El dispositivo sigue en el inventario. Revisa la conexión o sus registros relacionados e inténtalo de nuevo.');
    }
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

  if (loading && devices.length === 0) {
    return (
      <LinearGradient colors={colors.gradient} style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0A84FF" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isDesktop ? '6%' : isTablet ? '4%' : 16 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.innerWrapper}>
          
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={styles.headerBadge}>INVENTARIO DE EQUIPOS</Text>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }, isSmallMobile && { fontSize: 22 }]}>Dispositivos</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>{devices.length} Equipos registrados en la infraestructura</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.portsButton, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('InventarioPuertos')}>
                <Feather name="server" size={15} color="#0A84FF" />
                <Text style={styles.portsButtonText}>Puertos</Text>
              </TouchableOpacity>
              {canEditDevices && (
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.buttonBg }]} activeOpacity={0.8} onPress={handleOpenAddDevice}>
                  <Feather name="plus" size={17} color={colors.buttonText} />
                  <Text style={[styles.addButtonText, { color: colors.buttonText }]}>Nuevo Equipo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={[styles.searchBar, { backgroundColor: colors.searchBg, borderColor: colors.searchBorder }]}>
            <Feather name="search" size={16} color={colors.textTertiary} />
            <TextInput 
              placeholder="Buscar por IP, MAC, nombre, ubicación..." 
              placeholderTextColor={colors.placeholder} 
              style={[styles.searchInput, { color: colors.textPrimary }]} 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
            {CATEGORIES.map((cat) => { 
              const isActive = selectedCategory === cat; 
              return (
                <TouchableOpacity 
                  key={cat} 
                  style={[
                    styles.categoryChip, 
                    { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                    isActive && { backgroundColor: colors.chipActiveBg, borderColor: colors.chipActiveBg }
                  ]} 
                  activeOpacity={0.7} 
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[
                    styles.categoryChipText, 
                    { color: colors.textSecondary },
                    isActive && { color: colors.chipActiveText }
                  ]}>{cat}</Text>
                </TouchableOpacity>
              ); 
            })}
          </ScrollView>

          <View style={styles.resultsToolbar}>
            <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
              {filteredDevices.length} de {devices.length} equipos
            </Text>
            <TouchableOpacity
              style={[
                styles.filtersButton,
                { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                activeAdvancedFilters > 0 && { borderColor: '#0A84FF' },
              ]}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Filtros y orden${activeAdvancedFilters ? `, ${activeAdvancedFilters} filtros activos` : ''}`}
              onPress={() => setShowFiltersModal(true)}>
              <Feather name="sliders" size={14} color={activeAdvancedFilters ? '#0A84FF' : colors.textSecondary} />
              <Text style={[styles.filtersButtonText, { color: activeAdvancedFilters ? '#0A84FF' : colors.textSecondary }]}>
                Filtros y orden{activeAdvancedFilters > 0 ? ` (${activeAdvancedFilters})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.deviceList}>
            {filteredDevices.map((dev) => { 
              const icon = getDeviceIcon(dev.name); 
              return (
                <BlurView 
                  key={dev.id} 
                  intensity={colors.blurIntensity} 
                  tint={colors.blurTint} 
                  style={[styles.deviceCard, { width: cardWidth, backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.deviceIconWrapper}>
                      <Feather name={icon} size={19} color="#0A84FF" />
                    </View>
                    <View style={styles.deviceTitleBlock}>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={`Ver ficha de ${dev.name}`}
                        onPress={() => void loadDeviceDetails(dev)}>
                        <View style={styles.titleWithStatus}>
                          <Text style={[styles.deviceName, { color: colors.textPrimary }]} numberOfLines={1}>{dev.name}</Text>
                          <View style={styles.statusDot} />
                        </View>
                        <Text style={[styles.manufacturerText, { color: colors.textTertiary }]} numberOfLines={1}>{dev.manufacturer} • {dev.location}</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.actionButton}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir ficha de ${dev.name}`}
                      onPress={() => void loadDeviceDetails(dev)}>
                      <Feather name="info" size={16} color="#0A84FF" />
                    </TouchableOpacity>
                    {canEditDevices && (
                      <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={() => handleOpenEditDevice(dev)}>
                        <Feather name="edit-2" size={15} color="#FFD60A" />
                      </TouchableOpacity>
                    )}
                    {canDeleteRecords && (
                      <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={() => void handleDeleteDevice(dev.id, dev.name)}>
                        <Feather name="trash-2" size={15} color="#FF453A" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.specsContainer}>
                    <View style={[styles.specBadge, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                      <Text style={[styles.specLabel, { color: colors.textTertiary }]}>IPv4</Text>
                      <Text style={styles.specValueIp} numberOfLines={1}>{dev.ipv4_address}</Text>
                    </View>
                    <View style={[styles.specBadge, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                      <Text style={[styles.specLabel, { color: colors.textTertiary }]}>MAC</Text>
                      <Text style={[styles.specValueMac, { color: colors.textPrimary }]} numberOfLines={1}>{dev.mac_address}</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.subnetFooter, { borderColor: colors.divider }]}>
                    <View style={styles.subnetTag}>
                      <Feather name="layers" size={12} color="#BF5AF2" />
                      <Text style={styles.subnetTagText} numberOfLines={1}>{dev.subnet_name || 'VLAN Asignada'}</Text>
                    </View>
                    <Text style={[styles.networkSubtag, { color: colors.textTertiary }]} numberOfLines={1}>{dev.network_name || 'Red Central'}</Text>
                  </View>
                </BlurView>
              ); 
            })}
            {filteredDevices.length === 0 && <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No se encontraron dispositivos con ese criterio.</Text>}
          </View>
        </View>

        {/* Modal Registrar Nuevo Dispositivo */}
        <GlassModal visible={showModal} onClose={() => setShowModal(false)} title={editingDeviceId ? 'Editar Dispositivo' : 'Registrar Dispositivo'} subtitle="Asocia el equipo a una subred activa">
          {modalError !== '' && (
            <View style={styles.modalErrorContainer}>
              <Feather name="alert-circle" size={15} color="#FF453A" />
              <Text style={styles.modalErrorText}>{modalError}</Text>
            </View>
          )}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nombre del Dispositivo *</Text>
          <TextInput 
            placeholder="ej. Switch Distribución Edificio B" 
            placeholderTextColor={colors.placeholder} 
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }, fieldErrors.name && styles.inputError]} 
            value={devName} 
            onChangeText={(val) => { setDevName(val); if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' })); }} 
          />
          {fieldErrors.name && <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text>}
          
          <View style={[styles.formRow, isSmallMobile && { flexDirection: 'column', gap: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Dirección IPv4 *</Text>
              <TextInput 
                placeholder="ej. 10.0.10.20" 
                placeholderTextColor={colors.placeholder} 
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }, fieldErrors.ip && styles.inputError]} 
                value={devIp} 
                onChangeText={(val) => { setDevIp(val); if (fieldErrors.ip) setFieldErrors(prev => ({ ...prev, ip: '' })); }} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Dirección MAC *</Text>
              <TextInput 
                placeholder="AA:BB:CC:DD:EE:FF" 
                placeholderTextColor={colors.placeholder} 
                autoCapitalize="characters"
                maxLength={17}
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }, fieldErrors.mac && styles.inputError]} 
                value={devMac} 
                onChangeText={handleMacChange} 
              />
            </View>
          </View>
          {fieldErrors.ip && <Text style={styles.fieldErrorText}>{fieldErrors.ip}</Text>}
          {fieldErrors.mac && <Text style={styles.fieldErrorText}>{fieldErrors.mac}</Text>}

          <View style={[styles.formRow, isSmallMobile && { flexDirection: 'column', gap: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Fabricante / Marca</Text>
              <TextInput placeholder="ej. Cisco / Ubiquiti" placeholderTextColor={colors.placeholder} style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={devBrand} onChangeText={setDevBrand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Ubicación Física</Text>
              <TextInput placeholder="ej. Rack 02 - Piso 1" placeholderTextColor={colors.placeholder} style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={devLocation} onChangeText={setDevLocation} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Edificio / Ubicación Física *</Text>
            {canManageBuildings && (
              <TouchableOpacity onPress={handleOpenNewBuildingModal} activeOpacity={0.7} style={styles.addBldSmallBtn}>
                <Feather name="plus" size={12} color="#0A84FF" />
                <Text style={styles.addBldSmallBtnText}>Añadir Ubicación</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.buildingSelector}>
            {buildings.map((bld) => (
              <TouchableOpacity key={bld.id} style={[styles.buildingOption, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }, devBuilding === bld.id && styles.buildingOptionActive]} onPress={() => handleSelectBuilding(bld.id)}>
                <Text style={[styles.buildingOptionText, { color: colors.textSecondary }, devBuilding === bld.id && styles.buildingOptionTextActive]}>{bld.code}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Subred de Destino *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {subnets.map((sub) => (
              <TouchableOpacity key={sub.id} style={[styles.subnetOption, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }, devSubnet === sub.id && styles.subnetOptionActive]} onPress={() => setDevSubnet(sub.id)}>
                <Text style={[styles.subnetOptionText, { color: colors.textPrimary }]} numberOfLines={1}>{sub.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Descripción u Observaciones</Text>
          <TextInput placeholder="Rol del equipo en la red..." placeholderTextColor={colors.placeholder} multiline numberOfLines={2} style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={devDesc} onChangeText={setDevDesc} />

          <TouchableOpacity style={[styles.modalSubmitButton, { backgroundColor: colors.buttonBg }, isSubmitting && { opacity: 0.6 }]} disabled={isSubmitting} activeOpacity={0.8} onPress={handleSaveDevice}>
            {isSubmitting ? <ActivityIndicator size="small" color={colors.buttonText} /> : <Text style={[styles.modalSubmitButtonText, { color: colors.buttonText }]}>{editingDeviceId ? 'Actualizar Dispositivo' : 'Guardar en Inventario'}</Text>}
          </TouchableOpacity>
        </GlassModal>

        <GlassModal
          visible={showFiltersModal}
          onClose={() => setShowFiltersModal(false)}
          title="Filtros y orden"
          subtitle="Combina criterios para encontrar equipos">
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Ordenar por</Text>
          {renderFilterOptions(
            DEVICE_SORT_OPTIONS.map(option => ({ label: option.label, value: option.value })),
            sortOrder,
            selectSortOrder,
          )}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Fabricante</Text>
          {renderFilterOptions(
            [{ label: 'Todos', value: '' }, ...manufacturers.map(manufacturer => ({ label: manufacturer, value: manufacturer }))],
            selectedManufacturer,
            setSelectedManufacturer,
          )}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Edificio</Text>
          {renderFilterOptions(
            [{ label: 'Todos', value: '' }, ...buildings.map(building => ({ label: building.name, value: building.id }))],
            selectedBuilding,
            setSelectedBuilding,
          )}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Subred</Text>
          {renderFilterOptions(
            [{ label: 'Todas', value: '' }, ...subnets.map(subnet => ({ label: subnet.name, value: subnet.id }))],
            selectedSubnet,
            setSelectedSubnet,
          )}

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={[styles.filterResetButton, { borderColor: colors.cardBorder }]}
              activeOpacity={0.75}
              onPress={resetAdvancedFilters}>
              <Text style={[styles.filterResetText, { color: colors.textSecondary }]}>Restablecer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterApplyButton, { backgroundColor: colors.buttonBg }]}
              activeOpacity={0.8}
              onPress={() => setShowFiltersModal(false)}>
              <Text style={[styles.filterApplyText, { color: colors.buttonText }]}>Ver {filteredDevices.length} equipos</Text>
            </TouchableOpacity>
          </View>
        </GlassModal>

        <GlassModal
          visible={detailDevice !== null}
          onClose={closeDeviceDetails}
          title={detailDevice?.name || 'Ficha del dispositivo'}
          subtitle="Información completa y actividad relacionada">
          {detailDevice && (
            <>
              <View style={styles.detailHero}>
                <View style={styles.detailHeroIcon}>
                  <Feather name={getDeviceIcon(detailDevice.name)} size={24} color="#0A84FF" />
                </View>
                <View style={styles.detailHeroCopy}>
                  <Text style={[styles.detailHeroTitle, { color: colors.textPrimary }]}>{detailDevice.name}</Text>
                  <Text style={[styles.detailHeroSubtitle, { color: colors.textSecondary }]}>
                    {detailDevice.manufacturer || 'Fabricante no especificado'} · {detailDevice.location || 'Ubicación no especificada'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.textPrimary }]}>Identificación y red</Text>
                <View style={styles.detailGrid}>
                  <DetailValue label="Dirección IPv4" value={detailDevice.ipv4_address} color={colors.textPrimary} secondaryColor={colors.textSecondary} />
                  <DetailValue label="Dirección MAC" value={detailDevice.mac_address} color={colors.textPrimary} secondaryColor={colors.textSecondary} />
                  <DetailValue label="Red" value={detailDevice.network_name || 'Sin red asignada'} color={colors.textPrimary} secondaryColor={colors.textSecondary} />
                  <DetailValue label="Subred" value={detailDevice.subnet_name || 'Sin subred asignada'} color={colors.textPrimary} secondaryColor={colors.textSecondary} />
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.textPrimary }]}>Ubicación</Text>
                <View style={styles.detailGrid}>
                  <DetailValue label="Edificio" value={detailDevice.building_name || 'No asignado'} color={colors.textPrimary} secondaryColor={colors.textSecondary} />
                  <DetailValue label="Área o departamento" value={detailDevice.department_name || 'No asignado'} color={colors.textPrimary} secondaryColor={colors.textSecondary} />
                  <DetailValue label="Ubicación física" value={detailDevice.location || 'No especificada'} color={colors.textPrimary} secondaryColor={colors.textSecondary} />
                  <DetailValue
                    label="Coordenadas GPS"
                    value={detailDevice.latitude != null && detailDevice.longitude != null
                      ? `${detailDevice.latitude}, ${detailDevice.longitude}`
                      : 'No registradas'}
                    color={colors.textPrimary}
                    secondaryColor={colors.textSecondary}
                  />
                  <DetailValue label="Registrado" value={formatDeviceDate(detailDevice.created_at)} color={colors.textPrimary} secondaryColor={colors.textSecondary} />
                  <DetailValue label="Última actualización" value={formatDeviceDate(detailDevice.updated_at)} color={colors.textPrimary} secondaryColor={colors.textSecondary} />
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.textPrimary }]}>Descripción</Text>
                <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>
                  {detailDevice.description || 'Sin descripción u observaciones.'}
                </Text>
              </View>

              {detailLoading ? (
                <View style={styles.detailLoading}>
                  <ActivityIndicator size="small" color="#0A84FF" />
                  <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>Cargando incidentes, mantenimientos y respaldos...</Text>
                </View>
              ) : detailError ? (
                <View style={styles.detailError}>
                  <Feather name="alert-circle" size={16} color="#FF453A" />
                  <Text style={styles.detailErrorText}>{detailError}</Text>
                  <TouchableOpacity onPress={() => void loadDeviceDetails(detailDevice)} style={styles.detailRetryButton}>
                    <Text style={styles.detailRetryText}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.textPrimary }]}>
                      Incidentes ({deviceIncidents.length})
                    </Text>
                    {deviceIncidents.length ? deviceIncidents.slice(0, 4).map(incident => (
                      <View key={incident.id} style={[styles.relatedRecord, { borderColor: colors.divider }]}>
                        <View style={styles.relatedRecordIcon}>
                          <Feather name="alert-triangle" size={14} color={incident.status === 'resolved' ? '#30D158' : '#FF9F0A'} />
                        </View>
                        <View style={styles.relatedRecordCopy}>
                          <Text style={[styles.relatedRecordTitle, { color: colors.textPrimary }]} numberOfLines={1}>{incident.title}</Text>
                          <Text style={[styles.relatedRecordMeta, { color: colors.textSecondary }]}>
                            {incident.status === 'resolved' ? 'Resuelto' : incident.status === 'in_progress' ? 'En progreso' : 'Abierto'} · {incident.severity}
                          </Text>
                        </View>
                      </View>
                    )) : <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>No hay incidentes relacionados.</Text>}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.textPrimary }]}>
                      Mantenimientos ({deviceMaintenances.length})
                    </Text>
                    {deviceMaintenances.some(maintenance => !maintenance.device_id) && (
                      <Text style={[styles.relatedRecordMeta, { color: colors.textSecondary, marginBottom: 8 }]}>
                        Algunos registros anteriores se relacionan por nombre y ubicación.
                      </Text>
                    )}
                    {deviceMaintenances.length ? deviceMaintenances.slice(0, 4).map(maintenance => (
                      <View key={maintenance.id} style={[styles.relatedRecord, { borderColor: colors.divider }]}>
                        <View style={styles.relatedRecordIcon}>
                          <Feather name="tool" size={14} color="#0A84FF" />
                        </View>
                        <View style={styles.relatedRecordCopy}>
                          <Text style={[styles.relatedRecordTitle, { color: colors.textPrimary }]} numberOfLines={1}>{maintenance.title}</Text>
                          <Text style={[styles.relatedRecordMeta, { color: colors.textSecondary }]}>
                            {maintenance.scheduled_date} · {maintenance.status === 'completed' ? 'Completado' : maintenance.status === 'in_progress' ? 'En progreso' : 'Programado'}
                          </Text>
                        </View>
                      </View>
                    )) : <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>No hay mantenimientos relacionados.</Text>}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.textPrimary }]}>
                      Configuraciones guardadas ({deviceConfigs.length})
                    </Text>
                    {deviceConfigs.length ? deviceConfigs.slice(0, 4).map(config => (
                      <View key={config.id} style={[styles.relatedRecord, { borderColor: colors.divider }]}>
                        <View style={styles.relatedRecordIcon}>
                          <Feather name="file-text" size={14} color="#BF5AF2" />
                        </View>
                        <View style={styles.relatedRecordCopy}>
                          <Text style={[styles.relatedRecordTitle, { color: colors.textPrimary }]} numberOfLines={1}>{config.name}</Text>
                          <Text style={[styles.relatedRecordMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                            {config.file_name} · {config.file_size || 'Tamaño no disponible'}
                          </Text>
                        </View>
                      </View>
                    )) : <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>No hay configuraciones guardadas.</Text>}
                  </View>
                </>
              )}
            </>
          )}
        </GlassModal>

        {/* Modal Nuevo Edificio */}
        <GlassModal visible={showNewBuildingModal} onClose={() => setShowNewBuildingModal(false)} title="Nueva Ubicación Física" subtitle="Registra un edificio con coordenadas GPS">
          {newBldError !== '' && (
            <View style={styles.modalErrorContainer}>
              <Feather name="alert-circle" size={15} color="#FF453A" />
              <Text style={styles.modalErrorText}>{newBldError}</Text>
            </View>
          )}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nombre del Edificio *</Text>
          <TextInput placeholder="ej. Edificio D" placeholderTextColor={colors.placeholder} style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={newBldName} onChangeText={setNewBldName} />
          
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Código Corto *</Text>
          <TextInput placeholder="ej. EDIF-D" placeholderTextColor={colors.placeholder} autoCapitalize="characters" style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]} value={newBldCode} onChangeText={setNewBldCode} />

          <TouchableOpacity style={[styles.modalSubmitButton, { backgroundColor: colors.buttonBg }, isSubmittingBld && { opacity: 0.6 }]} disabled={isSubmittingBld} activeOpacity={0.8} onPress={handleSaveNewBuilding}>
            {isSubmittingBld ? <ActivityIndicator size="small" color={colors.buttonText} /> : <Text style={[styles.modalSubmitButtonText, { color: colors.buttonText }]}>Guardar Ubicación</Text>}
          </TouchableOpacity>
        </GlassModal>
      </ScrollView>
    </LinearGradient>
  );
}

function DetailValue({
  label,
  value,
  color,
  secondaryColor,
}: {
  label: string;
  value: string;
  color: string;
  secondaryColor: string;
}) {
  return (
    <View style={styles.detailValue}>
      <Text style={[styles.detailValueLabel, { color: secondaryColor }]}>{label}</Text>
      <Text style={[styles.detailValueText, { color }]} selectable>{value || 'No especificado'}</Text>
    </View>
  );
}

function formatDeviceDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No disponible' : date.toLocaleString();
}

function getDeviceTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function compareIPv4Addresses(first = '', second = '') {
  const firstSegments = first.split('.');
  const secondSegments = second.split('.');
  const firstParts = firstSegments.map(Number);
  const secondParts = secondSegments.map(Number);
  const isValidIPv4 = (segments: string[], parts: number[]) =>
    segments.length === 4 &&
    segments.every(segment => /^\d{1,3}$/.test(segment)) &&
    parts.every(part => Number.isInteger(part) && part >= 0 && part <= 255);

  if (!isValidIPv4(firstSegments, firstParts) || !isValidIPv4(secondSegments, secondParts)) {
    return first.localeCompare(second, 'en', { numeric: true, sensitivity: 'base' });
  }

  for (let index = 0; index < 4; index += 1) {
    if (firstParts[index] !== secondParts[index]) return firstParts[index] - secondParts[index];
  }
  return 0;
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 24, paddingBottom: 110 },
  innerWrapper: { maxWidth: 1200, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 },
  headerBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#30D158', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 26, color: colors.textPrimary, letterSpacing: 0.3 },
  headerSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  portsButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, gap: 5 },
  portsButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#0A84FF' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.buttonBg, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, gap: 5 },
  addButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: colors.buttonText },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, gap: 10 },
  searchInput: { flex: 1, fontFamily: 'Poppins_400Regular', color: colors.textPrimary, fontSize: 13, ...Platform.select({ web: { outlineStyle: 'none' } }) as any },
  categoriesContainer: { gap: 8, marginBottom: 18, paddingVertical: 4 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.cardBorder },
  categoryChipActive: { backgroundColor: colors.buttonBg, borderColor: colors.buttonBg },
  categoryChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: colors.textSecondary },
  categoryChipTextActive: { color: colors.buttonText },
  resultsToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -8, marginBottom: 12, gap: 10 },
  resultsCount: { fontFamily: 'Poppins_400Regular', fontSize: 11.5 },
  filtersButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 12 },
  filtersButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  filterOption: { paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderRadius: 18, maxWidth: '100%' },
  filterOptionText: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
  filterActions: { flexDirection: 'row', gap: 9, marginTop: 4 },
  filterResetButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderWidth: 1, borderRadius: 12 },
  filterResetText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5 },
  filterApplyButton: { flex: 1.5, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  filterApplyText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', paddingVertical: 16, textAlign: 'center', width: '100%' },
  deviceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  deviceCard: { padding: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  deviceIconWrapper: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(10, 132, 255, 0.12)', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  deviceTitleBlock: { flex: 1 },
  titleWithStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deviceName: { fontFamily: 'Poppins_700Bold', fontSize: 14.5, color: colors.textPrimary },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#30D158' },
  manufacturerText: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: colors.textTertiary, marginTop: 1 },
  actionButton: { padding: 5, marginLeft: 2 },
  detailHero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: 'rgba(10, 132, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.16)', marginBottom: 18 },
  detailHeroIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10, 132, 255, 0.12)' },
  detailHeroCopy: { flex: 1 },
  detailHeroTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15 },
  detailHeroSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, marginTop: 3 },
  detailSection: { marginBottom: 18 },
  detailSectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, marginBottom: 9 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailValue: { width: '48%', minWidth: 130, padding: 10, borderRadius: 11, backgroundColor: colors.chipBg },
  detailValueLabel: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, marginBottom: 4 },
  detailValueText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5 },
  detailDescription: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18 },
  detailLoading: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12 },
  detailError: { padding: 12, borderRadius: 12, backgroundColor: 'rgba(255, 69, 58, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.2)', marginBottom: 14, gap: 8 },
  detailErrorText: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: '#FF453A' },
  detailRetryButton: { alignSelf: 'flex-start', paddingVertical: 5 },
  detailRetryText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: '#0A84FF' },
  relatedRecord: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, borderBottomWidth: 1 },
  relatedRecordIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chipBg },
  relatedRecordCopy: { flex: 1 },
  relatedRecordTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5 },
  relatedRecordMeta: { fontFamily: 'Poppins_400Regular', fontSize: 10, marginTop: 2 },
  specsContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  specBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, gap: 6 },
  specLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 9.5, color: colors.textSecondary },
  specValueIp: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: '#0A84FF', flex: 1 },
  specValueMac: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: colors.textPrimary, letterSpacing: 0.5, flex: 1 },
  subnetFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderColor: colors.cardBorder },
  subnetTag: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '65%' },
  subnetTagText: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: '#BF5AF2' },
  networkSubtag: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: colors.textTertiary, maxWidth: '35%' },
  inputLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: colors.textSecondary, marginBottom: 5 },
  input: { fontFamily: 'Poppins_400Regular', backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 13, padding: 12, color: colors.textPrimary, fontSize: 13.5, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) as any },
  inputError: { borderColor: '#FF453A', backgroundColor: 'rgba(255, 69, 58, 0.06)' },
  fieldErrorText: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: '#FF453A', marginTop: -8, marginBottom: 10, marginLeft: 4 },
  modalErrorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 69, 58, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.3)', borderRadius: 11, padding: 10, marginBottom: 14, gap: 8 },
  modalErrorText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#FF453A', flex: 1 },
  formRow: { flexDirection: 'row', gap: 10 },
  buildingSelector: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  addBldSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 4 },
  addBldSmallBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#0A84FF' },
  buildingOption: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 9, backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' },
  buildingOptionActive: { backgroundColor: 'rgba(10, 132, 255, 0.2)', borderColor: '#0A84FF' },
  buildingOptionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: colors.textSecondary },
  buildingOptionTextActive: { color: '#0A84FF' },
  subnetOption: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 9, backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', marginRight: 6 },
  subnetOptionActive: { backgroundColor: 'rgba(191, 90, 242, 0.2)', borderColor: '#BF5AF2' },
  subnetOptionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: colors.textPrimary },
  textArea: { height: 55, textAlignVertical: 'top' },
  modalSubmitButton: { backgroundColor: colors.buttonBg, paddingVertical: 14, borderRadius: 13, alignItems: 'center', marginTop: 8 },
  modalSubmitButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: colors.buttonText },
});
