import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { countReportRows, fetchReportDataset, ReportArea, ReportDataset, REPORT_AREAS, getReportSummary } from '../../services/reports';
import { generateAndShareReport } from '../../services/reportPdf';

const REPORT_ICONS: Record<ReportArea, keyof typeof Feather.glyphMap> = {
  networks: 'wifi',
  devices: 'cpu',
  buildings: 'map-pin',
  incidents: 'alert-triangle',
  maintenance: 'tool',
  activity: 'clock',
  complete: 'book-open',
};

const TONE_COLORS: Record<NonNullable<ReturnType<typeof getReportSummary>[number]['tone']>, string> = {
  blue: '#0A84FF',
  green: '#30D158',
  orange: '#FF9F0A',
  red: '#FF453A',
  muted: '#8E8E93',
};

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function validISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const [area, setArea] = useState<ReportArea>('networks');
  const [from, setFrom] = useState(todayISO);
  const [to, setTo] = useState(todayISO);
  const [dataset, setDataset] = useState<ReportDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const columns = width >= 900 ? 3 : width >= 540 ? 2 : 1;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDataset(await fetchReportDataset());
    } catch (cause) {
      console.error('Error cargando datos de reportes:', cause);
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los datos del reporte.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadData();
  }, [loadData]));

  const rangeIsValid = validISODate(from) && validISODate(to) && from <= to;
  const selectedArea = REPORT_AREAS.find(item => item.id === area)!;
  const recordCount = useMemo(
    () => dataset && rangeIsValid ? countReportRows(dataset, area, from, to) : 0,
    [area, dataset, from, rangeIsValid, to],
  );
  const summary = useMemo(() => dataset ? getReportSummary(dataset) : [], [dataset]);

  const generatePdf = async () => {
    setError('');
    setMessage('');
    if (!rangeIsValid) {
      setError('Escribe fechas válidas en formato AAAA-MM-DD y confirma que la fecha inicial no sea posterior a la final.');
      return;
    }
    if (!dataset) {
      setError('No hay datos cargados para generar el reporte. Actualiza la información e inténtalo de nuevo.');
      return;
    }

    setGenerating(true);
    try {
      const displayName = user?.profile?.name?.trim() || user?.email || 'Usuario';
      await generateAndShareReport({ area, from, to, createdBy: displayName });
      if (Platform.OS === 'web') {
        setMessage('Se abrió la ventana de impresión. Elige “Guardar como PDF” para descargarlo.');
      } else {
        setMessage('Reporte PDF generado.');
      }
    } catch (cause) {
      console.error('Error generando el PDF:', cause);
      setError(cause instanceof Error ? cause.message : 'No se pudo generar el documento PDF.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>REPORTES Y DOCUMENTOS</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Bitácora</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Genera un PDF con la información registrada en redes, dispositivos, edificios y actividad.
        </Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={17} color="#FF453A" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void loadData()} accessibilityLabel="Actualizar datos">
              <Feather name="refresh-cw" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        ) : null}
        {message ? (
          <View style={styles.successBanner}>
            <Feather name="check-circle" size={17} color="#30D158" />
            <Text style={styles.successText}>{message}</Text>
          </View>
        ) : null}

        {dataset ? (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.summaryHeading}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Resumen ejecutivo</Text>
              <Text style={[styles.summaryCaption, { color: colors.textSecondary }]}>Inventario actual</Text>
            </View>
            <View style={styles.summaryGrid}>
              {summary.map(item => (
                <View key={item.label} style={[styles.summaryItem, { borderLeftColor: TONE_COLORS[item.tone || 'blue'] }]}>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{item.value}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Selecciona el área del reporte</Text>
        <View style={styles.areaGrid}>
          {REPORT_AREAS.map(item => {
            const selected = area === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => { setArea(item.id); setMessage(''); }}
                style={[
                  styles.areaCard,
                  {
                    width: `${100 / columns - 1.4}%`,
                    backgroundColor: selected ? colors.buttonBg : colors.card,
                    borderColor: selected ? colors.buttonBg : colors.cardBorder,
                  },
                ]}
              >
                <Feather name={REPORT_ICONS[item.id]} size={18} color={selected ? colors.buttonText : '#0A84FF'} />
                <Text style={[styles.areaText, { color: selected ? colors.buttonText : colors.textPrimary }]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 24 }]}>
          Periodo del reporte
        </Text>
        <View style={styles.dateRow}>
          <TextInput
            accessibilityLabel="Fecha inicial"
            value={from}
            onChangeText={value => { setFrom(value); setMessage(''); }}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.placeholder}
            style={[styles.dateInput, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          />
          <TextInput
            accessibilityLabel="Fecha final"
            value={to}
            onChangeText={value => { setTo(value); setMessage(''); }}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.placeholder}
            style={[styles.dateInput, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Actualizar vista previa"
            onPress={() => void loadData()}
            style={[styles.refreshButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Feather name="search" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.previewIcon}>
            <Feather name="file-text" size={20} color="#0A84FF" />
          </View>
          <View style={styles.previewCopy}>
            <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>{selectedArea.title}</Text>
            <Text style={[styles.previewMeta, { color: colors.textSecondary }]}>
              {loading ? 'Actualizando registros...' : `${recordCount} registro(s) incluido(s)`}
            </Text>
            <Text style={[styles.previewMeta, { color: colors.textTertiary }]}>
              El PDF incluirá los datos del periodo seleccionado.
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Volver a cargar registros"
            onPress={() => void loadData()}
            style={[styles.iconButton, { backgroundColor: colors.inputBg }]}
          >
            <Feather name="refresh-cw" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          disabled={generating || loading}
          onPress={() => void generatePdf()}
          style={[styles.generateButton, (generating || loading) && { opacity: 0.65 }]}
        >
          {generating
            ? <ActivityIndicator color="#111827" />
            : <Feather name="download" size={18} color="#111827" />}
          <Text style={styles.generateButtonText}>{generating ? 'Generando PDF...' : 'Generar PDF'}</Text>
        </TouchableOpacity>
        <Text style={[styles.helpText, { color: colors.textTertiary }]}>
          {Platform.OS === 'web'
            ? 'En web, usa “Guardar como PDF” en el diálogo de impresión.'
            : 'Se abrirán las opciones para guardar o compartir el documento PDF.'}
        </Text>
        <Text style={[styles.helpText, { color: colors.textTertiary }]}>
          El resumen refleja el inventario actual. Las tablas incluyen registros fechados dentro del periodo; el sistema no conserva el historial de cada edición.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 125, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  eyebrow: { color: '#0A84FF', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 30, fontWeight: '700', marginTop: 5 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 22 },
  errorBanner: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(255,69,58,0.12)', padding: 13, borderRadius: 12, marginBottom: 18 },
  errorText: { color: '#FF453A', fontSize: 12, lineHeight: 18, flex: 1 },
  successBanner: { flexDirection: 'row', gap: 9, alignItems: 'center', backgroundColor: 'rgba(48,209,88,0.12)', padding: 13, borderRadius: 12, marginBottom: 18 },
  successText: { color: '#30D158', fontSize: 12, lineHeight: 18, flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  summaryCard: { borderWidth: 1, borderRadius: 15, padding: 14, marginBottom: 22 },
  summaryHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  summaryCaption: { fontSize: 10 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryItem: { flexGrow: 1, flexBasis: '30%', borderLeftWidth: 3, backgroundColor: 'rgba(128,128,128,0.08)', padding: 9, borderRadius: 7 },
  summaryValue: { fontSize: 17, fontWeight: '700' },
  summaryLabel: { fontSize: 10, marginTop: 3 },
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  areaCard: { minHeight: 62, borderRadius: 14, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  areaText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  dateRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dateInput: { flex: 1, minWidth: 0, height: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 11, fontSize: 12 },
  refreshButton: { width: 42, height: 44, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  previewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 15, marginTop: 20 },
  previewIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(10,132,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  previewCopy: { flex: 1 },
  previewTitle: { fontSize: 14, fontWeight: '700' },
  previewMeta: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  iconButton: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  generateButton: { minHeight: 48, borderRadius: 12, backgroundColor: '#FFFFFF', marginTop: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  generateButtonText: { color: '#111827', fontSize: 14, fontWeight: '700' },
  helpText: { textAlign: 'center', fontSize: 11, marginTop: 9 },
});
