import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as api from '../../services/api';
import { DeviceConfig, Device } from '../../types';

export default function ConfigScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 900;

  const [configs, setConfigs] = useState<DeviceConfig[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<DeviceConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [configName, setConfigName] = useState('');
  const [configDesc, setConfigDesc] = useState('');
  const [configContent, setConfigContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [cfgs, devs] = await Promise.all([api.fetchConfigs(), api.fetchDevices()]);
      setConfigs(cfgs); setDevices(devs);
      if (cfgs.length > 0 && !selectedConfig) setSelectedConfig(cfgs[0]);
      if (devs.length > 0 && !selectedDeviceId) setSelectedDeviceId(devs[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const currentDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];

  const handleSimulateFileUpload = () => {
    const dummyFileNames = ['running-config-backup.cfg', 'cisco-sw-core-vlan.bak', 'mikrotik-routes-ospf.rsc', 'fortigate-firewall-rules.conf'];
    const picked = dummyFileNames[Math.floor(Math.random() * dummyFileNames.length)];
    setUploadedFileName(picked);
    if (!configName && currentDevice) setConfigName(`Backup automático ${picked.split('.')[0]}`);
    if (!configContent && currentDevice) {
      setConfigContent(
`! Backup de Configuración - ${picked}
! Generado el ${new Date().toLocaleDateString('es-MX')}
hostname ${currentDevice.name.replace(/\s+/g, '-')}
!
interface GigabitEthernet0/1
 description Enlace Principal Red LAN
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
 no shutdown
!
ip routing
ip route 0.0.0.0 0.0.0.0 10.0.10.254
!
end`
      );
    }
  };

  const handleSaveConfig = async () => {
    if (!configName || !currentDevice) return;
    try {
      await api.createConfig({
        name: configName,
        description: configDesc || 'Backup de configuración guardado por el administrador.',
        device_id: currentDevice.id,
        device_name: currentDevice.name,
        device_type: currentDevice.name.includes('Switch') ? 'Switch' : currentDevice.name.includes('Router') ? 'Router' : 'Equipo',
        file_name: uploadedFileName || `${configName.toLowerCase().replace(/\s+/g, '-')}.cfg`,
        file_size: `${(new Blob([configContent || '']).size / 1024).toFixed(1)} KB`,
        content: configContent || `! Configuración para ${currentDevice.name}\nversion 17.6\nhostname ${currentDevice.name}\nend`,
        author: 'Ing. Administrador',
      });
      setConfigName(''); setConfigDesc(''); setConfigContent(''); setUploadedFileName(null);
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteConfig = async (id: string) => {
    try {
      await api.deleteConfig(id);
      const updated = configs.filter(c => c.id !== id);
      setConfigs(updated);
      if (selectedConfig?.id === id) setSelectedConfig(updated[0] || null);
    } catch (err) { console.error(err); }
  };

  const handleCopyCode = () => {
    if (!selectedConfig) return;
    if (Platform.OS === 'web' && navigator?.clipboard) {
      navigator.clipboard.writeText(selectedConfig.content);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    }
  };

  if (loading) {
    return (<LinearGradient colors={['#050505', '#121212']} style={styles.container}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#0A84FF" /></View></LinearGradient>);
  }

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isDesktop ? '6%' : '4%' }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerBadge}>HISTORIAL & BACKUPS DE EQUIPOS</Text>
          <Text style={styles.headerTitle}>Configuraciones</Text>
          <Text style={styles.headerSubtitle}>Almacena, visualiza y respalda scripts de configuración de switches, routers y firewalls</Text>
        </View>
        <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
          <View style={[styles.leftColumn, isDesktop && styles.leftColumnDesktop]}>
            <BlurView intensity={30} tint="dark" style={styles.glassCard}>
              <Text style={styles.cardSectionTitle}>Cargar Configuración</Text>
              <Text style={styles.inputLabel}>Selecciona un dispositivo *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deviceChipsRow}>
                {devices.map(dev => {
                  const isSelected = selectedDeviceId === dev.id;
                  return (<TouchableOpacity key={dev.id} style={[styles.deviceChip, isSelected && styles.deviceChipActive]} onPress={() => setSelectedDeviceId(dev.id)}>
                    <Feather name={dev.name.includes('Switch') ? 'server' : 'radio'} size={12} color={isSelected ? '#000000' : '#0A84FF'} />
                    <Text style={[styles.deviceChipText, isSelected && styles.deviceChipTextActive]}>{dev.name}</Text>
                  </TouchableOpacity>);
                })}
              </ScrollView>
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}><Text style={styles.inputLabel}>Nombre de la configuración</Text><TextInput placeholder="ej. Backup VLANs & Trunk" placeholderTextColor="rgba(255, 255, 255, 0.25)" style={styles.input} value={configName} onChangeText={setConfigName} /></View>
                <View style={{ flex: 1 }}><Text style={styles.inputLabel}>Descripción</Text><TextInput placeholder="ej. Rutas OSPF hacia Edif B" placeholderTextColor="rgba(255, 255, 255, 0.25)" style={styles.input} value={configDesc} onChangeText={setConfigDesc} /></View>
              </View>
              <TouchableOpacity style={[styles.dropzone, uploadedFileName && styles.dropzoneActive]} activeOpacity={0.7} onPress={handleSimulateFileUpload}>
                <Feather name={uploadedFileName ? "check-circle" : "upload-cloud"} size={24} color={uploadedFileName ? "#30D158" : "#0A84FF"} />
                <Text style={styles.dropzoneTitle}>{uploadedFileName ? `Archivo cargado: ${uploadedFileName}` : 'Seleccionar archivo de configuración'}</Text>
                <Text style={styles.dropzoneSubtitle}>Formatos soportados: .sh, .bak, .txt, .cfg, .rsc (Máx 1 MB)</Text>
              </TouchableOpacity>
              <Text style={styles.inputLabel}>O pega el script / comandos CLI aquí:</Text>
              <TextInput placeholder={"interface GigabitEthernet0/1\nswitchport mode trunk\n..."} placeholderTextColor="rgba(255, 255, 255, 0.25)" multiline numberOfLines={3} style={[styles.input, styles.codeTextArea]} value={configContent} onChangeText={setConfigContent} />
              <TouchableOpacity style={styles.submitBtn} activeOpacity={0.8} onPress={handleSaveConfig}><Feather name="send" size={15} color="#FFFFFF" /><Text style={styles.submitBtnText}>Enviar configuración</Text></TouchableOpacity>
            </BlurView>
            <BlurView intensity={30} tint="dark" style={[styles.glassCard, { marginTop: 20 }]}>
              <Text style={styles.cardSectionTitle}>Backups Recientes</Text>
              <View style={styles.backupList}>
                {configs.map((cfg) => {
                  const isViewing = selectedConfig?.id === cfg.id;
                  return (<View key={cfg.id} style={[styles.backupItem, isViewing && styles.backupItemActive]}>
                    <View style={{ flex: 1, paddingRight: 10 }}><Text style={styles.backupName}>{cfg.name}</Text><Text style={styles.backupMeta}>{cfg.device_name} • {cfg.file_name} ({cfg.file_size})</Text></View>
                    <View style={styles.backupActions}>
                      <TouchableOpacity style={[styles.actionPill, styles.actionPillView]} activeOpacity={0.7} onPress={() => setSelectedConfig(cfg)}><Text style={styles.actionPillViewText}>Ver</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.actionPill, styles.actionPillDelete]} activeOpacity={0.7} onPress={() => handleDeleteConfig(cfg.id)}><Text style={styles.actionPillDeleteText}>Eliminar</Text></TouchableOpacity>
                    </View>
                  </View>);
                })}
                {configs.length === 0 && <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Poppins_400Regular', fontSize: 13 }}>No hay configuraciones guardadas.</Text>}
              </View>
            </BlurView>
          </View>
          <View style={[styles.rightColumn, isDesktop && styles.rightColumnDesktop]}>
            <View style={styles.terminalWindow}>
              <View style={styles.terminalHeader}>
                <View style={styles.macButtons}><View style={[styles.macDot, { backgroundColor: '#FF5F56' }]} /><View style={[styles.macDot, { backgroundColor: '#FFBD2E' }]} /><View style={[styles.macDot, { backgroundColor: '#27C93F' }]} /></View>
                <Text style={styles.terminalTitle} numberOfLines={1}>{selectedConfig ? selectedConfig.file_name : 'Sin archivo cargado'}</Text>
                {selectedConfig && (<TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode} activeOpacity={0.7}><Feather name={copiedSuccess ? "check" : "copy"} size={13} color="#FFFFFF" /><Text style={styles.copyBtnText}>{copiedSuccess ? "Copiado" : "Copiar"}</Text></TouchableOpacity>)}
              </View>
              {selectedConfig ? (
                <ScrollView style={styles.codeContainer} showsVerticalScrollIndicator={true}>
                  <View style={styles.codeContentRow}>
                    <View style={styles.lineNumbersCol}>{selectedConfig.content.split('\n').map((_, index) => (<Text key={index} style={styles.lineNumberText}>{index + 1}</Text>))}</View>
                    <View style={styles.codeLinesCol}>{selectedConfig.content.split('\n').map((line, index) => {
                      const isComment = line.startsWith('!') || line.startsWith('#');
                      const isCommand = line.startsWith('interface') || line.startsWith('vlan') || line.startsWith('router') || line.startsWith('config');
                      const isProperty = line.trim().startsWith('set') || line.trim().startsWith('switchport') || line.trim().startsWith('ip');
                      let color = '#E2E8F0'; if (isComment) color = '#64748B'; else if (isCommand) color = '#60A5FA'; else if (isProperty) color = '#34D399';
                      return (<Text key={index} style={[styles.codeLineText, { color }]}>{line || ' '}</Text>);
                    })}</View>
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.emptyTerminal}><Feather name="file-text" size={54} color="rgba(255, 255, 255, 0.15)" /><Text style={styles.emptyTerminalTitle}>Sin archivo cargado</Text><Text style={styles.emptyTerminalSubtitle}>Selecciona un backup de la lista o sube un nuevo archivo de configuración para visualizar sus comandos CLI</Text></View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, scrollContent: { paddingTop: 50, paddingBottom: 120 },
  header: { marginBottom: 24 }, headerBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#0A84FF', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 26, color: '#FFFFFF', letterSpacing: 0.3 },
  headerSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255, 255, 255, 0.45)', marginTop: 2 },
  mainLayout: { flexDirection: 'column', gap: 20 }, mainLayoutDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  leftColumn: { width: '100%' }, leftColumnDesktop: { width: '48%' }, rightColumn: { width: '100%' }, rightColumnDesktop: { width: '50%' },
  glassCard: { padding: 20, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  cardSectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#FFFFFF', marginBottom: 14 },
  deviceChipsRow: { marginBottom: 14 },
  deviceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', marginRight: 8 },
  deviceChipActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  deviceChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: 'rgba(255, 255, 255, 0.7)' },
  deviceChipTextActive: { color: '#000000' },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  inputLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: 'rgba(255, 255, 255, 0.65)', marginBottom: 5 },
  input: { fontFamily: 'Poppins_400Regular', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 12, color: '#FFFFFF', fontSize: 13, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) as any },
  dropzone: { borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.2)', borderStyle: 'dashed', borderRadius: 16, padding: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)', marginBottom: 14 },
  dropzoneActive: { borderColor: '#30D158', backgroundColor: 'rgba(48, 209, 88, 0.05)' },
  dropzoneTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FFFFFF', marginTop: 6 },
  dropzoneSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', marginTop: 2 },
  codeTextArea: { height: 75, textAlignVertical: 'top', fontFamily: 'monospace', fontSize: 12 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0A84FF', paddingVertical: 14, borderRadius: 14, marginTop: 4, shadowColor: '#0A84FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
  submitBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' },
  backupList: { gap: 10 },
  backupItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  backupItemActive: { borderColor: '#0A84FF', backgroundColor: 'rgba(10, 132, 255, 0.08)' },
  backupName: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FFFFFF' },
  backupMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(255, 255, 255, 0.45)', marginTop: 2 },
  backupActions: { flexDirection: 'row', gap: 6 },
  actionPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  actionPillView: { backgroundColor: 'rgba(48, 209, 88, 0.15)', borderWidth: 1, borderColor: 'rgba(48, 209, 88, 0.3)' },
  actionPillViewText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#30D158' },
  actionPillDelete: { backgroundColor: 'rgba(255, 69, 58, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.3)' },
  actionPillDeleteText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#FF453A' },
  terminalWindow: { borderRadius: 24, overflow: 'hidden', backgroundColor: '#0A0A0E', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)', minHeight: 520, shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.6, shadowRadius: 24 },
  terminalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#121218', borderBottomWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  macButtons: { flexDirection: 'row', gap: 6 }, macDot: { width: 10, height: 10, borderRadius: 5 },
  terminalTitle: { fontFamily: 'monospace', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', maxWidth: 220 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  copyBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#FFFFFF' },
  codeContainer: { padding: 16, maxHeight: 520 }, codeContentRow: { flexDirection: 'row' },
  lineNumbersCol: { paddingRight: 14, borderRightWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'flex-end' },
  lineNumberText: { fontFamily: 'monospace', fontSize: 11, color: 'rgba(255, 255, 255, 0.25)', lineHeight: 18 },
  codeLinesCol: { paddingLeft: 14, flex: 1 },
  codeLineText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  emptyTerminal: { alignItems: 'center', justifyContent: 'center', padding: 40, minHeight: 460 },
  emptyTerminalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#FFFFFF', marginTop: 14 },
  emptyTerminalSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', marginTop: 6, maxWidth: 320, lineHeight: 18 },
});
