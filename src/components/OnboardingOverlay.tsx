import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';
import { navigateToSection, navigationRef } from '../navigation/navigationRef';
import { PreviewMock, type PreviewScreenId } from './OnboardingPreviews';

/* ------------Geometría de la barra inferior real (BottomTabNavigator) ------------*/
const NAV_ITEM_COUNT = 6;
/** Índice de cada sección dentro de la barra inferior */
const NAV_TAB_INDEX: Record<PreviewScreenId, number> = {
  dashboard: 0,      // Inicio
  infrastructure: 1, // Infraestructura
  map: 2,            // Mapa
  control: 3,        // Centro de control
  config: 4,         // Configuraciones
  search: 5,         // Buscar
};
/** Alto del contenedor de la barra inferior (68) y de su indicador (42) */
const NAV_BAR_HEIGHT = 68;
const NAV_INDICATOR_SIZE = 42;
/** Alto del bloque que señala la pestaña activa (etiqueta + anillo resaltado) */
const SPOTLIGHT_HEIGHT = 148;

/* ------------Tutorial Step Definitions ------------*/

interface OnboardingStep {
  /** Identificador de la pantalla que se ilustra en el panel lateral */
  screen: PreviewScreenId;
  /** Nombre corto que aparece sobre la vista previa */
  screenLabel: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  /** Una sola línea: qué es esta pantalla */
  description: string;
  /** Máximo 3 puntos, frases muy cortas */
  points: string[];
  accentColor: string;
  /** Sección real de la barra inferior que se abre detrás del tutorial */
  route: 'Inicio' | 'Infraestructura' | 'Mapa' | 'CentroControl' | 'Configuraciones' | 'Buscar';
}

const STEPS: OnboardingStep[] = [
  {
    screen: 'dashboard',
    screenLabel: 'Inicio',
    route: 'Inicio',
    icon: 'home',
    title: 'Panel de Inicio',
    description: 'Tu resumen diario: todo lo importante de la red en una sola pantalla.',
    points: [
      'Contadores de equipos, incidentes y redes',
      'Pendientes accionables: lo urgente aparece primero',
      'Cada tarjeta abre su módulo con un toque',
    ],
    accentColor: '#34D399',
  },
  {
    screen: 'infrastructure',
    screenLabel: 'Infraestructura · Dispositivos y Redes',
    route: 'Infraestructura',
    icon: 'server',
    title: 'Infraestructura',
    description: 'Aquí vive el inventario completo de tu red.',
    points: [
      'Dispositivos: switches, routers, servidores y APs',
      'Redes: VLANs y subredes con su direccionamiento',
      'Filtra por fabricante, edificio o estado',
    ],
    accentColor: '#60A5FA',
  },
  {
    screen: 'map',
    screenLabel: 'Mapa',
    route: 'Mapa',
    icon: 'map-pin',
    title: 'Mapa Interactivo',
    description: 'Ubica cada equipo sobre el plano del campus.',
    points: [
      'Pines por edificio con nombre, IP y estado',
      'Zoom, arrastre y detalle al tocar un pin',
      'Los edificios se registran con coordenadas GPS',
    ],
    accentColor: '#F472B6',
  },
  {
    screen: 'control',
    screenLabel: 'Centro de control · Incidentes',
    route: 'CentroControl',
    icon: 'activity',
    title: 'Centro de Control',
    description: 'Registra y sigue cada evento de la red hasta cerrarlo.',
    points: [
      'Incidentes con severidad y seguimiento',
      'Reportes en PDF listos para imprimir o firmar',
      'Documentos internos siempre a la mano',
    ],
    accentColor: '#FBBF24',
  },
  {
    screen: 'config',
    screenLabel: 'Backup de configuración',
    route: 'Configuraciones',
    icon: 'terminal',
    title: 'Configuraciones',
    description: 'Respalda la configuración de cada equipo.',
    points: [
      'Carga el archivo .cfg, .txt o .conf del equipo',
      'O pega la configuración directamente',
      'Queda guardada y disponible para consulta',
    ],
    accentColor: '#A78BFA',
  },
  {
    screen: 'search',
    screenLabel: 'Buscar',
    route: 'Buscar',
    icon: 'search',
    title: 'Búsqueda Global',
    description: 'Encuentra cualquier dato de la bitácora al instante.',
    points: [
      'Busca por nombre, IP, MAC o ubicación',
      'Filtra por dispositivos, redes o documentos',
      'Resultados instantáneos mientras escribes',
    ],
    accentColor: '#FB923C',
  },
];

/* ------------Animated Background Particles ------------*/

function FloatingParticle({ delay, size, x, y, color }: {
  delay: number; size: number; x: number; y: number; color: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 4000 + Math.random() * 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 4000 + Math.random() * 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30 - Math.random() * 20],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.06, 0.22, 0.06],
  });

  return (
    <Animated.View
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        left: `${x}%` as any,
        top: `${y}%` as any,
        transform: [{ translateY }],
        opacity,
      }}
    />
  );
}

const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  delay: i * 300,
  size: 4 + Math.random() * 10,
  x: Math.random() * 95,
  y: Math.random() * 95,
  color: ['#34D399', '#60A5FA', '#A78BFA', '#FBBF24', '#F472B6', '#FB923C'][i % 6],
}));

/* ------------Animated Icon Badge ------------*/

function PulsingIconBadge({ icon, accentColor, isActive, compact = false }: {
  icon: keyof typeof Feather.glyphMap;
  accentColor: string;
  isActive: boolean;
  compact?: boolean;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.8)).current;
  const box = compact ? 34 : 40;
  const radius = compact ? 11 : 13;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.spring(scaleIn, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, {
              toValue: 1,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 0,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    } else {
      scaleIn.setValue(0.8);
      pulse.setValue(0);
    }
  }, [isActive]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <Animated.View
      style={[
        styles.iconBadge,
        compact && { width: box + 4, height: box + 4 },
        { transform: [{ scale: scaleIn }] },
      ]}
    >
      <Animated.View
        style={[
          styles.iconPulse,
          compact && { width: box + 4, height: box + 4, borderRadius: radius + 2 },
          { borderColor: accentColor, transform: [{ scale: pulseScale }], opacity: pulseOpacity },
        ]}
      />
      <View
        style={[
          styles.iconBadgeInner,
          compact && { width: box, height: box, borderRadius: radius },
          { backgroundColor: `${accentColor}1F`, borderColor: `${accentColor}59` },
        ]}
      >
        <Feather name={icon} size={compact ? 17 : 20} color={accentColor} />
      </View>
    </Animated.View>
  );
}

/* ------------Progress Segments ------------*/

function ProgressSegments({ current, total, accentColor }: {
  current: number; total: number; accentColor: string;
}) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.progressSegment,
            i < current
              ? { backgroundColor: 'rgba(255,255,255,0.28)' }
              : i === current
                ? { backgroundColor: accentColor }
                : { backgroundColor: 'rgba(255,255,255,0.10)' },
          ]}
        />
      ))}
    </View>
  );
}

/* ------------Vista previa de la pantalla ------------*/

function PreviewBlock({ screen, screenLabel, accentColor, maxWidth }: {
  screen: PreviewScreenId;
  screenLabel: string;
  accentColor: string;
  maxWidth: number;
}) {
  return (
    <View>
      <View style={styles.previewLabelRow}>
        <View style={[styles.previewTag, { borderColor: `${accentColor}40`, backgroundColor: `${accentColor}14` }]}>
          <Feather name="eye" size={10} color={accentColor} />
          <Text style={[styles.previewTagText, { color: accentColor }]}>Vista rápida</Text>
        </View>
        <Text style={styles.previewLabel} numberOfLines={1}>{screenLabel}</Text>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Vista previa de la pantalla ${screenLabel}`}
      >
        <PreviewMock screen={screen} accent={accentColor} maxWidth={maxWidth} />
      </View>
    </View>
  );
}

/* ------------Señalador de la pestaña real ------------*/

/** Resplandor radial: círculos concéntricos con opacidad decreciente */
function Glow({ color, size, opacity = 0.1, layers = 5 }: {
  color: string; size: number; opacity?: number; layers?: number;
}) {
  return (
    <View pointerEvents="none" style={[styles.glow, { width: size, height: size }]}>
      {Array.from({ length: layers }).map((_, index) => {
        const scale = 1 - index * 0.17;
        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              width: size * scale,
              height: size * scale,
              borderRadius: (size * scale) / 2,
              backgroundColor: color,
              opacity: opacity * (index + 1) / layers,
            }}
          />
        );
      })}
    </View>
  );
}

/** Chevron animado que rebota hacia la pestaña resaltada */
function FloatingChevrons({ color, active }: { color: string; active: boolean }) {
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(travel, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(travel, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(140),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, travel]);

  const chevron = (delayFactor: number, opacity: Animated.AnimatedInterpolation<number> | number) => (
    <Animated.View
      style={{
        position: 'absolute',
        width: 16,
        height: 16,
        alignItems: 'center',
        backgroundColor: 'transparent',
        transform: [
          {
            translateY: travel.interpolate({
              inputRange: [0, 1],
              outputRange: [-7 - delayFactor * 5, 4],
            }),
          },
        ],
        opacity,
      }}
    >
      <View style={[styles.chevronArm, { borderColor: color, transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.chevronArm, styles.chevronArmLower, { borderColor: color, transform: [{ rotate: '45deg' }] }]} />
    </Animated.View>
  );

  const nearOpacity = travel.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 0.15] });
  const farOpacity = travel.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 0.6, 0] });

  return (
    <View pointerEvents="none" style={styles.chevrons}>
      {chevron(1, farOpacity)}
      {chevron(0, nearOpacity)}
    </View>
  );
}

/** Foco sobre el elemento real de la barra inferior: aro que gira, pulso y etiqueta */
function SpotlightMark({ active, color, label, icon }: {
  active: boolean;
  color: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Solo el foco activo gira: evita animaciones en los cinco marcadores ocultos
    if (!active) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [active, spin]);

  useEffect(() => {
    if (!active) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(200),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.45, 0] });

  return (
    <View style={[styles.spotlightMark, !active && styles.spotlightMarkIdle]} pointerEvents="none">
      <FloatingChevrons color={color} active={active} />

      <View style={styles.spotlightRingHolder}>
        {/* Pulso que sale del aro */}
        <Animated.View
          style={[
            styles.spotlightPulse,
            { borderColor: color, transform: [{ scale: pulseScale }], opacity: pulseOpacity },
          ]}
        />
        {/* Resplandor suave para que el aro se lea sobre la interfaz real */}
        <Glow color={color} size={118} opacity={active ? 0.16 : 0.05} />

        {/* Aro giratorio (arco abierto) */}
        <Animated.View
          style={[
            styles.spinnerRing,
            { borderTopColor: color, borderRightColor: color, transform: [{ rotate }] },
            !active && { opacity: 0.25 },
          ]}
        />
        {/* Aro base */}
        <View
          style={[
            styles.spotlightRing,
            { borderColor: color, backgroundColor: `${color}1A` },
            !active && { borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'transparent' },
          ]}
        >
          <Feather name={icon} size={17} color={active ? color : 'rgba(255,255,255,0.5)'} />
        </View>
      </View>

      {active ? (
        <View style={[styles.spotlightLabel, { borderColor: `${color}59`, backgroundColor: 'rgba(9,10,14,0.88)' }]}>
          <Feather name="map-pin" size={9} color={color} />
          <Text style={[styles.spotlightLabelText, { color }]} numberOfLines={1}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Capa que señala, sobre la app real, la pestaña de la sección explicada */
export function NavSpotlight({ activeStep, insets }: { activeStep: number; insets: { bottom: number } }) {
  const { width: windowWidth } = useWindowDimensions();
  const [availWidth, setAvailWidth] = useState(0);
  // La barra inferior real ocupa: min(ancho - margen, 620), centrada
  const rawWidth = availWidth || windowWidth;
  const measured = rawWidth > 200 ? rawWidth : 360;
  const horizontalMargin = measured < 380 ? 12 : 20;
  const barWidth = Math.min(measured - horizontalMargin, 620);
  const itemWidth = barWidth > 0 ? barWidth / NAV_ITEM_COUNT : 0;
  const navBottom = Platform.OS === 'ios' ? insets.bottom + 8 : 18;
  const highlightBottom = navBottom + (NAV_BAR_HEIGHT - NAV_INDICATOR_SIZE) / 2;
  // La barra va centrada: se compensa el margen izquierdo para alinear el foco con cada pestaña
  const barLeft = Math.max(0, (measured - barWidth) / 2);
  const markWidth = 140;

  return (
    <View
      pointerEvents="none"
      style={styles.spotlightLayer}
      onLayout={(event) => setAvailWidth(event.nativeEvent.layout.width)}
    >
      {itemWidth > 0 && STEPS.map((step, index) => (
        <View
          key={step.screen}
          style={[
            styles.spotlightItem,
            {
              // Centro de la pestaña (la barra está centrada) menos la mitad del foco
              left: barLeft + itemWidth * (NAV_TAB_INDEX[step.screen] + 0.5) - markWidth / 2,
              width: markWidth,
              bottom: highlightBottom,
            },
          ]}
        >
          <SpotlightMark
            active={index === activeStep}
            color={step.accentColor}
            label={step.title}
            icon={step.icon}
          />
        </View>
      ))}
    </View>
  );
}

/* ------------Tarjeta del tutorial (contenido visual) ------------*/

export function TutorialCard({ step, visible, userName, fadeContent, slideContent, onNext, onPrev, onSkip }: {
  step: number;
  visible: boolean;
  userName: string;
  fadeContent: Animated.Value;
  slideContent: Animated.Value;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width > 900;
  const isCompact = width < 480;
  // La miniatura solo se muestra cuando hay ancho real para ella; en celular
  // la app de atrás es la que se ve, así que la tarjeta se mantiene corta.
  const showPreview = width >= 480;
  const previewMaxWidth = isDesktop ? 440 : Math.min(420, Math.max(240, width - 72));
  const visiblePoints = isDesktop ? 3 : 2;

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <Animated.View
      style={[
        styles.card,
        isDesktop ? styles.cardDesktop : styles.cardMobile,
        isCompact && styles.cardCompact,
        {
          opacity: fadeContent,
          transform: [{ translateY: slideContent }],
          borderColor: `${currentStep.accentColor}33`,
          ...Platform.select({
            web: {
              boxShadow: `0 30px 90px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03), 0 0 120px ${currentStep.accentColor}14`,
            } as any,
          }),
        },
      ]}
    >
      {/* Top bar: step badge + skip */}
      <View style={styles.cardTopBar}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>
            PASO {step + 1} DE {STEPS.length}
          </Text>
        </View>
        <TouchableOpacity onPress={onSkip} activeOpacity={0.7} style={styles.skipButton}>
          <Text style={styles.skipText}>Omitir tutorial</Text>
          <Feather name="x" size={13} color="rgba(255,255,255,0.55)" />
        </TouchableOpacity>
      </View>

      <ProgressSegments current={step} total={STEPS.length} accentColor={currentStep.accentColor} />

        {/* Body: texto a la izquierda, miniatura a la derecha en escritorio */}
        <View style={[styles.cardBody, isDesktop && styles.cardBodyDesktop, isCompact && styles.cardBodyCompact]}>
          <View style={[styles.textPanel, isDesktop && styles.textPanelDesktop]}>
            <View style={[styles.titleRow, isCompact && styles.titleRowCompact]}>
              <PulsingIconBadge
                icon={currentStep.icon}
                accentColor={currentStep.accentColor}
                isActive={visible}
                compact={isCompact}
              />
              <View style={styles.titleTexts}>
                <Text style={[styles.stepTitle, isCompact && styles.stepTitleCompact]}>{currentStep.title}</Text>
                {step === 0 && (
                  <Text style={styles.welcomeName} numberOfLines={1}>
                    ¡Bienvenido{userName ? `, ${userName}` : ''}!
                  </Text>
                )}
              </View>
            </View>

            <Text style={[styles.stepDescription, isCompact && styles.stepDescriptionCompact]}>
              {currentStep.description}
            </Text>

            {/* En pantallas medianas la miniatura va debajo del texto */}
            {!isDesktop && showPreview && (
              <View style={styles.previewPanelMobile}>
                <PreviewBlock
                  screen={currentStep.screen}
                  screenLabel={currentStep.screenLabel}
                  accentColor={currentStep.accentColor}
                  maxWidth={previewMaxWidth}
                />
              </View>
            )}

            <View style={[styles.pointsList, isCompact && styles.pointsListCompact]}>
              {currentStep.points.slice(0, visiblePoints).map(point => (
                <View key={point} style={styles.pointRow}>
                  <View
                    style={[
                      styles.pointIcon,
                      { backgroundColor: `${currentStep.accentColor}1A`, borderColor: `${currentStep.accentColor}40` },
                    ]}
                  >
                    <Feather name="check" size={10} color={currentStep.accentColor} />
                  </View>
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
            </View>
          </View>

          {isDesktop && (
            <View style={styles.previewPanelDesktop}>
              <PreviewBlock
                screen={currentStep.screen}
                screenLabel={currentStep.screenLabel}
                accentColor={currentStep.accentColor}
                maxWidth={previewMaxWidth}
              />
            </View>
          )}
        </View>

        {/* Nav buttons */}
        <View style={[styles.navRow, isCompact && styles.navRowCompact]}>
          {step > 0 ? (
            <TouchableOpacity onPress={onPrev} activeOpacity={0.7} style={[styles.prevButton, isCompact && styles.prevButtonCompact]}>
              <Feather name="arrow-left" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.prevButtonText}>Anterior</Text>
            </TouchableOpacity>
          ) : (
            !isCompact && <View style={styles.prevPlaceholder} />
          )}

          <TouchableOpacity
            onPress={onNext}
            activeOpacity={0.85}
            style={[
              styles.nextButton,
              isCompact && styles.nextButtonCompact,
              { backgroundColor: currentStep.accentColor },
              Platform.select({
                web: { boxShadow: `0 8px 26px ${currentStep.accentColor}4D` } as any,
              }),
            ]}
          >
            <Text style={styles.nextButtonText}>
              {isLastStep ? 'Comenzar' : 'Siguiente'}
            </Text>
            <Feather
              name={isLastStep ? 'check-circle' : 'arrow-right'}
              size={16}
              color="#0A0B0D"
            />
          </TouchableOpacity>
        </View>

        {/* Keyboard hint for desktop */}
        {isDesktop && (
          <View style={styles.keyboardHint}>
            <Text style={styles.keyboardHintText}>
            Usa las flechas del teclado para navegar · Esc para omitir
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

/* ------------Main Onboarding Overlay ------------*/

export default function OnboardingOverlay() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const fadeOverlay = useRef(new Animated.Value(0)).current;
  const slideContent = useRef(new Animated.Value(28)).current;
  const fadeContent = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  const currentStep = STEPS[step];
  const userName = user?.profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  // Show/hide overlay with animation
  useEffect(() => {
    if (showOnboarding) {
      setVisible(true);
      setStep(0);
      Animated.parallel([
        Animated.timing(fadeOverlay, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(fadeContent, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
        Animated.spring(slideContent, { toValue: 0, tension: 45, friction: 9, delay: 150, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(fadeOverlay, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => {
        setVisible(false);
      });
    }
  }, [showOnboarding]);

  // Abre detrás del tutorial la sección real que se está explicando,
  // para que el usuario vea la pantalla mientras lee.
  useEffect(() => {
    if (!visible) return;
    const route = STEPS[step].route;
    if (navigateToSection(route)) return;
    // El contenedor de navegación aún no está listo: se reintenta al montar
    navigationRef.addListener('ready', () => navigateToSection(route));
  }, [visible, step]);

  // Animate step transition
  const animateStepChange = useCallback((newStep: number, direction: 1 | -1) => {
    Animated.parallel([
      Animated.timing(fadeContent, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideContent, { toValue: -22 * direction, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setStep(newStep);
      slideContent.setValue(26 * direction);
      Animated.parallel([
        Animated.timing(fadeContent, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(slideContent, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const handleNext = useCallback(() => {
    if (step >= STEPS.length - 1) {
      completeOnboarding();
    } else {
      animateStepChange(step + 1, 1);
    }
  }, [step, animateStepChange, completeOnboarding]);

  const handlePrev = useCallback(() => {
    if (step > 0) animateStepChange(step - 1, -1);
  }, [step, animateStepChange]);

  const handleSkip = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlayRoot, { opacity: fadeOverlay }]}>
      {/* Velo claro: la app real se ve detrás del tutorial */}
      <View style={styles.backdrop} />

      {/* Accent aura that follows the current step */}
      <View
        pointerEvents="none"
        style={[styles.aura, { backgroundColor: `${currentStep.accentColor}12` }]}
      />

      {/* Floating particles */}
      {PARTICLES.map(p => (
        <FloatingParticle key={p.id} {...p} />
      ))}

      {/* Content card */}
      <ScrollView
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <TutorialCard
          step={step}
          visible={visible}
          userName={userName}
          fadeContent={fadeContent}
          slideContent={slideContent}
          onNext={handleNext}
          onPrev={handlePrev}
          onSkip={handleSkip}
        />
      </ScrollView>

      {/* Señalador de la pestaña real de la sección explicada */}
      <NavSpotlight activeStep={step} insets={insets} />

      {/* Keyboard support for web */}
      {Platform.OS === 'web' && (
        <WebKeyboardHandler onNext={handleNext} onPrev={handlePrev} onSkip={handleSkip} step={step} />
      )}
    </Animated.View>
  );
}

/* ------------Web Keyboard Navigation ------------*/

function WebKeyboardHandler({ onNext, onPrev, onSkip, step }: {
  onNext: () => void; onPrev: () => void; onSkip: () => void; step: number;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); onNext(); }
      else if (e.key === 'ArrowLeft' && step > 0) { e.preventDefault(); onPrev(); }
      else if (e.key === 'Escape') { e.preventDefault(); onSkip(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNext, onPrev, onSkip, step]);

  return null;
}

/* ------------Styles ------------*/

const styles = StyleSheet.create({
  overlayRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3, 4, 7, 0.34)',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Señalador de la pestaña real */
  spotlightLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SPOTLIGHT_HEIGHT + 40,
  },
  spotlightItem: {
    position: 'absolute',
    alignItems: 'center',
  },
  spotlightMark: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 140,
  },
  spotlightMarkIdle: {
    opacity: 0,
  },
  chevrons: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
    height: 22,
  },
  chevronArm: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRadius: 3,
  },
  chevronArmLower: {
    top: 7,
  },
  spotlightRingHolder: {
    width: SPOTLIGHT_HEIGHT - 90,
    height: SPOTLIGHT_HEIGHT - 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 34,
  },
  spotlightPulse: {
    position: 'absolute',
    width: NAV_INDICATOR_SIZE + 4,
    height: NAV_INDICATOR_SIZE + 4,
    borderRadius: (NAV_INDICATOR_SIZE + 4) / 2,
    borderWidth: 2,
  },
  spinnerRing: {
    position: 'absolute',
    width: NAV_INDICATOR_SIZE + 14,
    height: NAV_INDICATOR_SIZE + 14,
    borderRadius: (NAV_INDICATOR_SIZE + 14) / 2,
    borderWidth: 2,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  spotlightRing: {
    width: NAV_INDICATOR_SIZE,
    height: NAV_INDICATOR_SIZE,
    borderRadius: NAV_INDICATOR_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 9,
    borderWidth: 1,
  },
  spotlightLabelText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  aura: {
    position: 'absolute',
    top: '-20%',
    left: '-10%',
    right: '-10%',
    bottom: '-20%',
  },
  scrollContentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 152,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    borderRadius: 26,
    borderWidth: 1,
    backgroundColor: 'rgba(12, 13, 17, 0.97)',
    paddingTop: 16,
    paddingBottom: 22,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  cardDesktop: {
    maxWidth: 1000,
  },
  cardMobile: {
    maxWidth: 460,
  },
  /* Tarjeta corta: en celular la app de atrás tiene que verse alrededor */
  cardCompact: {
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
  },

  /* Top bar */
  cardTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  stepBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  skipText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.55)',
  },

  /* Progress */
  progressRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 18,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    ...Platform.select({
      web: { transition: 'background-color 0.35s ease' } as any,
    }),
  },

  /* Body */
  cardBody: {
    gap: 16,
  },
  cardBodyCompact: {
    gap: 12,
  },
  cardBodyDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
  textPanel: {
    flex: 1,
  },
  textPanelDesktop: {
    maxWidth: 380,
  },
  previewPanelMobile: {
    marginBottom: 16,
  },
  previewPanelDesktop: {
    flexBasis: 0,
    maxWidth: 440,
  },
  previewLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  previewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 7,
    borderWidth: 1,
  },
  previewTagText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9.5,
    letterSpacing: 0.3,
  },
  previewLabel: {
    flexShrink: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
  },

  /* Title */
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  titleRowCompact: {
    gap: 9,
    marginBottom: 8,
  },
  titleTexts: {
    flex: 1,
  },
  iconBadge: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1.5,
  },
  iconBadgeInner: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    color: '#FFFFFF',
    lineHeight: 26,
  },
  stepTitleCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  welcomeName: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  stepDescription: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.68)',
    marginBottom: 16,
  },
  stepDescriptionCompact: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12,
  },

  /* Key points */
  pointsList: {
    gap: 9,
  },
  pointsListCompact: {
    gap: 7,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  pointIcon: {
    width: 20,
    height: 20,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.8)',
  },

  /* Nav buttons */
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  navRowCompact: {
    gap: 10,
    marginTop: 14,
  },
  prevPlaceholder: {
    width: 118,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  prevButtonCompact: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  prevButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.7)',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 30,
    borderRadius: 13,
  },
  nextButtonCompact: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  nextButtonText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#0A0B0D',
  },

  /* Keyboard hint */
  keyboardHint: {
    alignItems: 'center',
    marginTop: 12,
  },
  keyboardHintText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.3)',
  },
});
