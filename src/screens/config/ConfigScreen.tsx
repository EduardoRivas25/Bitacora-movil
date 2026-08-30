import React, { useState, useCallback, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  useWindowDimensions, 
  Platform, 
  ActivityIndicator
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as api from '../../services/api';
import { DeviceConfig, Device } from '../../types';

export default function ConfigScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 900;
  const navigation = useNavigation<any>();

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
        author: 'Administrador',
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
  const handleCopyCode = () => {
    if (!configContent) return;
    if (Platform.OS === 'web' && navigator?.clipboard) {
      navigator.clipboard.writeText(configContent);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
      showFeedback('¡Copiado al portapapeles!');
    }
  };

  if (loading && configs.length === 0 && devices.length === 0) {
    return (
      <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins_400Regular', marginTop: 12 }}>
            Cargando configuraciones y dispositivos desde base de datos...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  const lineCount = configContent ? configContent.split('\n').length : 1;

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
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
          { paddingHorizontal: isDesktop ? '6%' : '4%' }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerBadge}>HISTORIAL & BACKUPS DE EQUIPOS</Text>
            <Text style={styles.headerTitle}>Configuraciones</Text>
            <Text style={styles.headerSubtitle}>
              Almacena, visualiza y edita scripts de configuración en tiempo real desde la base de datos
            </Text>
          </View>

          {/* Botón Nuevo en Blanco */}
          <TouchableOpacity 
            style={styles.newConfigBtn} 
            activeOpacity={0.8}
            onPress={handleClearEditor}
          >
            <Feather name="file-plus" size={16} color="#FFFFFF" />
            <Text style={styles.newConfigBtnText}>Nuevo Script</Text>
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
            <Text style={styles.toastText}>{statusMsg.text}</Text>
          </View>
        )}

        {/* Layout 2 Columnas */}
        <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
          
          {/* COLUMNA IZQUIERDA: Formulario de Carga y Lista de Backups */}
          <View style={[styles.leftColumn, isDesktop && styles.leftColumnDesktop]}>
            
            {/* Tarjeta: Cargar Archivo y Metadatos */}
            <BlurView intensity={30} tint="dark" style={styles.glassCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTitle}>
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
                  <Text style={styles.inputLabel}>Dispositivo asociado en BD ({devices.length} disponibles) *</Text>
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
                  <View style={styles.selectedDeviceCard}>
                    <View style={styles.selectedDeviceIconBadge}>
                      <Feather name={getDeviceIcon(currentDevice.name)} size={18} color="#0A84FF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedDeviceName}>{currentDevice.name}</Text>
                      <Text style={styles.selectedDeviceMeta}>
                        IPv4: <Text style={{ color: '#0A84FF', fontWeight: '600' }}>{currentDevice.ipv4_address}</Text> • {currentDevice.location || 'Sin ubicación'}
                      </Text>
                    </View>
                    <View style={styles.deviceTypeBadge}>
                      <Text style={styles.deviceTypeBadgeText}>{currentDevice.manufacturer || 'Red'}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noDeviceBanner}>
                    <Text style={styles.noDeviceText}>No hay dispositivos en la base de datos.</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Dispositivos')}>
                      <Text style={styles.addDeviceLink}>+ Registrar Dispositivo</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Lista Expandible de Dispositivos en BD */}
                {showDeviceDropdown && (
                  <View style={styles.deviceDropdownContainer}>
                    <View style={styles.deviceSearchBox}>
                      <Feather name="search" size={14} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
                      <TextInput
                        placeholder="Buscar por nombre, IP o ubicación..."
                        placeholderTextColor="rgba(255,255,255,0.25)"
                        style={styles.deviceSearchInput}
                        value={deviceSearchQuery}
                        onChangeText={setDeviceSearchQuery}
                      />
                      {deviceSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setDeviceSearchQuery('')}>
                          <Feather name="x" size={14} color="rgba(255,255,255,0.5)" />
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
                              color={isSelected ? '#0A84FF' : 'rgba(255,255,255,0.5)'} 
                              style={{ marginRight: 10 }}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.deviceDropdownName, isSelected && styles.deviceDropdownNameActive]}>
                                {dev.name}
                              </Text>
                              <Text style={styles.deviceDropdownSub}>
                                {dev.ipv4_address} • {dev.location}
                              </Text>
                            </View>
                            {isSelected && <Feather name="check" size={16} color="#0A84FF" />}
                          </TouchableOpacity>
                        );
                      })}
                      {filteredDevices.length === 0 && (
                        <Text style={styles.noDeviceFound}>No se encontraron dispositivos con "{deviceSearchQuery}"</Text>
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
                          style={[styles.deviceChip, isSelected && styles.deviceChipActive]}
                          onPress={() => setSelectedDeviceId(dev.id)}
                        >
                          <Feather 
                            name={getDeviceIcon(dev.name)} 
                            size={12} 
                            color={isSelected ? '#000000' : '#0A84FF'} 
                          />
                          <Text style={[styles.deviceChipText, isSelected && styles.deviceChipTextActive]}>
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
                  <Text style={styles.inputLabel}>Nombre de la configuración *</Text>
                  <TextInput
                    placeholder="ej. Backup VLANs & Ruteo"
                    placeholderTextColor="rgba(255, 255, 255, 0.25)"
                    style={styles.input}
                    value={configName}
                    onChangeText={setConfigName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Descripción</Text>
                  <TextInput
                    placeholder="ej. Backup de enlaces troncales"
                    placeholderTextColor="rgba(255, 255, 255, 0.25)"
                    style={styles.input}
                    value={configDesc}
                    onChangeText={setConfigDesc}
                  />
                </View>
              </View>

              {/* Dropzone de Archivo Real con soporte Drag & Drop */}
              <TouchableOpacity 
                style={[
                  styles.dropzone, 
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
                <Text style={styles.dropzoneTitle}>
                  {uploadedFileName ? `Archivo: ${uploadedFileName}` : 'Subir archivo o arrastrar aquí'}
                </Text>
                <Text style={styles.dropzoneSubtitle}>
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
                      style={[styles.actionButton, styles.saveAsNewBtn]}
                      activeOpacity={0.8}
                      onPress={handleSaveNewConfig}
                      disabled={isSaving}
                    >
                      <Feather name="plus-circle" size={15} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Guardar como Nuevo</Text>
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
            <BlurView intensity={30} tint="dark" style={[styles.glassCard, { marginTop: 20 }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTitle}>Backups en Base de Datos</Text>
                <Text style={styles.badgeCount}>{configs.length} guardados</Text>
              </View>

              <View style={styles.backupList}>
                {configs.map((cfg) => {
                  const isViewing = selectedConfig?.id === cfg.id;

                  return (
                    <TouchableOpacity 
                      key={cfg.id} 
                      style={[styles.backupItem, isViewing && styles.backupItemActive]}
                      activeOpacity={0.7}
                      onPress={() => handleSelectSavedBackup(cfg)}
                    >
                      <View style={styles.backupItemLeft}>
                        <View style={[styles.cfgIconBadge, isViewing && styles.cfgIconBadgeActive]}>
                          <Feather 
                            name="file-text" 
                            size={16} 
                            color={isViewing ? '#0A84FF' : 'rgba(255,255,255,0.6)'} 
                          />
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.backupName} numberOfLines={1}>{cfg.name}</Text>
                          <Text style={styles.backupMeta}>
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
                    <Feather name="folder" size={32} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.emptyBackupsText}>
                      No hay configuraciones guardadas en la base de datos.
                    </Text>
                  </View>
                )}
              </View>
            </BlurView>
          </View>

          {/* COLUMNA DERECHA: Consola Terminal y Editor Interactivo */}
          <View style={[styles.rightColumn, isDesktop && styles.rightColumnDesktop]}>
            <View style={styles.terminalWindow}>
              
              {/* Barra Superior estilo Terminal macOS */}
              <View style={styles.terminalHeader}>
                <View style={styles.macButtons}>
                  <View style={[styles.macDot, { backgroundColor: '#FF5F56' }]} />
                  <View style={[styles.macDot, { backgroundColor: '#FFBD2E' }]} />
                  <View style={[styles.macDot, { backgroundColor: '#27C93F' }]} />
                </View>

                <View style={styles.terminalTitleBlock}>
                  <Feather name="terminal" size={13} color="#0A84FF" style={{ marginRight: 6 }} />
                  <Text style={styles.terminalTitle} numberOfLines={1}>
                    {uploadedFileName || selectedConfig?.file_name || 'editor-consola.cfg'}
                  </Text>
                </View>

                <View style={styles.terminalControls}>
                  {configContent.length > 0 && (
                    <TouchableOpacity 
                      style={styles.terminalBtn}
                      onPress={handleCopyCode}
                      activeOpacity={0.7}
                    >
                      <Feather name={copiedSuccess ? "check" : "copy"} size={12} color="#FFFFFF" />
                      <Text style={styles.terminalBtnText}>{copiedSuccess ? "¡Copiado!" : "Copiar"}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity 
                    style={[styles.terminalBtn, styles.clearBtn]}
                    onPress={handleClearEditor}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash" size={12} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.terminalBtnText}>Limpiar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Barra Informativa de Estado del Editor */}
              <View style={styles.terminalSubHeader}>
                <Text style={styles.terminalMetaText}>
                  {lineCount} líneas • {((configContent.length) / 1024).toFixed(1)} KB • Dispositivo: {currentDevice?.name || 'No asignado'}
                </Text>
                <Text style={styles.terminalHintText}>
                  ✏️ Puedes escribir o editar comandos directamente aquí
                </Text>
              </View>

              {/* Editor en Consola */}
              <View style={styles.terminalBody}>
                {/* Columna de Números de Línea */}
                <View style={styles.lineNumbersCol}>
                  {Array.from({ length: Math.max(lineCount, 15) }).map((_, idx) => (
                    <Text key={idx} style={styles.lineNumberText}>
                      {idx + 1}
                    </Text>
                  ))}
                </View>

                {/* Área de Texto Editable */}
                <TextInput
                  placeholder="! Escribe o pega aquí los comandos de configuración CLI (Cisco, MikroTik, Fortinet, etc.)&#10;! O sube un archivo desde la columna izquierda&#10;hostname Router-Principal&#10;interface GigabitEthernet0/1&#10; ip address 10.0.10.1 255.255.255.0&#10; no shutdown&#10;end"
                  placeholderTextColor="rgba(255, 255, 255, 0.2)"
                  multiline
                  style={styles.terminalTextArea}
                  value={configContent}
                  onChangeText={setConfigContent}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Pie de Terminal con Acciones Rápidas */}
              <View style={styles.terminalFooter}>
                <Text style={styles.terminalFooterInfo}>
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
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
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
