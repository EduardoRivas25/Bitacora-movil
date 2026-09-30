import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  useWindowDimensions, 
  Platform, 
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../contexts/ThemeContext';
import * as api from '../../services/api';
import { DeviceConfig, Device } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { validateRequired } from '../../utils/validators';
import PasswordRecoveryScreen from '../auth/PasswordRecoveryScreen';

const UTILITY_TABS = ['Notificaciones', 'Perfil', 'Seguridad', 'Preferencias', 'Acerca de'];

export default function ConfigScreen() {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const isDesktop = width > 900;
  const navigation = useNavigation<any>();
  const { user, updateProfile } = useAuth();

  const [configs, setConfigs] = useState<DeviceConfig[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<DeviceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Formulario y Editor
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const [configName, setConfigName] = useState('');
  const [configDesc, setConfigDesc] = useState('');
  const [configContent, setConfigContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('0 KB');
  const [isDragging, setIsDragging] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedUtility, setSelectedUtility] = useState('Notificaciones');
  const [profileName, setProfileName] = useState(user?.profile?.name || '');
  const [profileArea, setProfileArea] = useState(typeof user?.profile?.area === 'string' ? user.profile.area : '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);

  useEffect(() => {
    setProfileName(user?.profile?.name || '');
    setProfileArea(typeof user?.profile?.area === 'string' ? user.profile.area : '');
  }, [user?.id, user?.profile?.name, user?.profile?.area]);

  const handleSaveProfile = async () => {
    const name = validateRequired(profileName.trim(), 2, 'El nombre');
    if (!name.valid) { showFeedback(name.error || 'Ingresa tu nombre.', 'error'); return; }
    try {
      setSavingProfile(true);
      await updateProfile({ name: profileName, area: profileArea });
      api.invalidateCache('incidents');
      showFeedback('Perfil actualizado');
    } catch (err: any) {
      showFeedback(err?.message || 'No se pudo actualizar el perfil.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Ref para input de archivo en Web
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && configs.length === 0 && devices.length === 0) setLoading(true);
      const [cfgs, devs] = await Promise.all([api.fetchConfigs(isSilent), api.fetchDevices(isSilent)]);
      setConfigs(cfgs);
      setDevices(devs);
      if (devs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(devs[0].id);
      }
    } catch (err) {
      console.error('Error cargando datos de BD:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDeviceId, configs.length, devices.length]);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

  const currentDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];

  // Filtrado de dispositivos para el selector
  const filteredDevices = useMemo(() => {
    if (!deviceSearchQuery.trim()) return devices;
    const q = deviceSearchQuery.toLowerCase().trim();
    return devices.filter(d => 
      d.name.toLowerCase().includes(q) ||
      d.ipv4_address.toLowerCase().includes(q) ||
      d.location.toLowerCase().includes(q) ||
      d.manufacturer.toLowerCase().includes(q)
    );
  }, [devices, deviceSearchQuery]);

  // Helper para iconos de dispositivos
  const getDeviceIcon = (name: string): keyof typeof Feather.glyphMap => {
    const l = (name || '').toLowerCase();
    if (l.includes('switch')) return 'server';
    if (l.includes('router') || l.includes('gateway')) return 'radio';
    if (l.includes('servidor') || l.includes('proliant')) return 'hard-drive';
    if (l.includes('point') || l.includes('unifi') || l.includes('ap')) return 'wifi';
    if (l.includes('firewall') || l.includes('fortigate')) return 'shield';
    return 'cpu';
  };

  // Mostrar mensaje de feedback
  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Procesar archivo de texto leído
  const handleProcessFile = (name: string, sizeBytes: number, textContent: string) => {
    const sizeKb = `${(sizeBytes / 1024).toFixed(1)} KB`;
    setUploadedFileName(name);
    setUploadedFileSize(sizeKb);
    if (!configName) {
      const baseName = name.replace(/\.[^/.]+$/, '');
      setConfigName(`Backup ${baseName}`);
    }
    setConfigContent(textContent);
    showFeedback(`Archivo "${name}" cargado exitosamente (${sizeKb})`);
  };

  // Abrir selector de archivos real
  const handleOpenFilePicker = async () => {
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    } else {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['text/*', 'application/x-sh', 'application/json', '*/*'],
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const response = await fetch(asset.uri);
          const text = await response.text();
          handleProcessFile(asset.name, asset.size || text.length, text);
        }
      } catch (err) {
        console.error('Error abriendo archivo en móvil:', err);
        showFeedback('No se pudo abrir el archivo', 'error');
      }
    }
  };

  // Web: Manejador de evento change del input file
  const handleWebFileChange = (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleProcessFile(file.name, file.size, content || '');
    };
    reader.onerror = () => {
      showFeedback('Error al leer el archivo seleccionado', 'error');
    };
    reader.readAsText(file);
  };

  // Web Drag and Drop
  const handleWebDrop = (e: any) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleProcessFile(file.name, file.size, content || '');
    };
    reader.onerror = () => {
      showFeedback('Error al leer el archivo arrastrado', 'error');
    };
    reader.readAsText(file);
  };

  // Guardar configuración nueva en Base de Datos
  const handleSaveNewConfig = async () => {
    if (isSaving) return;
    if (!configName.trim()) {
      showFeedback('Ingresa un nombre para la configuración', 'error');
      return;
    }
    if (!currentDevice) {
      showFeedback('Selecciona un dispositivo de la base de datos', 'error');
      return;
    }
    if (!configContent || !configContent.trim()) {
      showFeedback('El contenido del archivo de configuración no puede estar vacío', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const fileName = uploadedFileName || `${configName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.cfg`;
      const sizeStr = uploadedFileSize !== '0 KB' 
        ? uploadedFileSize 
        : `${((configContent.length) / 1024).toFixed(1)} KB`;

      const created = await api.createConfig({
        name: configName.trim(),
        description: configDesc.trim() || 'Configuración guardada desde panel',
        device_id: currentDevice.id,
        device_name: currentDevice.name,
        device_type: currentDevice.name.includes('Switch') ? 'Switch' : currentDevice.name.includes('Router') ? 'Router' : 'Equipo',
        file_name: fileName,
        file_size: sizeStr,
        content: configContent,
        author: user?.profile?.name?.trim()
          ? `${user.profile.name.trim()} (${user.email})`
          : user?.email || 'Usuario',
      });

      showFeedback('Configuración guardada en la base de datos');
      setSelectedConfig(created);
      loadData(true);
    } catch (err: any) {
      console.error(err);
      showFeedback(err?.message || 'Error al guardar configuración', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Actualizar configuración existente en Base de Datos
  const handleUpdateExistingConfig = async () => {
    if (isSaving) return;
    if (!selectedConfig) return;
    if (!configContent || !configContent.trim()) {
      showFeedback('El contenido de la configuración no puede estar vacío', 'error');
      return;
    }
    try {
      setIsSaving(true);
      const sizeStr = `${((configContent.length) / 1024).toFixed(1)} KB`;
      const updated = await api.updateConfig(selectedConfig.id, {
        name: configName.trim() || selectedConfig.name,
        description: configDesc.trim() || selectedConfig.description,
        content: configContent,
        file_size: sizeStr,
      });

      showFeedback('Cambios guardados en la base de datos');
      setSelectedConfig(updated);
      loadData(true);
    } catch (err: any) {
      console.error(err);
      showFeedback(err?.message || 'Error al actualizar configuración', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Seleccionar un backup guardado para ver/editar en la consola
  const handleSelectSavedBackup = (cfg: DeviceConfig) => {
    setSelectedConfig(cfg);
    setSelectedDeviceId(cfg.device_id);
    setConfigName(cfg.name);
    setConfigDesc(cfg.description);
    setConfigContent(cfg.content);
    setUploadedFileName(cfg.file_name);
    setUploadedFileSize(cfg.file_size);
    showFeedback(`Cargado en consola: ${cfg.file_name}`);
  };

  // Limpiar editor / Nuevo documento en blanco
  const handleClearEditor = () => {
    setSelectedConfig(null);
    setConfigName('');
    setConfigDesc('');
    setConfigContent('');
    setUploadedFileName(null);
    setUploadedFileSize('0 KB');
    showFeedback('Editor reiniciado en blanco');
  };

  // Eliminar configuración de Base de Datos
  const handleDeleteConfig = async (id: string) => {
    // Actualización optimista instantánea (0ms)
    const prevConfigs = [...configs];
    setConfigs(prev => prev.filter(c => c.id !== id));
    if (selectedConfig?.id === id) {
      handleClearEditor();
    }
    showFeedback('Configuración eliminada de la base de datos');
    try {
      await api.deleteConfig(id);
    } catch (err: any) {
      console.error(err);
      setConfigs(prevConfigs);
      showFeedback(err?.message || 'Error al eliminar', 'error');
    }
  };

  // Copiar contenido al portapapeles
  const handleCopyCode = async () => {
    if (!configContent) return;

    if (Platform.OS === 'web' && navigator?.clipboard) {
      await navigator.clipboard.writeText(configContent);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
      showFeedback('¡Copiado al portapapeles!');
      return;
    }

    if (Platform.OS !== 'web') {
      showFeedback('La copia no está disponible en esta plataforma.', 'error');
      return;
    }

    showFeedback('No se pudo acceder al portapapeles del navegador.', 'error');
  };

  if (loading && configs.length === 0 && devices.length === 0) {
    return (
      <LinearGradient colors={colors.gradient} style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins_400Regular', marginTop: 12 }}>
            Cargando configuraciones y dispositivos desde base de datos...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  const lineCount = configContent ? configContent.split('\n').length : 1;

  const isSmallMobile = width < 380;
  const notificationList = [
    { title: 'Cambio de acceso', detail: 'Se aprobo el acceso del usuario Ana García', type: 'success' },
    { title: 'Incidente crítico', detail: 'Se registró una caída en el firewall principal', type: 'danger' },
    { title: 'Copia de seguridad', detail: 'Se generó la réplica del segmento interno', type: 'info' },
  ];

  const profileSummary = [
    { label: 'Correo', value: user?.email || 'No disponible' },
  ];

  if (showPasswordRecovery) {
    return <PasswordRecoveryScreen initialEmail={user?.email || ''} onBack={() => setShowPasswordRecovery(false)} />;
  }

  const documentLinks = [
    'Infraestructura general',
    'Bitácora de operaciones',
    'Incidentes de red',
    'Usuarios y accesos',
    'Segmentación por VLAN',
  ];

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      {/* Input oculto para carga de archivos en Web */}
      {Platform.OS === 'web' && (
        <input
          type="file"
          ref={fileInputRef as any}
          style={{ display: 'none' }}
          accept=".txt,.cfg,.bak,.conf,.rsc,.sh,.json,text/plain"
          onChange={handleWebFileChange}
        />
      )}

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingHorizontal: isDesktop ? '6%' : isTablet ? '4%' : 16 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={styles.headerBadge}>HISTORIAL & BACKUPS DE EQUIPOS</Text>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }, isSmallMobile && { fontSize: 22 }]}>Configuraciones</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Almacena, visualiza y edita scripts de configuración en tiempo real desde la base de datos
              </Text>
            </View>

            {/* Botón Nuevo en Blanco */}
            <TouchableOpacity 
              style={styles.newConfigBtn} 
              activeOpacity={0.8}
              onPress={handleClearEditor}
            >
              <Feather name="file-plus" size={15} color="#0A84FF" />
              <Text style={[styles.newConfigBtnText, { color: '#0A84FF' }]}>Nuevo Script</Text>
            </TouchableOpacity>
          </View>

          {/* Notificación flotante de estado */}
          {statusMsg && (
            <View style={[
              styles.toastBanner, 
              statusMsg.type === 'error' ? styles.toastError : styles.toastSuccess
            ]}>
              <Feather 
                name={statusMsg.type === 'error' ? 'alert-circle' : 'check-circle'} 
                size={16} 
                color={statusMsg.type === 'error' ? '#FF453A' : '#30D158'} 
              />
              <Text style={[styles.toastText, { color: colors.textPrimary }]}>{statusMsg.text}</Text>
            </View>
          )}

          <BlurView intensity={colors.blurIntensity} tint={colors.blurTint} style={[styles.utilityCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.utilityHeader}>
              <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>Sistema y configuración</Text>
              <View style={styles.editingBadge}>
                <Text style={styles.editingBadgeText}>Panel administrativo</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.utilityTabsRow}>
              {UTILITY_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  activeOpacity={0.8}
                  onPress={() => setSelectedUtility(tab)}
                  style={[
                    styles.utilityTab, 
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.cardBorder },
                    selectedUtility === tab && styles.utilityTabActive
                  ]}
                >
                  <Text style={[styles.utilityTabText, { color: colors.textSecondary }, selectedUtility === tab && styles.utilityTabTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedUtility === 'Notificaciones' && (
              <View style={[styles.utilityContent, { borderColor: colors.divider }]}>
                {notificationList.map((item, index) => (
                  <View key={`${item.title}-${index}`} style={styles.utilityItem}>
                    <View style={[styles.utilityMarker, { backgroundColor: item.type === 'success' ? '#30D158' : item.type === 'danger' ? '#FF453A' : '#0A84FF' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.utilityItemTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.utilityItemText, { color: colors.textSecondary }]}>{item.detail}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {selectedUtility === 'Perfil' && (
              <View style={[styles.utilityContent, { borderColor: colors.divider }]}>
                <Text style={[styles.utilityItemTitle, { color: colors.textPrimary }]}>Tu perfil</Text>
                <TextInput
                  accessibilityLabel="Nombre completo"
                  placeholder="Nombre completo"
                  placeholderTextColor={colors.placeholder}
                  value={profileName}
                  onChangeText={setProfileName}
                  style={[styles.profileInput, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                />
                <TextInput
                  accessibilityLabel="Área de trabajo"
                  placeholder="Área de trabajo (opcional)"
                  placeholderTextColor={colors.placeholder}
                  value={profileArea}
                  onChangeText={setProfileArea}
                  style={[styles.profileInput, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                />
                <TouchableOpacity style={styles.profileSaveButton} disabled={savingProfile} onPress={handleSaveProfile}>
                  <Text style={styles.profileSaveText}>{savingProfile ? 'Guardando...' : 'Guardar perfil'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.profileSaveButton, { backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.chipBorder }]} onPress={() => setShowPasswordRecovery(true)}>
                  <Text style={[styles.profileSaveText, { color: colors.textPrimary }]}>Cambiar contraseña</Text>
                </TouchableOpacity>
                {profileSummary.map((item) => (
                  <View key={item.label} style={[styles.profileRow, { borderColor: colors.divider }]}>
                    <Text style={[styles.profileLabel, { color: colors.textTertiary }]}>{item.label}</Text>
                    <Text style={[styles.profileValue, { color: colors.textPrimary }]}>{item.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {selectedUtility === 'Seguridad' && (
              <View style={[styles.utilityContent, { borderColor: colors.divider }]}>
                <Text style={[styles.utilityItemTitle, { color: colors.textPrimary }]}>Autenticación y seguridad</Text>
                <Text style={[styles.utilityItemText, { color: colors.textSecondary }]}>Para cambiar tu contraseña, enviaremos un código a {user?.email || 'tu correo'}.</Text>
                <TouchableOpacity style={styles.profileSaveButton} onPress={() => setShowPasswordRecovery(true)}>
                  <Text style={styles.profileSaveText}>Cambiar contraseña</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedUtility === 'Preferencias' && (
              <View style={[styles.utilityContent, { borderColor: colors.divider }]}>
                <Text style={[styles.utilityItemText, { color: colors.textSecondary }]}>Tema visual: {isDark ? 'Oscuro' : 'Claro'}</Text>
                <Text style={[styles.utilityItemText, { color: colors.textSecondary }]}>Notificaciones: Activadas</Text>
                <Text style={[styles.utilityItemText, { color: colors.textSecondary }]}>Idioma: Español</Text>
                <Text style={[styles.utilityItemText, { color: colors.textSecondary }]}>Área predeterminada: Infraestructura</Text>
              </View>
            )}

            {selectedUtility === 'Acerca de' && (
              <View style={[styles.utilityContent, { borderColor: colors.divider }]}>
                <Text style={[styles.utilityItemTitle, { color: colors.textPrimary }]}>Bitácora Digital</Text>
                <Text style={[styles.utilityItemText, { color: colors.textSecondary }]}>Sistema para registrar cambios, incidentes, infraestructura, usuarios y reportes administrativos.</Text>
                <Text style={[styles.utilityItemText, { color: colors.textSecondary }]}>Versión: 1.0.0 • Componentes: React Native + Expo + InsForge</Text>
              </View>
            )}
          </BlurView>

          {/* Layout 2 Columnas */}
          <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
          
          {/* COLUMNA IZQUIERDA: Formulario de Carga y Lista de Backups */}
          <View style={[styles.leftColumn, isDesktop && styles.leftColumnDesktop]}>
            
            {/* Tarjeta: Cargar Archivo y Metadatos */}
            <BlurView intensity={colors.blurIntensity} tint={colors.blurTint} style={[styles.glassCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>
                  {selectedConfig ? 'Editar Configuración Guardada' : 'Cargar o Crear Configuración'}
                </Text>
                {selectedConfig && (
                  <View style={styles.editingBadge}>
                    <Text style={styles.editingBadgeText}>Modo Edición</Text>
                  </View>
                )}
              </View>

              {/* 🎯 SECCIÓN: Selector Completo de Dispositivos en BD */}
              <View style={styles.deviceSectionWrapper}>
                <View style={styles.deviceSectionHeader}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Dispositivo asociado en BD ({devices.length} disponibles) *</Text>
                  <TouchableOpacity 
                    style={styles.toggleDropdownBtn}
                    onPress={() => setShowDeviceDropdown(!showDeviceDropdown)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.toggleDropdownText}>
                      {showDeviceDropdown ? 'Ocultar lista' : 'Ver todos'}
                    </Text>
                    <Feather name={showDeviceDropdown ? "chevron-up" : "chevron-down"} size={14} color="#0A84FF" />
                  </TouchableOpacity>
                </View>

                {/* Tarjeta Resumen del Dispositivo Seleccionado */}
                {currentDevice ? (
                  <View style={[
                    styles.selectedDeviceCard, 
                    { 
                      backgroundColor: isDark ? 'rgba(10, 132, 255, 0.08)' : 'rgba(10, 132, 255, 0.06)',
                      borderColor: isDark ? 'rgba(10, 132, 255, 0.25)' : 'rgba(10, 132, 255, 0.2)' 
                    }
                  ]}>
                    <View style={styles.selectedDeviceIconBadge}>
                      <Feather name={getDeviceIcon(currentDevice.name)} size={18} color="#0A84FF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.selectedDeviceName, { color: colors.textPrimary }]}>{currentDevice.name}</Text>
                      <Text style={[styles.selectedDeviceMeta, { color: colors.textSecondary }]}>
                        IPv4: <Text style={{ color: '#0A84FF', fontWeight: '600' }}>{currentDevice.ipv4_address}</Text> • {currentDevice.location || 'Sin ubicación'}
                      </Text>
                    </View>
                    <View style={[styles.deviceTypeBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
                      <Text style={[styles.deviceTypeBadgeText, { color: colors.textSecondary }]}>{currentDevice.manufacturer || 'Red'}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noDeviceBanner}>
                    <Text style={[styles.noDeviceText, { color: colors.textSecondary }]}>No hay dispositivos en la base de datos.</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Dispositivos')}>
                      <Text style={styles.addDeviceLink}>+ Registrar Dispositivo</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Lista Expandible de Dispositivos en BD */}
                {showDeviceDropdown && (
                  <View style={[styles.deviceDropdownContainer, { backgroundColor: isDark ? 'rgba(20, 20, 26, 0.98)' : 'rgba(245, 245, 247, 0.98)', borderColor: colors.cardBorder }]}>
                    <View style={[styles.deviceSearchBox, { backgroundColor: colors.searchBg, borderColor: colors.searchBorder }]}>
                      <Feather name="search" size={14} color={colors.textTertiary} style={{ marginRight: 8 }} />
                      <TextInput
                        placeholder="Buscar por nombre, IP o ubicación..."
                        placeholderTextColor={colors.placeholder}
                        style={[styles.deviceSearchInput, { color: colors.textPrimary }]}
                        value={deviceSearchQuery}
                        onChangeText={setDeviceSearchQuery}
                      />
                      {deviceSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setDeviceSearchQuery('')}>
                          <Feather name="x" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView style={styles.deviceDropdownList} nestedScrollEnabled>
                      {filteredDevices.map(dev => {
                        const isSelected = selectedDeviceId === dev.id;
                        return (
                          <TouchableOpacity
                            key={dev.id}
                            style={[styles.deviceDropdownItem, isSelected && styles.deviceDropdownItemActive]}
                            onPress={() => {
                              setSelectedDeviceId(dev.id);
                              setShowDeviceDropdown(false);
                            }}
                          >
                            <Feather 
                              name={getDeviceIcon(dev.name)} 
                              size={14} 
                              color={isSelected ? '#0A84FF' : colors.textTertiary} 
                              style={{ marginRight: 10 }}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.deviceDropdownName, { color: colors.textPrimary }]}>
                                {dev.name}
                              </Text>
                              <Text style={[styles.deviceDropdownSub, { color: colors.textSecondary }]}>
                                {dev.ipv4_address} • {dev.location}
                              </Text>
                            </View>
                            {isSelected && <Feather name="check" size={16} color="#0A84FF" />}
                          </TouchableOpacity>
                        );
                      })}
                      {filteredDevices.length === 0 && (
                        <Text style={[styles.noDeviceFound, { color: colors.textTertiary }]}>No se encontraron dispositivos con "{deviceSearchQuery}"</Text>
                      )}
                    </ScrollView>
                  </View>
                )}

                {/* Chips rápidos horizontales si el dropdown está cerrado */}
                {!showDeviceDropdown && devices.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deviceChipsRow}>
                    {devices.map(dev => {
                      const isSelected = selectedDeviceId === dev.id;
                      return (
                        <TouchableOpacity
                          key={dev.id}
                          style={[
                            styles.deviceChip, 
                            { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                            isSelected && { backgroundColor: colors.chipActiveBg, borderColor: colors.chipActiveBg }
                          ]}
                          onPress={() => setSelectedDeviceId(dev.id)}
                        >
                          <Feather 
                            name={getDeviceIcon(dev.name)} 
                            size={12} 
                            color={isSelected ? colors.chipActiveText : '#0A84FF'} 
                          />
                          <Text style={[
                            styles.deviceChipText, 
                            { color: colors.textSecondary },
                            isSelected && { color: colors.chipActiveText }
                          ]}>
                            {dev.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* Nombre y Descripción */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nombre de la configuración *</Text>
                  <TextInput
                    placeholder="ej. Backup VLANs & Ruteo"
                    placeholderTextColor={colors.placeholder}
                    style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                    value={configName}
                    onChangeText={setConfigName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Descripción</Text>
                  <TextInput
                    placeholder="ej. Backup de enlaces troncales"
                    placeholderTextColor={colors.placeholder}
                    style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                    value={configDesc}
                    onChangeText={setConfigDesc}
                  />
                </View>
              </View>

              {/* Dropzone de Archivo Real con soporte Drag & Drop */}
              <TouchableOpacity 
                style={[
                  styles.dropzone, 
                  { borderColor: colors.cardBorder, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' },
                  uploadedFileName && styles.dropzoneActive,
                  isDragging && styles.dropzoneDragging
                ]}
                activeOpacity={0.7}
                onPress={handleOpenFilePicker}
                {...(Platform.OS === 'web' ? {
                  onDragOver: (e: any) => { e.preventDefault(); setIsDragging(true); },
                  onDragLeave: () => setIsDragging(false),
                  onDrop: handleWebDrop,
                } as any : {})}
              >
                <Feather 
                  name={uploadedFileName ? "check-circle" : "upload-cloud"} 
                  size={26} 
                  color={uploadedFileName ? "#30D158" : "#0A84FF"} 
                />
                <Text style={[styles.dropzoneTitle, { color: colors.textPrimary }]}>
                  {uploadedFileName ? `Archivo: ${uploadedFileName}` : 'Subir archivo o arrastrar aquí'}
                </Text>
                <Text style={[styles.dropzoneSubtitle, { color: colors.textSecondary }]}>
                  Archivos soportados: .txt, .cfg, .bak, .conf, .rsc, .sh (Se cargará en la consola lateral)
                </Text>
              </TouchableOpacity>

              {/* Botones de Guardar */}
              <View style={styles.saveButtonsRow}>
                {selectedConfig ? (
                  <>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.updateBtn, isSaving && { opacity: 0.6 }]}
                      activeOpacity={0.8}
                      onPress={handleUpdateExistingConfig}
                      disabled={isSaving}
                    >
                      <Feather name="save" size={15} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>
                        {isSaving ? 'Guardando...' : 'Guardar Cambios en BD'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionButton, styles.saveAsNewBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                      activeOpacity={0.8}
                      onPress={handleSaveNewConfig}
                      disabled={isSaving}
                    >
                      <Feather name="plus-circle" size={15} color={colors.textPrimary} />
                      <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>Guardar como Nuevo</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.createBtn, isSaving && { opacity: 0.6 }]}
                    activeOpacity={0.8}
                    onPress={handleSaveNewConfig}
                    disabled={isSaving}
                  >
                    <Feather name="database" size={15} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>
                      {isSaving ? 'Guardando en BD...' : 'Guardar en Base de Datos'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </BlurView>

            {/* Tarjeta: Backups Guardados en BD */}
            <BlurView intensity={colors.blurIntensity} tint={colors.blurTint} style={[styles.glassCard, { marginTop: 20, backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>Backups en Base de Datos</Text>
                <Text style={[styles.badgeCount, { color: colors.textTertiary }]}>{configs.length} guardados</Text>
              </View>

              <View style={styles.backupList}>
                {configs.map((cfg) => {
                  const isViewing = selectedConfig?.id === cfg.id;

                  return (
                    <TouchableOpacity 
                      key={cfg.id} 
                      style={[
                        styles.backupItem, 
                        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', borderColor: colors.cardBorder },
                        isViewing && styles.backupItemActive
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleSelectSavedBackup(cfg)}
                    >
                      <View style={styles.backupItemLeft}>
                        <View style={[styles.cfgIconBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }, isViewing && styles.cfgIconBadgeActive]}>
                          <Feather 
                            name="file-text" 
                            size={16} 
                            color={isViewing ? '#0A84FF' : colors.textSecondary} 
                          />
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={[styles.backupName, { color: colors.textPrimary }]} numberOfLines={1}>{cfg.name}</Text>
                          <Text style={[styles.backupMeta, { color: colors.textSecondary }]}>
                            {cfg.device_name} • {cfg.file_name} ({cfg.file_size || 'N/A'})
                          </Text>
                        </View>
                      </View>

                      <View style={styles.backupActions}>
                        <TouchableOpacity 
                          style={[styles.actionPill, isViewing ? styles.actionPillActive : styles.actionPillView]}
                          activeOpacity={0.7}
                          onPress={() => handleSelectSavedBackup(cfg)}
                        >
                          <Text style={[styles.actionPillText, isViewing ? { color: '#FFFFFF' } : { color: '#0A84FF' }]}>
                            {isViewing ? 'Viendo' : 'Ver'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.actionPill, styles.actionPillDelete]}
                          activeOpacity={0.7}
                          onPress={() => handleDeleteConfig(cfg.id)}
                        >
                          <Feather name="trash-2" size={13} color="#FF453A" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {configs.length === 0 && (
                  <View style={styles.emptyBackups}>
                    <Feather name="folder" size={32} color={colors.textTertiary} />
                    <Text style={[styles.emptyBackupsText, { color: colors.textTertiary }]}>
                      No hay configuraciones guardadas en la base de datos.
                    </Text>
                  </View>
                )}
              </View>
            </BlurView>
          </View>

          {/* COLUMNA DERECHA: Consola Terminal y Editor Interactivo */}
          <View style={[styles.rightColumn, isDesktop && styles.rightColumnDesktop]}>
            <View style={[styles.terminalWindow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              
              {/* Barra Superior estilo Terminal macOS */}
              <View style={[styles.terminalHeader, { backgroundColor: colors.card, borderColor: colors.divider }]}>
                <View style={styles.macButtons}>
                  <View style={[styles.macDot, { backgroundColor: '#FF5F56' }]} />
                  <View style={[styles.macDot, { backgroundColor: '#FFBD2E' }]} />
                  <View style={[styles.macDot, { backgroundColor: '#27C93F' }]} />
                </View>

                <View style={styles.terminalTitleBlock}>
                  <Feather name="terminal" size={13} color="#0A84FF" style={{ marginRight: 6 }} />
                  <Text style={[styles.terminalTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {uploadedFileName || selectedConfig?.file_name || 'editor-consola.cfg'}
                  </Text>
                </View>

                <View style={styles.terminalControls}>
                  {configContent.length > 0 && (
                    <TouchableOpacity 
                      style={[styles.terminalBtn, { backgroundColor: colors.chipBg }]}
                      onPress={handleCopyCode}
                      activeOpacity={0.7}
                    >
                      <Feather name={copiedSuccess ? "check" : "copy"} size={12} color={colors.textPrimary} />
                      <Text style={[styles.terminalBtnText, { color: colors.textPrimary }]}>{copiedSuccess ? "¡Copiado!" : "Copiar"}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity 
                    style={[styles.terminalBtn, styles.clearBtn]}
                    onPress={handleClearEditor}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash" size={12} color={colors.textPrimary} />
                    <Text style={[styles.terminalBtnText, { color: colors.textPrimary }]}>Limpiar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Barra Informativa de Estado del Editor */}
              <View style={[styles.terminalSubHeader, { backgroundColor: colors.chipBg, borderColor: colors.divider }]}>
                <Text style={[styles.terminalMetaText, { color: colors.textSecondary }]}>
                  {lineCount} líneas • {((configContent.length) / 1024).toFixed(1)} KB • Dispositivo: {currentDevice?.name || 'No asignado'}
                </Text>
                <Text style={[styles.terminalHintText, { color: colors.textTertiary }]}>
                  ✏️ Puedes escribir o editar comandos directamente aquí
                </Text>
              </View>

              {/* Editor en Consola */}
              <View style={[styles.terminalBody, { backgroundColor: colors.card }]}>
                {/* Columna de Números de Línea */}
                <View style={[styles.lineNumbersCol, { backgroundColor: colors.chipBg, borderColor: colors.divider }]}>
                  {Array.from({ length: Math.max(lineCount, 15) }).map((_, idx) => (
                    <Text key={idx} style={[styles.lineNumberText, { color: colors.textTertiary }]}>
                      {idx + 1}
                    </Text>
                  ))}
                </View>

                {/* Área de Texto Editable */}
                <TextInput
                  placeholder="! Escribe o pega aquí los comandos de configuración CLI (Cisco, MikroTik, Fortinet, etc.)&#10;! O sube un archivo desde la columna izquierda&#10;hostname Router-Principal&#10;interface GigabitEthernet0/1&#10; ip address 10.0.10.1 255.255.255.0&#10; no shutdown&#10;end"
                  placeholderTextColor={colors.placeholder}
                  multiline
                  style={[styles.terminalTextArea, { color: colors.textPrimary }]}
                  value={configContent}
                  onChangeText={setConfigContent}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Pie de Terminal con Acciones Rápidas */}
              <View style={[styles.terminalFooter, { backgroundColor: colors.card, borderColor: colors.divider }]}>
                <Text style={[styles.terminalFooterInfo, { color: colors.textSecondary }]}>
                  {selectedConfig ? `Editando: ${selectedConfig.name}` : 'Documento nuevo sin guardar'}
                </Text>
                {selectedConfig && (
                  <TouchableOpacity 
                    style={styles.quickSaveBtn}
                    onPress={handleUpdateExistingConfig}
                    activeOpacity={0.8}
                  >
                    <Feather name="check" size={13} color="#FFFFFF" />
                    <Text style={styles.quickSaveBtnText}>Guardar en BD</Text>
                  </TouchableOpacity>
                )}
              </View>

            </View>
          </View>

        </View>
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
    paddingTop: 45,
    paddingBottom: 110,
  },
  innerWrapper: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    flexWrap: 'wrap',
    gap: 10,
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
    fontSize: 26,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  newConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  newConfigBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  toastSuccess: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  toastError: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  toastText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
    flex: 1,
  },
  utilityCard: {
    padding: 18,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  utilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  utilityTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  utilityTab: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  utilityTabActive: {
    borderColor: 'rgba(10, 132, 255, 0.5)',
    backgroundColor: 'rgba(10, 132, 255, 0.16)',
  },
  utilityTabText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
  },
  utilityTabTextActive: {
    color: '#0A84FF',
  },
  utilityContent: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  utilityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 9,
  },
  utilityMarker: {
    width: 8,
    height: 8,
    marginTop: 6,
    borderRadius: 4,
  },
  utilityItemTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 3,
  },
  utilityItemText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 4,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  profileLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  profileValue: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'right',
  },
  profileInput: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  profileSaveButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 14,
    marginBottom: 12,
  },
  profileSaveText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  mainLayout: {
    flexDirection: 'column',
    gap: 20,
  },
  mainLayoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftColumn: {
    width: '100%',
  },
  leftColumnDesktop: {
    width: '46%',
  },
  rightColumn: {
    width: '100%',
  },
  rightColumnDesktop: {
    width: '52%',
  },
  glassCard: {
    padding: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardSectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  editingBadge: {
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  editingBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#FF9F0A',
  },
  badgeCount: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  deviceSectionWrapper: {
    marginBottom: 16,
  },
  deviceSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  toggleDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  toggleDropdownText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#0A84FF',
  },
  selectedDeviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  selectedDeviceIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectedDeviceName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  selectedDeviceMeta: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1,
  },
  deviceTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deviceTypeBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  deviceDropdownContainer: {
    backgroundColor: 'rgba(20, 20, 26, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
  },
  deviceSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  deviceSearchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#FFFFFF',
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }) as any,
  },
  deviceDropdownList: {
    maxHeight: 180,
  },
  deviceDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  deviceDropdownItemActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
  },
  deviceDropdownName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  deviceDropdownNameActive: {
    color: '#FFFFFF',
  },
  deviceDropdownSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  noDeviceFound: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    paddingVertical: 12,
  },
  noDeviceBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.2)',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noDeviceText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  addDeviceLink: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#0A84FF',
  },
  deviceChipsRow: {
    marginBottom: 12,
  },
  deviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
  },
  deviceChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  deviceChipText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  deviceChipTextActive: {
    color: '#000000',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  inputLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginBottom: 5,
  },
  input: {
    fontFamily: 'Poppins_400Regular',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 12,
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }) as any,
  },
  dropzone: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginBottom: 14,
  },
  dropzoneActive: {
    borderColor: '#30D158',
    backgroundColor: 'rgba(48, 209, 88, 0.06)',
  },
  dropzoneDragging: {
    borderColor: '#0A84FF',
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
  },
  dropzoneTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 6,
    textAlign: 'center',
  },
  dropzoneSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
    textAlign: 'center',
  },
  saveButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  createBtn: {
    backgroundColor: '#0A84FF',
  },
  updateBtn: {
    backgroundColor: '#30D158',
  },
  saveAsNewBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  backupList: {
    gap: 8,
  },
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  backupItemActive: {
    borderColor: '#0A84FF',
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
  },
  backupItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cfgIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cfgIconBadgeActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
  },
  backupName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  backupMeta: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 1,
  },
  backupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionPillView: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
  },
  actionPillActive: {
    backgroundColor: '#0A84FF',
  },
  actionPillText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  actionPillDelete: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.25)',
  },
  emptyBackups: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyBackupsText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
  terminalWindow: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0A0A0E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 560,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#121218',
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  macButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  macDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  terminalTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  terminalTitle: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  terminalControls: {
    flexDirection: 'row',
    gap: 6,
  },
  terminalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearBtn: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  terminalBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  terminalSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  terminalMetaText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  terminalHintText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  terminalBody: {
    flexDirection: 'row',
    minHeight: 460,
    backgroundColor: '#0A0A0E',
  },
  lineNumbersCol: {
    width: 44,
    paddingVertical: 14,
    paddingRight: 10,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'flex-end',
  },
  lineNumberText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.25)',
    lineHeight: 20,
  },
  terminalTextArea: {
    flex: 1,
    padding: 14,
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 20,
    textAlignVertical: 'top',
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }) as any,
  },
  terminalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#121218',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  terminalFooterInfo: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  quickSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#30D158',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickSaveBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
});
