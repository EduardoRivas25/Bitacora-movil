import React, { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

/**
 * Miniaturas de las pantallas reales de la app.
 * Se usan en el onboarding para que el usuario vea al fondo la pantalla que se explica.
 * Son ilustraciones estáticas (sin datos reales, sin interacción).
 */

export type PreviewScreenId = 'dashboard' | 'infrastructure' | 'map' | 'control' | 'config' | 'search';

/** Tamaño base del lienzo de cada miniatura (se escala para ajustarse al espacio disponible). */
export const PREVIEW_BASE_WIDTH = 420;
export const PREVIEW_BASE_HEIGHT = 288;

const SURFACE = '#101114';
const SURFACE_ALT = '#17181D';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = 'rgba(255,255,255,0.92)';
const TEXT_DIM = 'rgba(255,255,255,0.55)';
const TEXT_FAINT = 'rgba(255,255,255,0.30)';

/* ─────────────────── Primitivas ─────────────────── */

function Bar({ w, h = 6, color = 'rgba(255,255,255,0.18)', style }: {
  w: number | `${number}%`; h?: number; color?: string; style?: ViewStyle;
}) {
  return <View style={[{ width: w, height: h, borderRadius: h, backgroundColor: color }, style]} />;
}

function Dot({ size = 8, color }: { size?: number; color: string }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

function Tile({ children, style, accent }: {
  children: React.ReactNode; style?: ViewStyle; accent?: string;
}) {
  return (
    <View
      style={[
        styles.tile,
        accent ? { borderColor: `${accent}33`, backgroundColor: `${accent}0F` } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

function StatChip({ icon, value, label, color }: {
  icon: keyof typeof Feather.glyphMap; value: string; label: string; color: string;
}) {
  return (
    <Tile style={styles.statChip}>
      <View style={[styles.statIcon, { backgroundColor: `${color}1F`, borderColor: `${color}40` }]}>
        <Feather name={icon} size={11} color={color} />
      </View>
      <View style={styles.statTexts}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
    </Tile>
  );
}

function ListRow({ icon, iconColor, title, subtitle, statusColor, statusLabel, trailing = 'chevron-right' }: {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  statusColor?: string;
  statusLabel?: string;
  trailing?: keyof typeof Feather.glyphMap;
}) {
  return (
    <View style={styles.listRow}>
      <View style={[styles.rowIcon, { backgroundColor: `${iconColor}1F`, borderColor: `${iconColor}3D` }]}>
        <Feather name={icon} size={11} color={iconColor} />
      </View>
      <View style={styles.rowTexts}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      {statusLabel ? (
        <View style={styles.statusPill}>
          <Dot size={5} color={statusColor ?? '#30D158'} />
          <Text style={[styles.statusText, { color: statusColor ?? '#30D158' }]}>{statusLabel}</Text>
        </View>
      ) : null}
      <Feather name={trailing} size={12} color={TEXT_FAINT} />
    </View>
  );
}

function SectionTitle({ children, color }: { children: string; color: string }) {
  return <Text style={[styles.sectionTitle, { color }]}>{children}</Text>;
}

/* ─────────────────── Pantallas ─────────────────── */

function DashboardMock({ accent }: { accent: string }) {
  return (
    <View style={styles.screen}>
      <View style={styles.appHeader}>
        <View style={styles.brandRow}>
          <Dot size={7} color={accent} />
          <Text style={styles.brandText}>Bitácora Digital</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>J</Text></View>
      </View>

      <Text style={styles.mockGreeting}>Hola, Eduardo</Text>
      <Text style={styles.mockSubGreeting}>Resumen de tu red en tiempo real</Text>

      <View style={styles.statsGrid}>
        <StatChip icon="server" value="128" label="Equipos" color="#60A5FA" />
        <StatChip icon="alert-triangle" value="4" label="Incidentes" color="#FF9F0A" />
        <StatChip icon="tool" value="7" label="Mantenimientos" color="#34D399" />
        <StatChip icon="wifi" value="12" label="Redes" color="#A78BFA" />
      </View>

      <SectionTitle color={accent}>Actividad reciente</SectionTitle>
      <View style={styles.rowsBlock}>
        <ListRow
          icon="alert-triangle"
          iconColor="#FF453A"
          title="Enlace caído en Biblioteca"
          subtitle="Switch Piso 2 · 192.168.20.5"
          statusColor="#FF453A"
          statusLabel="Crítico"
          trailing="chevron-right"
        />
        <ListRow
          icon="tool"
          iconColor="#34D399"
          title="Mantenimiento programado"
          subtitle="Router principal · 12 Nov"
          statusColor="#34D399"
          statusLabel="Hoy"
          trailing="chevron-right"
        />
      </View>
    </View>
  );
}

function InfrastructureMock({ accent }: { accent: string }) {
  return (
    <View style={styles.screen}>
      <View style={styles.segmented}>
        <View style={[styles.segmentActive, { backgroundColor: accent }]}>
          <Text style={[styles.segmentTextActive, { color: '#0B0C0F' }]}>Dispositivos</Text>
        </View>
        <View style={styles.segment}>
          <Text style={styles.segmentText}>Redes</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={11} color={TEXT_FAINT} />
        <Bar w={110} h={5} />
        <View style={styles.searchSpacer} />
        <Feather name="sliders" size={11} color={TEXT_FAINT} />
      </View>

      <View style={styles.chipRow}>
        {['Todos', 'Switches', 'Routers', 'APs'].map((chip, index) => (
          <View key={chip} style={[styles.chip, index === 1 && { borderColor: `${accent}66`, backgroundColor: `${accent}1A` }]}>
            <Text style={[styles.chipText, index === 1 && { color: accent }]}>{chip}</Text>
          </View>
        ))}
      </View>

      <View style={styles.rowsBlock}>
        <ListRow
          icon="server"
          iconColor="#60A5FA"
          title="Switch Core Piso 1"
          subtitle="192.168.10.2 · Cisco"
          statusColor="#30D158"
          statusLabel="Activo"
        />
        <ListRow
          icon="wifi"
          iconColor="#A78BFA"
          title="Access Point Biblioteca"
          subtitle="192.168.20.14 · Ubiquiti"
          statusColor="#30D158"
          statusLabel="Activo"
        />
        <ListRow
          icon="hard-drive"
          iconColor="#FBBF24"
          title="Servidor de Archivos"
          subtitle="192.168.30.8 · Dell"
          statusColor="#FF9F0A"
          statusLabel="Revisar"
        />
      </View>
    </View>
  );
}

function MapMock({ accent }: { accent: string }) {
  const pins = [
    { top: 34, left: 78, color: '#60A5FA', size: 11 },
    { top: 62, left: 232, color: '#34D399', size: 13 },
    { top: 116, left: 132, color: '#A78BFA', size: 10 },
    { top: 142, left: 286, color: '#FBBF24', size: 12 },
  ] as const;

  return (
    <View style={styles.screen}>
      <View style={styles.mapCanvas}>
        <View style={[styles.mapGridLine, { top: '28%' }]} />
        <View style={[styles.mapGridLine, { top: '56%' }]} />
        <View style={[styles.mapGridLine, { top: '84%' }]} />
        <View style={[styles.mapGridLineV, { left: '26%' }]} />
        <View style={[styles.mapGridLineV, { left: '52%' }]} />
        <View style={[styles.mapGridLineV, { left: '78%' }]} />

        {/* Zona de cobertura */}
        <View style={[styles.mapZone, { borderColor: `${accent}40`, backgroundColor: `${accent}10` }]} />

        {pins.map((pin, index) => (
          <View
            key={index}
            style={[styles.pinWrapper, { top: pin.top, left: pin.left }]}
          >
            <View style={[styles.pinHalo, { borderColor: `${pin.color}59` }]} />
            <View style={[styles.pin, { backgroundColor: pin.color, width: pin.size, height: pin.size, borderRadius: pin.size / 2 }]} />
          </View>
        ))}

        <View style={styles.mapControls}>
          <View style={styles.mapControlButton}><Feather name="plus" size={11} color={TEXT} /></View>
          <View style={styles.mapControlButton}><Feather name="minus" size={11} color={TEXT} /></View>
        </View>

        <View style={styles.mapLegend}>
          <View style={styles.mapLegendItem}><Dot size={6} color="#60A5FA" /><Text style={styles.mapLegendText}>Switch</Text></View>
          <View style={styles.mapLegendItem}><Dot size={6} color="#34D399" /><Text style={styles.mapLegendText}>Router</Text></View>
          <View style={styles.mapLegendItem}><Dot size={6} color="#A78BFA" /><Text style={styles.mapLegendText}>Servidor</Text></View>
        </View>

        <View style={styles.mapSheet}>
          <View style={styles.mapSheetHandle} />
          <Text style={styles.mapSheetTitle}>Edificio Biblioteca</Text>
          <Text style={styles.mapSheetSubtitle}>4 equipos · 2 pisos · 19.42, -102.06</Text>
        </View>
      </View>
    </View>
  );
}

function ControlMock({ accent }: { accent: string }) {
  return (
    <View style={styles.screen}>
      <View style={styles.segmented}>
        <View style={[styles.segmentActive, { backgroundColor: accent }]}>
          <Text style={[styles.segmentTextActive, { color: '#0B0C0F' }]}>Incidentes</Text>
        </View>
        <View style={styles.segment}><Text style={styles.segmentText}>Reportes</Text></View>
        <View style={styles.segment}><Text style={styles.segmentText}>Documentos</Text></View>
      </View>

      <View style={styles.chipRow}>
        {[
          { label: 'Crítico', color: '#FF453A', active: true },
          { label: 'Alto', color: '#FF9F0A', active: false },
          { label: 'Medio', color: '#FFD60A', active: false },
          { label: 'Resuelto', color: '#30D158', active: false },
        ].map(chip => (
          <View
            key={chip.label}
            style={[styles.chip, chip.active && { borderColor: `${chip.color}66`, backgroundColor: `${chip.color}1A` }]}
          >
            <Dot size={5} color={chip.color} />
            <Text style={[styles.chipText, chip.active && { color: chip.color }]}>{chip.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.rowsBlock}>
        <ListRow
          icon="alert-octagon"
          iconColor="#FF453A"
          title="Enlace caído en Biblioteca"
          subtitle="Reportado por Jazmín · hace 2 h"
          statusColor="#FF453A"
          statusLabel="Abierto"
        />
        <ListRow
          icon="alert-triangle"
          iconColor="#FF9F0A"
          title="Latencia alta en Laboratorio"
          subtitle="Router Lab A · 192.168.40.1"
          statusColor="#FF9F0A"
          statusLabel="En proceso"
        />
      </View>

      <View style={styles.reportBar}>
        <View style={styles.reportButton}>
          <Feather name="file-text" size={11} color={accent} />
          <Text style={[styles.reportText, { color: accent }]}>Generar reporte PDF</Text>
        </View>
        <View style={styles.reportButton}>
          <Feather name="calendar" size={11} color={accent} />
          <Text style={[styles.reportText, { color: accent }]}>Programar</Text>
        </View>
      </View>
    </View>
  );
}

function ConfigMock({ accent }: { accent: string }) {
  const lines: Array<[string, string]> = [
    ['#', ' Switch Core Piso 1 · 192.168.10.2'],
    ['interface', ' Vlan10'],
    ['ip address', ' 192.168.10.1 255.255.255.0'],
    ['description', ' Red de administración'],
    ['!', ''],
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.configHeader}>
        <View style={[styles.rowIcon, { backgroundColor: `${accent}1F`, borderColor: `${accent}3D` }]}>
          <Feather name="terminal" size={11} color={accent} />
        </View>
        <View style={styles.rowTexts}>
          <Text style={styles.rowTitle} numberOfLines={1}>Switch Core Piso 1</Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>respaldos: 3 archivos</Text>
        </View>
        <View style={[styles.devicePill, { borderColor: `${accent}44`, backgroundColor: `${accent}14` }]}>
          <Text style={[styles.devicePillText, { color: accent }]}>Cambiar equipo</Text>
          <Feather name="chevron-down" size={10} color={accent} />
        </View>
      </View>

      <View style={styles.dropZone}>
        <Feather name="upload-cloud" size={16} color={accent} />
        <Text style={styles.dropZoneTitle}>Carga o pega tu configuración</Text>
        <Text style={styles.dropZoneHint}>.cfg · .txt · .conf · .rsc</Text>
      </View>

      <View style={styles.terminal}>
        <View style={styles.terminalBar}>
          <Dot size={6} color="#FF5F57" />
          <Dot size={6} color="#FEBC2E" />
          <Dot size={6} color="#28C840" />
          <Text style={styles.terminalTitle}>config-actual.cfg</Text>
        </View>
        <View style={styles.terminalBody}>
          {lines.map(([key, value], index) => (
            <View key={index} style={styles.terminalLine}>
              <Text style={styles.terminalGutter}>{index + 1}</Text>
              <Text style={[styles.terminalCode, { color: `${accent}CC` }]}>{key}</Text>
              <Text style={styles.terminalValue} numberOfLines={1}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function SearchMock({ accent }: { accent: string }) {
  return (
    <View style={styles.screen}>
      <View style={[styles.searchBar, { borderColor: `${accent}4D` }]}>
        <Feather name="search" size={11} color={accent} />
        <Text style={styles.searchQuery}>192.168.10</Text>
        <View style={styles.searchCaret} />
      </View>

      <View style={styles.chipRow}>
        {['Todo', 'Dispositivos', 'Redes', 'Incidentes', 'Documentos'].map((chip, index) => (
          <View key={chip} style={[styles.chip, index === 0 && { borderColor: `${accent}66`, backgroundColor: `${accent}1A` }]}>
            <Text style={[styles.chipText, index === 0 && { color: accent }]}>{chip}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.resultCount}>3 resultados en 0.12 s</Text>

      <View style={styles.rowsBlock}>
        <ListRow
          icon="server"
          iconColor="#60A5FA"
          title="Switch Core Piso 1"
          subtitle="192.168.10.2 · Cisco · Rectoría"
          statusColor="#30D158"
          statusLabel="Activo"
        />
        <ListRow
          icon="wifi"
          iconColor="#A78BFA"
          title="Access Point Pasillo A"
          subtitle="192.168.10.31 · Ubiquiti"
          statusColor="#30D158"
          statusLabel="Activo"
        />
        <ListRow
          icon="globe"
          iconColor="#FBBF24"
          title="Red Administración"
          subtitle="192.168.10.0/24 · VLAN 10"
          trailing="arrow-up-right"
        />
      </View>
    </View>
  );
}

const MOCKS: Record<PreviewScreenId, (props: { accent: string }) => React.ReactElement> = {
  dashboard: DashboardMock,
  infrastructure: InfrastructureMock,
  map: MapMock,
  control: ControlMock,
  config: ConfigMock,
  search: SearchMock,
};

/* ─────────────────── Marco con escalado ─────────────────── */

export function PreviewMock({ screen, accent, maxWidth }: {
  screen: PreviewScreenId; accent: string; maxWidth: number;
}) {
  const [measuredWidth, setMeasuredWidth] = useState(maxWidth);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - measuredWidth) > 0.5) setMeasuredWidth(next);
  };

  // El marco se adapta al ancho disponible para que ninguna pantalla quede recortada.
  const frameWidth = Math.max(240, Math.min(PREVIEW_BASE_WIDTH, measuredWidth));
  const scale = frameWidth / PREVIEW_BASE_WIDTH;
  const frameHeight = PREVIEW_BASE_HEIGHT * scale;
  const Mock = MOCKS[screen];

  return (
    <View style={[styles.frameWrapper, { height: frameHeight }]}>
      <View
        onLayout={onLayout}
        style={[
          styles.frame,
          {
            width: frameWidth,
            height: frameHeight,
            transform: [{ scale }],
            transformOrigin: 'top left',
          } as ViewStyle,
        ]}
      >
        {/* Barra superior tipo ventana */}
        <View style={styles.frameChrome}>
          <Dot size={7} color="#FF5F57" />
          <Dot size={7} color="#FEBC2E" />
          <Dot size={7} color="#28C840" />
          <View style={styles.frameUrl}>
            <Feather name="lock" size={8} color={TEXT_FAINT} />
            <Text style={styles.frameUrlText} numberOfLines={1}>bitacora·redes / {screen}</Text>
          </View>
        </View>
        <View style={styles.frameBody}>
          <Mock accent={accent} />
        </View>
      </View>
    </View>
  );
}

/* ─────────────────── Estilos ─────────────────── */

const styles = StyleSheet.create({
  frameWrapper: {
    width: '100%',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  frame: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    overflow: 'hidden',
    boxShadow: '0 14px 26px rgba(0,0,0,0.45)',
    elevation: 8,
  },
  frameChrome: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    backgroundColor: '#0A0B0D',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  frameUrl: {
    flex: 1,
    height: 16,
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  frameUrlText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 8,
    color: TEXT_FAINT,
  },
  frameBody: {
    flex: 1,
    padding: 10,
  },
  screen: {
    flex: 1,
  },

  /* Cabecera de app */
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    color: TEXT,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  avatarText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 8,
    color: TEXT,
  },
  mockGreeting: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    color: TEXT,
  },
  mockSubGreeting: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 8,
    color: TEXT_DIM,
    marginTop: 1,
    marginBottom: 8,
  },

  /* Grid de estadísticas */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  statChip: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 7,
  },
  statIcon: {
    width: 20,
    height: 20,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statTexts: {
    flex: 1,
  },
  statValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    lineHeight: 13,
  },
  statLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 7.5,
    color: TEXT_DIM,
  },
  tile: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE_ALT,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 8.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 5,
  },

  /* Filas de lista */
  rowsBlock: {
    gap: 5,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE_ALT,
  },
  rowIcon: {
    width: 20,
    height: 20,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rowTexts: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 8.5,
    color: TEXT,
  },
  rowSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 7.5,
    color: TEXT_DIM,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statusText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 6.5,
  },

  /* Segmentos y chips */
  segmented: {
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 7,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 7,
  },
  segmentActive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 7,
  },
  segmentText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 8,
    color: TEXT_DIM,
  },
  segmentTextActive: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 7,
  },
  searchSpacer: {
    flex: 1,
  },
  searchQuery: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 8.5,
    color: TEXT,
  },
  searchCaret: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 7.5,
    color: TEXT_DIM,
  },
  resultCount: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 7.5,
    color: TEXT_DIM,
    marginBottom: 5,
  },

  /* Mapa */
  mapCanvas: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#0C0E12',
  },
  mapGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  mapGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  mapZone: {
    position: 'absolute',
    top: '10%',
    left: '8%',
    right: '12%',
    bottom: '24%',
    borderRadius: 100,
    borderWidth: 1,
  },
  pinWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinHalo: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  pin: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.45)',
  },
  mapControls: {
    position: 'absolute',
    right: 8,
    top: 8,
    gap: 4,
  },
  mapControlButton: {
    width: 20,
    height: 20,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  mapLegend: {
    position: 'absolute',
    left: 8,
    top: 8,
    gap: 3,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapLegendText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 6.5,
    color: TEXT_DIM,
  },
  mapSheet: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(16,17,20,0.94)',
  },
  mapSheetHandle: {
    alignSelf: 'center',
    width: 26,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 5,
  },
  mapSheetTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9,
    color: TEXT,
  },
  mapSheetSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 7.5,
    color: TEXT_DIM,
    marginTop: 1,
  },

  /* Centro de control */
  reportBar: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 8,
  },
  reportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  reportText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 7.5,
  },

  /* Configuraciones */
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  devicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 7,
    borderWidth: 1,
  },
  devicePillText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 7,
  },
  dropZone: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dropZoneTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 8.5,
    color: TEXT,
  },
  dropZoneHint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 7,
    color: TEXT_DIM,
  },
  terminal: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#07080A',
  },
  terminalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#0C0D10',
  },
  terminalTitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 7,
    color: TEXT_FAINT,
    marginLeft: 4,
  },  terminalBody: {
    padding: 7,
    gap: 3,
  },
  terminalLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  terminalGutter: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 7,
    color: TEXT_FAINT,
    width: 8,
  },
  terminalCode: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 7.5,
  },
  terminalValue: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 7.5,
    color: TEXT_DIM,
    flex: 1,
  },
});
