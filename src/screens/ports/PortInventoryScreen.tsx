import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import * as ports from '../../services/ports';
import { Device, SwitchPort } from '../../types';
import { isAdministrator } from '../../utils/permissions';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const details = error as Record<string, unknown>;
    return ['message', 'details', 'hint', 'code']
      .map(key => details[key])
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' · ') || 'Error desconocido del servidor.';
  }
  return typeof error === 'string' ? error : 'Error desconocido del servidor.';
}

export default function PortInventoryScreen({ devices }: { devices: Device[] }) {
  const { colors, isDark } = useTheme();
  const usedColor = isDark ? '#FF9F0A' : '#915400';
  const availableColor = isDark ? '#30D158' : '#176B3C';
  const { user } = useAuth();
  const canManagePorts = isAdministrator(user);
  const [portRecords, setPortRecords] = useState<SwitchPort[]>([]);
  const [selectedSwitchId, setSelectedSwitchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [screenError, setScreenError] = useState('');
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [portLabel, setPortLabel] = useState('');
  const [connectedDevice, setConnectedDevice] = useState('');
  const [notes, setNotes] = useState('');

  const switches = useMemo(
    () => devices.filter(device => /switch|conmutador/i.test(device.name)),
    [devices],
  );
  const selectedSwitch = switches.find(device => device.id === selectedSwitchId);
  const visiblePorts = portRecords.filter(port => port.switch_device_id === selectedSwitchId);
  const usedCount = visiblePorts.filter(port => port.status === 'in_use').length;
  const availableCount = visiblePorts.length - usedCount;

  const loadPorts = useCallback(async () => {
    setLoading(true);
    setScreenError('');
    try {
      setPortRecords(await ports.fetchSwitchPorts());
    } catch (error) {
      console.error('Error cargando el inventario de puertos:', error);
      setScreenError(`No se pudo cargar switch_ports desde InsForge: ${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setSelectedSwitchId(current => (
      switches.some(device => device.id === current) ? current : switches[0]?.id || ''
    ));
  }, [switches]);

  useFocusEffect(useCallback(() => {
    void loadPorts();
  }, [loadPorts]));

  const resetForm = () => {
    setPortLabel('');
    setConnectedDevice('');
    setNotes('');
    setFormError('');
  };

  const createPort = async () => {
    if (!canManagePorts) return;
    if (!selectedSwitchId) {
      setFormError('Selecciona un switch registrado.');
      return;
    }
    if (!portLabel.trim()) {
      setFormError('Escribe el identificador del puerto, por ejemplo Gi0/1.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await ports.createSwitchPort({
        switch_device_id: selectedSwitchId,
        port_label: portLabel,
        status: connectedDevice.trim() ? 'in_use' : 'available',
        connected_device: connectedDevice,
        notes,
      });
      resetForm();
      setShowForm(false);
      await loadPorts();
    } catch (error) {
      console.error('Error registrando puerto:', error);
      const message = errorMessage(error);
      setFormError(/unique|duplicate/i.test(message)
        ? 'Ese identificador ya está registrado en este switch.'
        : `No se pudo registrar el puerto: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const togglePortStatus = async (port: SwitchPort) => {
    if (!canManagePorts) return;
    const nextStatus = port.status === 'in_use' ? 'available' : 'in_use';
    setScreenError('');
    try {
      const updated = await ports.updateSwitchPort(port.id, {
        status: nextStatus,
        connected_device: nextStatus === 'available' ? '' : port.connected_device,
        notes: port.notes,
      });
      setPortRecords(current => current.map(record => record.id === updated.id
        ? { ...record, ...updated }
        : record));
    } catch (error) {
      console.error('Error actualizando el estado del puerto:', error);
      setScreenError(`No se pudo actualizar el puerto: ${errorMessage(error)}`);
    }
  };

  const content = (
    <>
      <Text style={[styles.eyebrow, { color: '#0A84FF' }]}>INVENTARIO DE RED</Text>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Puertos</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Consulta los puertos ocupados y disponibles por switch.
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Actualizar puertos"
          onPress={() => void loadPorts()}
          style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        >
          <Feather name="refresh-cw" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {screenError ? (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={17} color="#FF453A" />
          <Text style={styles.errorText}>{screenError}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Cargando puertos...</Text>
        </View>
      ) : switches.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Feather name="cpu" size={24} color="#0A84FF" />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No hay switches registrados</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Registra un dispositivo con “switch” o “conmutador” en el nombre para administrar sus puertos.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switchList}>
            {switches.map(device => {
              const selected = device.id === selectedSwitchId;
              return (
                <TouchableOpacity
                  key={device.id}
                  onPress={() => setSelectedSwitchId(device.id)}
                  style={[
                    styles.switchChip,
                    { backgroundColor: selected ? '#0A84FF' : colors.card, borderColor: selected ? '#0A84FF' : colors.cardBorder },
                  ]}
                >
                  <Feather name="server" size={15} color={selected ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.switchChipText, { color: selected ? '#FFFFFF' : colors.textPrimary }]}>
                    {device.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.metrics}>
            <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Registrados</Text>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{visiblePorts.length}</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>En uso</Text>
              <Text style={[styles.metricValue, { color: usedColor }]}>{usedCount}</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Libres</Text>
              <Text style={[styles.metricValue, { color: availableColor }]}>{availableCount}</Text>
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <View style={styles.sectionCopy}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{selectedSwitch?.name || 'Puertos del switch'}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {canManagePorts ? 'Toca el estado para cambiarlo.' : 'Consulta el estado de los puertos.'}
              </Text>
            </View>
            {canManagePorts && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => { resetForm(); setShowForm(true); }}
                style={styles.addButton}
              >
                <Feather name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            )}
          </View>

          {visiblePorts.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Feather name="git-branch" size={22} color="#0A84FF" />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Aún no hay puertos</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {canManagePorts
                  ? 'Agrega los puertos de este switch para controlar su disponibilidad.'
                  : 'Todavía no hay puertos registrados para este switch.'}
              </Text>
            </View>
          ) : visiblePorts.map(port => {
            const inUse = port.status === 'in_use';
            return (
              <View key={port.id} style={[styles.portCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={[styles.portIcon, { backgroundColor: inUse ? 'rgba(255,159,10,0.14)' : 'rgba(48,209,88,0.14)' }]}>
                  <Feather name="git-branch" size={18} color={inUse ? usedColor : availableColor} />
                </View>
                <View style={styles.portInfo}>
                  <Text style={[styles.portName, { color: colors.textPrimary }]}>{port.port_label}</Text>
                  <Text style={[styles.portDetails, { color: colors.textSecondary }]}>
                    {inUse ? `Conectado: ${port.connected_device || 'Equipo no especificado'}` : 'Sin equipo conectado'}
                  </Text>
                  {port.notes ? <Text style={[styles.portDetails, { color: colors.textTertiary }]}>{port.notes}</Text> : null}
                </View>
                {canManagePorts ? <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => void togglePortStatus(port)}
                  style={[styles.statusButton, { backgroundColor: inUse ? 'rgba(255,159,10,0.14)' : 'rgba(48,209,88,0.14)' }]}
                >
                  <Text style={{ color: inUse ? usedColor : availableColor, fontSize: 12, fontWeight: '700' }}>
                    {inUse ? 'En uso' : 'Libre'}
                  </Text>
                  <Feather name="repeat" size={13} color={inUse ? usedColor : availableColor} />
                </TouchableOpacity> : (
                  <View style={[styles.statusButton, { backgroundColor: inUse ? 'rgba(255,159,10,0.14)' : 'rgba(48,209,88,0.14)' }]}>
                    <Text style={{ color: inUse ? usedColor : availableColor, fontSize: 12, fontWeight: '700' }}>
                      {inUse ? 'En uso' : 'Libre'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}
    </>
  );

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{content}</ScrollView>
      </View>
      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeading}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Agregar puerto</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} accessibilityLabel="Cerrar">
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{selectedSwitch?.name}</Text>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Identificador del puerto *</Text>
            <TextInput
              value={portLabel}
              onChangeText={setPortLabel}
              placeholder="Ej. Gi0/1 o Fa0/24"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="characters"
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            />
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Equipo conectado (opcional)</Text>
            <TextInput
              value={connectedDevice}
              onChangeText={setConnectedDevice}
              placeholder="Nombre del dispositivo"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            />
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notas (opcional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Ubicación, VLAN u observaciones"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            />
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            <TouchableOpacity disabled={saving} onPress={() => void createPort()} style={[styles.saveButton, saving && styles.disabledButton]}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Guardar puerto</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 120, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 18 },
  titleCopy: { flex: 1, marginRight: 12 },
  title: { fontSize: 30, fontWeight: '700' },
  subtitle: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  iconButton: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,69,58,0.12)', marginBottom: 16 },
  errorText: { flex: 1, color: '#FF453A', fontSize: 12, lineHeight: 18 },
  loading: { alignItems: 'center', gap: 12, paddingVertical: 36 },
  emptyCard: { borderWidth: 1, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  switchList: { gap: 9, paddingBottom: 14 },
  switchChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  switchChipText: { fontSize: 12, fontWeight: '600' },
  metrics: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  metricCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10 },
  metricLabel: { fontSize: 10, lineHeight: 14 },
  metricValue: { fontSize: 22, fontWeight: '700', marginTop: 3 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  sectionCopy: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#0A84FF', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  portCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 13, padding: 11, marginBottom: 8 },
  portIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  portInfo: { flex: 1 },
  portName: { fontSize: 14, fontWeight: '700' },
  portDetails: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  statusButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 9 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', padding: 18 },
  modalCard: { width: '100%', maxWidth: 480, borderWidth: 1, borderRadius: 20, padding: 22 },
  modalHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, fontSize: 14 },
  saveButton: { minHeight: 46, backgroundColor: '#0A84FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  disabledButton: { opacity: 0.65 },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
