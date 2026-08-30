import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  useWindowDimensions, 
  Platform,
  Alert
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import GlassModal from '../../components/ui/GlassModal';
import { MOCK_NETWORKS } from '../../mock/data';

export default function NetworkListScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  // Estado local para almacenar redes (inicializado con mock data)
  const [networks, setNetworks] = useState(MOCK_NETWORKS);
  const [expandedNetworkId, setExpandedNetworkId] = useState<string | null>('net-1');

  // Modales
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showSubnetModal, setShowSubnetModal] = useState(false);
  const [selectedNetworkForSubnet, setSelectedNetworkForSubnet] = useState<string>('net-1');

  // Formulario Red
  const [netName, setNetName] = useState('');
  const [netIp, setNetIp] = useState('');
  const [netCidr, setNetCidr] = useState('16');
  const [netDesc, setNetDesc] = useState('');

  // Formulario Subred
  const [subName, setSubName] = useState('');
  const [subIp, setSubIp] = useState('');
  const [subCidr, setSubCidr] = useState('24');
  const [subDesc, setSubDesc] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedNetworkId(expandedNetworkId === id ? null : id);
  };

  const handleOpenAddSubnet = (networkId: string) => {
    setSelectedNetworkForSubnet(networkId);
    setShowSubnetModal(true);
  };

  const handleSaveNetwork = () => {
    if (!netName || !netIp || !netCidr) return;
    const newNet = {
      id: `net-${Date.now()}`,
      name: netName,
      address: netIp,
      cidr: parseInt(netCidr, 10),
      description: netDesc || 'Nueva red creada',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subnet_count: 0,
      device_count: 0,
      subnets: [],
    };
    setNetworks([newNet, ...networks]);
    setShowNetworkModal(false);
    setNetName('');
    setNetIp('');
    setNetCidr('16');
    setNetDesc('');
  };

  const handleSaveSubnet = () => {
    if (!subName || !subIp || !subCidr) return;
    const newSubnet = {
      id: `sub-${Date.now()}`,
      network_id: selectedNetworkForSubnet,
      name: subName,
      address: subIp,
      cidr: parseInt(subCidr, 10),
      description: subDesc || 'Nueva subred creada',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      device_count: 0,
    };

    setNetworks(networks.map(net => {
      if (net.id === selectedNetworkForSubnet) {
        return {
          ...net,
          subnet_count: (net.subnet_count || 0) + 1,
          subnets: [...net.subnets, newSubnet],
        };
      }
      return net;
    }));

    setShowSubnetModal(false);
    setSubName('');
    setSubIp('');
    setSubCidr('24');
    setSubDesc('');
  };

  const handleDeleteNetwork = (id: string) => {
    setNetworks(networks.filter(n => n.id !== id));
  };

  const handleDeleteSubnet = (networkId: string, subnetId: string) => {
    setNetworks(networks.map(net => {
      if (net.id === networkId) {
        return {
          ...net,
          subnet_count: Math.max(0, (net.subnet_count || 1) - 1),
          subnets: net.subnets.filter(s => s.id !== subnetId),
        };
      }
      return net;
    }));
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
            <Text style={styles.headerBadge}>INFRAESTRUCTURA DE RED</Text>
            <Text style={styles.headerTitle}>Redes y Subredes</Text>
            <Text style={styles.headerSubtitle}>
              {networks.length} Redes Principales • {networks.reduce((acc, n) => acc + n.subnets.length, 0)} Subredes
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => setShowNetworkModal(true)}
          >
            <Feather name="plus" size={18} color="#000000" />
            <Text style={styles.addButtonText}>Nueva Red</Text>
          </TouchableOpacity>
        </View>

        {/* Listado de Redes */}
        <View style={styles.networkList}>
          {networks.map((net) => {
            const isExpanded = expandedNetworkId === net.id;

            return (
              <BlurView key={net.id} intensity={30} tint="dark" style={styles.networkCard}>
                {/* Cabecera de la Red */}
                <View style={styles.cardTopRow}>
                  <View style={styles.networkInfo}>
                    <View style={styles.networkTitleContainer}>
                      <Text style={styles.networkName}>{net.name}</Text>
                      <View style={styles.cidrBadge}>
                        <Text style={styles.cidrText}>{net.address}/{net.cidr}</Text>
                      </View>
                    </View>
                    <Text style={styles.networkDesc}>{net.description}</Text>
                  </View>
                </View>

                {/* Resumen de Métricas */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Feather name="layers" size={14} color="#BF5AF2" />
                    <Text style={styles.statText}>{net.subnets.length} Subredes</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Feather name="cpu" size={14} color="#30D158" />
                    <Text style={styles.statText}>{net.device_count || 0} Equipos</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Feather name="shield" size={14} color="#0A84FF" />
                    <Text style={styles.statText}>IPv4 Privada</Text>
                  </View>
                </View>

                {/* Barra de Acciones */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity 
                    style={styles.expandButton}
                    activeOpacity={0.7}
                    onPress={() => toggleExpand(net.id)}
                  >
                    <Text style={styles.expandButtonText}>
                      {isExpanded ? 'Ocultar Subredes' : `Ver Subredes (${net.subnets.length})`}
                    </Text>
                    <Feather 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>

                  <View style={styles.cardControlButtons}>
                    <TouchableOpacity 
                      style={styles.iconActionButton}
                      activeOpacity={0.7}
                      onPress={() => handleOpenAddSubnet(net.id)}
                    >
                      <Feather name="plus-circle" size={16} color="#0A84FF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.iconActionButton}
                      activeOpacity={0.7}
                      onPress={() => handleDeleteNetwork(net.id)}
                    >
                      <Feather name="trash-2" size={16} color="#FF453A" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Subredes Desplegables (Accordion) */}
                {isExpanded && (
                  <View style={styles.subnetsContainer}>
                    <View style={styles.subnetHeaderRow}>
                      <Text style={styles.subnetSectionTitle}>SUBREDES ASOCIADAS</Text>
                      <TouchableOpacity 
                        style={styles.addSubnetSmallBtn}
                        activeOpacity={0.7}
                        onPress={() => handleOpenAddSubnet(net.id)}
                      >
                        <Feather name="plus" size={12} color="#0A84FF" />
                        <Text style={styles.addSubnetSmallText}>Añadir Subred</Text>
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
                              <View style={styles.subnetCidrBadge}>
                                <Text style={styles.subnetCidrText}>{sub.address}/{sub.cidr}</Text>
                              </View>
                            </View>
                            <Text style={styles.subnetDesc}>{sub.description}</Text>
                          </View>
                          <View style={styles.subnetSide}>
                            <View style={styles.deviceCountBadge}>
                              <Feather name="cpu" size={12} color="#30D158" />
                              <Text style={styles.deviceCountText}>{sub.device_count || 0}</Text>
                            </View>
                            <TouchableOpacity 
                              style={styles.deleteSubnetBtn}
                              activeOpacity={0.7}
                              onPress={() => handleDeleteSubnet(net.id, sub.id)}
                            >
                              <Feather name="trash-2" size={14} color="rgba(255, 69, 58, 0.7)" />
                            </TouchableOpacity>
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

        {/* Modal Nueva Red Principal */}
        <GlassModal
          visible={showNetworkModal}
          onClose={() => setShowNetworkModal(false)}
          title="Crear Red Principal"
          subtitle="Define el direccionamiento IPv4 base y máscara"
        >
          <Text style={styles.inputLabel}>Nombre de la Red *</Text>
          <TextInput
            placeholder="ej. Red Administrativa Campus"
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            style={styles.input}
            value={netName}
            onChangeText={setNetName}
          />

          <View style={styles.formRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.inputLabel}>Dirección IPv4 Base *</Text>
              <TextInput
                placeholder="ej. 192.168.0.0"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                style={styles.input}
                value={netIp}
                onChangeText={setNetIp}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>CIDR (/)</Text>
              <TextInput
                placeholder="16"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                keyboardType="numeric"
                style={styles.input}
                value={netCidr}
                onChangeText={setNetCidr}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Descripción u Observaciones</Text>
          <TextInput
            placeholder="Detalles sobre el uso o alcance de esta red..."
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea]}
            value={netDesc}
            onChangeText={setNetDesc}
          />

          <TouchableOpacity 
            style={styles.modalSubmitButton}
            activeOpacity={0.8}
            onPress={handleSaveNetwork}
          >
            <Text style={styles.modalSubmitButtonText}>Guardar Red Principal</Text>
          </TouchableOpacity>
        </GlassModal>

        {/* Modal Nueva Subred */}
        <GlassModal
          visible={showSubnetModal}
          onClose={() => setShowSubnetModal(false)}
          title="Crear Subred (VLAN)"
          subtitle="Segmenta la red principal seleccionada"
        >
          <Text style={styles.inputLabel}>Nombre de la Subred *</Text>
          <TextInput
            placeholder="ej. VLAN 50 - Laboratorio Robótica"
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            style={styles.input}
            value={subName}
            onChangeText={setSubName}
          />

          <View style={styles.formRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.inputLabel}>Dirección IPv4 Subred *</Text>
              <TextInput
                placeholder="ej. 10.0.50.0"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                style={styles.input}
                value={subIp}
                onChangeText={setSubIp}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>CIDR (/)</Text>
              <TextInput
                placeholder="24"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                keyboardType="numeric"
                style={styles.input}
                value={subCidr}
                onChangeText={setSubCidr}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Descripción u Observaciones</Text>
          <TextInput
            placeholder="Propósito de la VLAN..."
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea]}
            value={subDesc}
            onChangeText={setSubDesc}
          />

          <TouchableOpacity 
            style={styles.modalSubmitButton}
            activeOpacity={0.8}
            onPress={handleSaveSubnet}
          >
            <Text style={styles.modalSubmitButtonText}>Guardar Subred</Text>
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
    marginBottom: 24,
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
  networkList: {
    gap: 18,
  },
  networkCard: {
    padding: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  networkInfo: {
    flex: 1,
  },
  networkTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  networkName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  cidrBadge: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cidrText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#0A84FF',
  },
  networkDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  expandButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  cardControlButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconActionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  subnetsContainer: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  subnetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subnetSectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
  },
  addSubnetSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addSubnetSmallText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#0A84FF',
  },
  emptySubnetText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  subnetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  subnetMain: {
    flex: 1,
    paddingRight: 10,
  },
  subnetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  subnetName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  subnetCidrBadge: {
    backgroundColor: 'rgba(191, 90, 242, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subnetCidrText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#BF5AF2',
  },
  subnetDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  subnetSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deviceCountText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#30D158',
  },
  deleteSubnetBtn: {
    padding: 6,
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
    height: 70,
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
