import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, 
  useWindowDimensions, Platform, ActivityIndicator
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import GlassModal from '../../components/ui/GlassModal';
import * as api from '../../services/api';
import { Network, Subnet } from '../../types';
import { 
  validateIPv4, 
  validateCIDR, 
  validateNetworkAndCidr, 
  validateSubnetAgainstParent, 
  validateRequired 
} from '../../utils/validators';

export default function NetworkListScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const [networks, setNetworks] = useState<(Network & { subnets: Subnet[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNetworkId, setExpandedNetworkId] = useState<string | null>(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showSubnetModal, setShowSubnetModal] = useState(false);
  const [selectedNetworkForSubnet, setSelectedNetworkForSubnet] = useState<string>('');

  const [netName, setNetName] = useState('');
  const [netIp, setNetIp] = useState('');
  const [netCidr, setNetCidr] = useState('16');
  const [netDesc, setNetDesc] = useState('');
  const [netError, setNetError] = useState('');
  const [netFieldErrors, setNetFieldErrors] = useState<{ [key: string]: string }>({});

  const [subName, setSubName] = useState('');
  const [subIp, setSubIp] = useState('');
  const [subCidr, setSubCidr] = useState('24');
  const [subDesc, setSubDesc] = useState('');
  const [subError, setSubError] = useState('');
  const [subFieldErrors, setSubFieldErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadNetworks = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && networks.length === 0) setLoading(true);
      const data = await api.fetchNetworks(isSilent);
      setNetworks(data);
      if (data.length > 0 && !expandedNetworkId) setExpandedNetworkId(data[0].id);
    } catch (err) { console.error('Error cargando redes:', err); }
    finally { setLoading(false); }
  }, [expandedNetworkId, networks.length]);

  useFocusEffect(useCallback(() => { loadNetworks(true); }, [loadNetworks]));

  const toggleExpand = (id: string) => setExpandedNetworkId(expandedNetworkId === id ? null : id);
  const handleOpenAddSubnet = (networkId: string) => { 
    setSelectedNetworkForSubnet(networkId); 
    setSubError('');
    setSubFieldErrors({});
    setShowSubnetModal(true); 
  };

  const handleOpenAddNetwork = () => {
    setNetError('');
    setNetFieldErrors({});
    setShowNetworkModal(true);
  };

  const handleSaveNetwork = async () => {
    if (isSubmitting) return;
    setNetError('');
    const errors: { [key: string]: string } = {};

    const nameVal = validateRequired(netName, 2, 'El nombre de la red');
    if (!nameVal.valid) errors.name = nameVal.error!;

    const ipVal = validateIPv4(netIp);
    if (!ipVal.valid) errors.ip = ipVal.error!;

    const cidrVal = validateCIDR(netCidr, 1, 30);
    if (!cidrVal.valid) errors.cidr = cidrVal.error!;

    if (ipVal.valid && cidrVal.valid) {
      const netCidrVal = validateNetworkAndCidr(netIp, netCidr);
      if (!netCidrVal.valid) {
        errors.ip = netCidrVal.error!;
      }
    }

    setNetFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setNetError(Object.values(errors)[0]);
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createNetwork({ 
        name: netName.trim(), 
        address: netIp.trim(), 
        cidr: parseInt(netCidr, 10), 
        description: netDesc.trim() || 'Red principal' 
      });
      setShowNetworkModal(false); 
      setNetName(''); 
      setNetIp(''); 
      setNetCidr('16'); 
      setNetDesc('');
      setNetError('');
      setNetFieldErrors({});
      loadNetworks(true);
    } catch (err: any) { 
      setNetError(err?.message || 'Error al guardar la red'); 
      console.error('Error creando red:', err); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSubnet = async () => {
    if (isSubmitting) return;
    setSubError('');
    const errors: { [key: string]: string } = {};

    const nameVal = validateRequired(subName, 2, 'El nombre de la subred');
    if (!nameVal.valid) errors.name = nameVal.error!;

    const ipVal = validateIPv4(subIp);
    if (!ipVal.valid) errors.ip = ipVal.error!;

    const cidrVal = validateCIDR(subCidr, 1, 32);
    if (!cidrVal.valid) errors.cidr = cidrVal.error!;

    const parentNet = networks.find(n => n.id === selectedNetworkForSubnet);
    if (parentNet && ipVal.valid && cidrVal.valid) {
      const relationVal = validateSubnetAgainstParent(
        parentNet.address,
        parentNet.cidr,
        subIp.trim(),
        parseInt(subCidr, 10)
      );
      if (!relationVal.valid) {
        errors.relation = relationVal.error!;
      }
    }

    setSubFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSubError(Object.values(errors)[0]);
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createSubnet({ 
        name: subName.trim(), 
        address: subIp.trim(), 
        cidr: parseInt(subCidr, 10), 
        description: subDesc.trim() || 'Subred segmentada', 
        network_id: selectedNetworkForSubnet 
      });
      setShowSubnetModal(false); 
      setSubName(''); 
      setSubIp(''); 
      setSubCidr('24'); 
      setSubDesc('');
      setSubError('');
      setSubFieldErrors({});
      loadNetworks(true);
    } catch (err: any) { 
      setSubError(err?.message || 'Error al guardar la subred'); 
      console.error('Error creando subred:', err); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNetwork = async (id: string) => {
    // Actualización optimista instantánea (0ms)
    const prevNetworks = [...networks];
    setNetworks(prev => prev.filter(n => n.id !== id));
    try { 
      await api.deleteNetwork(id); 
    } catch (err) { 
      console.error(err); 
      setNetworks(prevNetworks);
    }
  };

  const handleDeleteSubnet = async (networkId: string, subnetId: string) => {
    // Actualización optimista instantánea (0ms)
    const prevNetworks = [...networks];
    setNetworks(prev => prev.map(net => {
      if (net.id === networkId) {
        return {
          ...net,
          subnets: (net.subnets || []).filter(s => s.id !== subnetId),
          subnet_count: Math.max(0, (net.subnet_count || 1) - 1),
        };
      }
      return net;
    }));
    try { 
      await api.deleteSubnet(subnetId); 
    } catch (err) { 
      console.error(err); 
      setNetworks(prevNetworks);
    }
  };

  const isSmallMobile = width < 380;
  const isDesktop = width >= 1024;
  const netCardWidth = isDesktop ? '48.8%' : '100%';

  if (loading && networks.length === 0) {
    return (
      <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0A84FF" />
        </View>
      </LinearGradient>
    );
  }

  const selectedParentNetwork = networks.find(n => n.id === selectedNetworkForSubnet);

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isDesktop ? '6%' : isTablet ? '4%' : 16 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.innerWrapper}>
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={styles.headerBadge}>INFRAESTRUCTURA DE RED</Text>
              <Text style={[styles.headerTitle, isSmallMobile && { fontSize: 22 }]}>Redes y Subredes</Text>
              <Text style={styles.headerSubtitle}>{networks.length} Redes Principales • {networks.reduce((acc, n) => acc + n.subnets.length, 0)} Subredes</Text>
            </View>
            <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={handleOpenAddNetwork}>
              <Feather name="plus" size={17} color="#000000" />
              <Text style={styles.addButtonText}>Nueva Red</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.networkList}>
            {networks.map((net) => {
              const isExpanded = expandedNetworkId === net.id;
              return (
                <BlurView key={net.id} intensity={30} tint="dark" style={[styles.networkCard, { width: netCardWidth }]}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.networkInfo}>
                      <View style={styles.networkTitleContainer}>
                        <Text style={styles.networkName}>{net.name}</Text>
                        <View style={styles.cidrBadge}><Text style={styles.cidrText}>{net.address}/{net.cidr}</Text></View>
                      </View>
                      <Text style={styles.networkDesc}>{net.description}</Text>
                    </View>
                  </View>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}><Feather name="layers" size={13} color="#BF5AF2" /><Text style={styles.statText}>{net.subnets.length} Subredes</Text></View>
                    <View style={styles.statItem}><Feather name="cpu" size={13} color="#30D158" /><Text style={styles.statText}>{net.device_count || 0} Equipos</Text></View>
                    <View style={styles.statItem}><Feather name="shield" size={13} color="#0A84FF" /><Text style={styles.statText}>IPv4 Privada</Text></View>
                  </View>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.expandButton} activeOpacity={0.7} onPress={() => toggleExpand(net.id)}>
                      <Text style={styles.expandButtonText}>{isExpanded ? 'Ocultar Subredes' : `Ver Subredes (${net.subnets.length})`}</Text>
                      <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={15} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.cardControlButtons}>
                      <TouchableOpacity style={styles.iconActionButton} activeOpacity={0.7} onPress={() => handleOpenAddSubnet(net.id)}><Feather name="plus-circle" size={15} color="#0A84FF" /></TouchableOpacity>
                      <TouchableOpacity style={styles.iconActionButton} activeOpacity={0.7} onPress={() => handleDeleteNetwork(net.id)}><Feather name="trash-2" size={15} color="#FF453A" /></TouchableOpacity>
                    </View>
                  </View>
                  {isExpanded && (
                    <View style={styles.subnetsContainer}>
                      <View style={styles.subnetHeaderRow}>
                        <Text style={styles.subnetSectionTitle}>SUBREDES ASOCIADAS</Text>
                        <TouchableOpacity style={styles.addSubnetSmallBtn} activeOpacity={0.7} onPress={() => handleOpenAddSubnet(net.id)}>
                          <Feather name="plus" size={12} color="#0A84FF" /><Text style={styles.addSubnetSmallText}>Añadir Subred</Text>
                        </TouchableOpacity>
                      </View>
                      {net.subnets.length === 0 ? (
                        <Text style={styles.emptySubnetText}>No hay subredes registradas en esta red.</Text>
                      ) : (
                        net.subnets.map((sub) => (
                          <View key={sub.id} style={styles.subnetItem}>
                            <View style={styles.subnetMain}>
                              <View style={styles.subnetTitleRow}>
                                <Text style={styles.subnetName}>{sub.name}</Text>
                                <View style={styles.subnetCidrBadge}><Text style={styles.subnetCidrText}>{sub.address}/{sub.cidr}</Text></View>
                              </View>
                              <Text style={styles.subnetDesc}>{sub.description}</Text>
                            </View>
                            <View style={styles.subnetSide}>
                              <View style={styles.deviceCountBadge}><Feather name="cpu" size={11} color="#30D158" /><Text style={styles.deviceCountText}>{(sub as any).device_count || 0}</Text></View>
                              <TouchableOpacity style={styles.deleteSubnetBtn} activeOpacity={0.7} onPress={() => handleDeleteSubnet(net.id, sub.id)}><Feather name="trash-2" size={13} color="rgba(255, 69, 58, 0.7)" /></TouchableOpacity>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </BlurView>
              );
            })}
          </View>
        </View>

        {/* Modal Nueva Red */}
        <GlassModal visible={showNetworkModal} onClose={() => setShowNetworkModal(false)} title="Crear Red Principal" subtitle="Define el direccionamiento IPv4 base y máscara">
          {netError !== '' && (
            <View style={styles.modalErrorContainer}>
              <Feather name="alert-circle" size={15} color="#FF453A" />
              <Text style={styles.modalErrorText}>{netError}</Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Nombre de la Red *</Text>
          <TextInput 
            placeholder="ej. Red Administrativa Campus" 
            placeholderTextColor="rgba(255, 255, 255, 0.25)" 
            style={[styles.input, netFieldErrors.name && styles.inputError]} 
            value={netName} 
            onChangeText={(val) => {
              setNetName(val);
              if (netFieldErrors.name) setNetFieldErrors(prev => ({ ...prev, name: '' }));
            }} 
          />
          {netFieldErrors.name && <Text style={styles.fieldErrorText}>{netFieldErrors.name}</Text>}

          <View style={[styles.formRow, isSmallMobile && { flexDirection: 'column', gap: 0 }]}>
            <View style={{ flex: 2 }}>
              <Text style={styles.inputLabel}>Dirección IPv4 Base *</Text>
              <TextInput 
                placeholder="ej. 192.168.0.0" 
                placeholderTextColor="rgba(255, 255, 255, 0.25)" 
                style={[styles.input, netFieldErrors.ip && styles.inputError]} 
                value={netIp} 
                onChangeText={(val) => {
                  setNetIp(val);
                  if (netFieldErrors.ip) setNetFieldErrors(prev => ({ ...prev, ip: '' }));
                }} 
              />
              {netFieldErrors.ip && <Text style={styles.fieldErrorText}>{netFieldErrors.ip}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>CIDR (/)</Text>
              <TextInput 
                placeholder="16" 
                placeholderTextColor="rgba(255, 255, 255, 0.25)" 
                keyboardType="numeric" 
                style={[styles.input, netFieldErrors.cidr && styles.inputError]} 
                value={netCidr} 
                onChangeText={(val) => {
                  setNetCidr(val);
                  if (netFieldErrors.cidr) setNetFieldErrors(prev => ({ ...prev, cidr: '' }));
                }} 
              />
              {netFieldErrors.cidr && <Text style={styles.fieldErrorText}>{netFieldErrors.cidr}</Text>}
            </View>
          </View>
          <Text style={styles.inputLabel}>Descripción u Observaciones</Text>
          <TextInput placeholder="Detalles sobre el uso o alcance de esta red..." placeholderTextColor="rgba(255, 255, 255, 0.25)" multiline numberOfLines={3} style={[styles.input, styles.textArea]} value={netDesc} onChangeText={setNetDesc} />
          <TouchableOpacity 
            style={[styles.modalSubmitButton, isSubmitting && { opacity: 0.6 }]} 
            disabled={isSubmitting} 
            activeOpacity={0.8} 
            onPress={handleSaveNetwork}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.modalSubmitButtonText}>Guardar Red Principal</Text>
            )}
          </TouchableOpacity>
        </GlassModal>

        {/* Modal Nueva Subred */}
        <GlassModal visible={showSubnetModal} onClose={() => setShowSubnetModal(false)} title="Crear Subred (VLAN)" subtitle={`Segmentar ${selectedParentNetwork?.name || 'red'} (${selectedParentNetwork?.address}/${selectedParentNetwork?.cidr})`}>
          {subError !== '' && (
            <View style={styles.modalErrorContainer}>
              <Feather name="alert-circle" size={15} color="#FF453A" />
              <Text style={styles.modalErrorText}>{subError}</Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Nombre de la Subred *</Text>
          <TextInput 
            placeholder="ej. VLAN 50 - Laboratorio Robótica" 
            placeholderTextColor="rgba(255, 255, 255, 0.25)" 
            style={[styles.input, subFieldErrors.name && styles.inputError]} 
            value={subName} 
            onChangeText={(val) => {
              setSubName(val);
              if (subFieldErrors.name) setSubFieldErrors(prev => ({ ...prev, name: '' }));
            }} 
          />
          {subFieldErrors.name && <Text style={styles.fieldErrorText}>{subFieldErrors.name}</Text>}

          <View style={[styles.formRow, isSmallMobile && { flexDirection: 'column', gap: 0 }]}>
            <View style={{ flex: 2 }}>
              <Text style={styles.inputLabel}>Dirección IPv4 Subred *</Text>
              <TextInput 
                placeholder={selectedParentNetwork ? `ej. ${selectedParentNetwork.address}` : 'ej. 10.0.50.0'} 
                placeholderTextColor="rgba(255, 255, 255, 0.25)" 
                style={[styles.input, (subFieldErrors.ip || subFieldErrors.relation) && styles.inputError]} 
                value={subIp} 
                onChangeText={(val) => {
                  setSubIp(val);
                  if (subFieldErrors.ip || subFieldErrors.relation) {
                    setSubFieldErrors(prev => ({ ...prev, ip: '', relation: '' }));
                  }
                }} 
              />
              {subFieldErrors.ip && <Text style={styles.fieldErrorText}>{subFieldErrors.ip}</Text>}
              {subFieldErrors.relation && <Text style={styles.fieldErrorText}>{subFieldErrors.relation}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>CIDR (/)</Text>
              <TextInput 
                placeholder="24" 
                placeholderTextColor="rgba(255, 255, 255, 0.25)" 
                keyboardType="numeric" 
                style={[styles.input, subFieldErrors.cidr && styles.inputError]} 
                value={subCidr} 
                onChangeText={(val) => {
                  setSubCidr(val);
                  if (subFieldErrors.cidr) setSubFieldErrors(prev => ({ ...prev, cidr: '' }));
                }} 
              />
              {subFieldErrors.cidr && <Text style={styles.fieldErrorText}>{subFieldErrors.cidr}</Text>}
            </View>
          </View>
          <Text style={styles.inputLabel}>Descripción u Observaciones</Text>
          <TextInput placeholder="Propósito de la VLAN..." placeholderTextColor="rgba(255, 255, 255, 0.25)" multiline numberOfLines={3} style={[styles.input, styles.textArea]} value={subDesc} onChangeText={setSubDesc} />
          <TouchableOpacity 
            style={[styles.modalSubmitButton, isSubmitting && { opacity: 0.6 }]} 
            disabled={isSubmitting} 
            activeOpacity={0.8} 
            onPress={handleSaveSubnet}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.modalSubmitButtonText}>Guardar Subred</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
  headerBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#0A84FF', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 26, color: '#FFFFFF', letterSpacing: 0.3 },
  headerSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255, 255, 255, 0.45)', marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, gap: 5 },
  addButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: '#000000' },
  networkList: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  networkCard: { padding: 18, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  networkInfo: { flex: 1 },
  networkTitleContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 5 },
  networkName: { fontFamily: 'Poppins_700Bold', fontSize: 16.5, color: '#FFFFFF' },
  cidrBadge: { backgroundColor: 'rgba(10, 132, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.3)', paddingHorizontal: 9, paddingVertical: 2.5, borderRadius: 7 },
  cidrText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: '#0A84FF' },
  networkDesc: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' },
  statsRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.7)' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expandButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5 },
  expandButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: '#FFFFFF' },
  cardControlButtons: { flexDirection: 'row', gap: 6 },
  iconActionButton: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  subnetsContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', gap: 8 },
  subnetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  subnetSectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: 1 },
  addSubnetSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addSubnetSmallText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: '#0A84FF' },
  emptySubnetText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic', paddingVertical: 6 },
  subnetItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  subnetMain: { flex: 1, paddingRight: 8 },
  subnetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  subnetName: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5, color: '#FFFFFF' },
  subnetCidrBadge: { backgroundColor: 'rgba(191, 90, 242, 0.15)', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 5 },
  subnetCidrText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#BF5AF2' },
  subnetDesc: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: 'rgba(255, 255, 255, 0.45)' },
  subnetSide: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deviceCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(48, 209, 88, 0.1)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  deviceCountText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5, color: '#30D158' },
  deleteSubnetBtn: { padding: 5 },
  inputLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 5 },
  input: { fontFamily: 'Poppins_400Regular', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 13, padding: 12, color: '#FFFFFF', fontSize: 13.5, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) as any },
  inputError: { borderColor: '#FF453A', backgroundColor: 'rgba(255, 69, 58, 0.06)' },
  fieldErrorText: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: '#FF453A', marginTop: -8, marginBottom: 10, marginLeft: 4 },
  modalErrorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 69, 58, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.3)', borderRadius: 11, padding: 10, marginBottom: 14, gap: 8 },
  modalErrorText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#FF453A', flex: 1 },
  formRow: { flexDirection: 'row', gap: 10 },
  textArea: { height: 60, textAlignVertical: 'top' },
  modalSubmitButton: { backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: 13, alignItems: 'center', marginTop: 8 },
  modalSubmitButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: '#000000' },
});
