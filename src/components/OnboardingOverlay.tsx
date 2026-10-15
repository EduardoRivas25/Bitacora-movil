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
import { useTheme } from '../contexts/ThemeContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';

/* ─────────────── Tutorial Step Definitions ─────────────── */

interface OnboardingStep {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  tip: string;
  accentColor: string;
  /** Gradient ring colors around the icon */
  ringColors: [string, string];
}

const STEPS: OnboardingStep[] = [
  {
    icon: 'home',
    title: 'Panel de Inicio',
    description:
      'Tu centro de control principal. Aquí encontrarás estadísticas en tiempo real de tu infraestructura: dispositivos activos, incidentes abiertos, mantenimientos programados y la actividad reciente del equipo.',
    tip: '💡 Las tarjetas se actualizan automáticamente cada vez que vuelves a esta pantalla.',
    accentColor: '#34D399',
    ringColors: ['#34D399', '#059669'],
  },
  {
    icon: 'server',
    title: 'Infraestructura',
    description:
      'Explora tu inventario completo de red. En la pestaña "Dispositivos" verás switches, routers, servidores y APs organizados por edificio. En "Redes" puedes consultar las VLANs y subredes configuradas.',
    tip: '💡 Toca cualquier dispositivo para ver su información detallada, puertos y configuración.',
    accentColor: '#60A5FA',
    ringColors: ['#60A5FA', '#2563EB'],
  },
  {
    icon: 'map-pin',
    title: 'Mapa Interactivo',
    description:
      'Visualiza la distribución geográfica de todos los equipos de red. Cada pin muestra el nombre, IP y estado del dispositivo. Puedes hacer zoom, arrastrar y tocar los marcadores para ver más detalles.',
    tip: '💡 Los colores de los pines indican el tipo de equipo (switch, router, servidor, etc.).',
    accentColor: '#F472B6',
    ringColors: ['#F472B6', '#DB2777'],
  },
  {
    icon: 'activity',
    title: 'Centro de Control',
    description:
      'Gestiona incidentes de red, genera reportes técnicos en PDF y consulta documentos internos. Registra cada evento de la red con detalles de prioridad, estado y seguimiento completo.',
    tip: '💡 Puedes exportar reportes PDF con logo y firmas para documentación formal.',
    accentColor: '#FBBF24',
    ringColors: ['#FBBF24', '#D97706'],
  },
  {
    icon: 'terminal',
    title: 'Configuraciones',
    description:
      'Respalda y gestiona las configuraciones CLI de cada equipo. Selecciona un dispositivo de la lista organizada por edificio, carga o pega su archivo de configuración (.cfg, .txt, .conf) y guárdalo en la base de datos.',
    tip: '💡 Los equipos con 🟢 ya tienen respaldo guardado; los demás esperan que subas uno.',
    accentColor: '#A78BFA',
    ringColors: ['#A78BFA', '#7C3AED'],
  },
  {
    icon: 'search',
    title: 'Búsqueda Global',
    description:
      'Encuentra cualquier dispositivo, red, incidente o documento en toda la bitácora. La búsqueda inteligente filtra por nombre, IP, modelo, ubicación y más campos, con resultados instantáneos.',
    tip: '💡 Escribe la IP parcial o el nombre del edificio para encontrar equipos rápidamente.',
    accentColor: '#FB923C',
    ringColors: ['#FB923C', '#EA580C'],
  },
];

/* ─────────────── Animated Background Particles ─────────────── */

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
    outputRange: [0.15, 0.45, 0.15],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
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

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  delay: i * 250,
  size: 4 + Math.random() * 10,
  x: Math.random() * 95,
  y: Math.random() * 95,
  color: ['#34D399', '#60A5FA', '#A78BFA', '#FBBF24', '#F472B6', '#FB923C'][i % 6],
}));

/* ─────────────── Animated Icon Ring ─────────────── */

function PulsingIconRing({ icon, accentColor, ringColors, isActive }: {
  icon: keyof typeof Feather.glyphMap;
  accentColor: string;
  ringColors: [string, string];
  isActive: boolean;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.spring(scaleIn, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, {
              toValue: 1,
              duration: 1800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 0,
              duration: 1800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    } else {
      scaleIn.setValue(0.7);
      pulse.setValue(0);
    }
  }, [isActive]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  return (
    <Animated.View style={[styles.iconRingOuter, { transform: [{ scale: scaleIn }] }]}>
      {/* Pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            borderColor: accentColor,
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />
      {/* Gradient ring (simulated with border) */}
      <View style={[styles.iconRingInner, { borderColor: ringColors[0], backgroundColor: `${accentColor}15` }]}>
        <Feather name={icon} size={38} color={accentColor} />
      </View>
    </Animated.View>
  );
}

/* ─────────────── Progress Dots ─────────────── */

function ProgressDots({ current, total, accentColor }: {
  current: number; total: number; accentColor: string;
}) {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current
              ? { backgroundColor: accentColor, width: 28, borderRadius: 6 }
              : { backgroundColor: 'rgba(255,255,255,0.2)', width: 8, borderRadius: 4 },
          ]}
        />
      ))}
    </View>
  );
}

/* ─────────────── Step Counter Badge ─────────────── */

function StepBadge({ current, total, color }: { current: number; total: number; color: string }) {
  return (
    <View style={[styles.stepBadge, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
      <Text style={[styles.stepBadgeText, { color }]}>
        {current + 1} / {total}
      </Text>
    </View>
  );
}

/* ─────────────── Main Onboarding Overlay ─────────────── */

export default function OnboardingOverlay() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 800;

  const [step, setStep] = useState(0);
  const fadeOverlay = useRef(new Animated.Value(0)).current;
  const slideContent = useRef(new Animated.Value(40)).current;
  const fadeContent = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const userName = user?.profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  // Show/hide overlay with animation
  useEffect(() => {
    if (showOnboarding) {
      setVisible(true);
      setStep(0);
      Animated.parallel([
        Animated.timing(fadeOverlay, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(fadeContent, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
        Animated.spring(slideContent, { toValue: 0, tension: 40, friction: 8, delay: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(fadeOverlay, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        setVisible(false);
      });
    }
  }, [showOnboarding]);

  // Animate step transition
  const animateStepChange = useCallback((newStep: number) => {
    Animated.parallel([
      Animated.timing(fadeContent, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideContent, { toValue: -30, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setStep(newStep);
      slideContent.setValue(30);
      Animated.parallel([
        Animated.timing(fadeContent, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideContent, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding();
    } else {
      animateStepChange(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      // Reverse direction animation
      Animated.parallel([
        Animated.timing(fadeContent, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideContent, { toValue: 30, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        setStep(step - 1);
        slideContent.setValue(-30);
        Animated.parallel([
          Animated.timing(fadeContent, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(slideContent, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();
      });
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlayRoot,
        { opacity: fadeOverlay },
      ]}
    >
      {/* Dark backdrop */}
      <View style={styles.backdrop} />

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
        <Animated.View
          style={[
            styles.card,
            isDesktop ? styles.cardDesktop : styles.cardMobile,
            {
              opacity: fadeContent,
              transform: [{ translateY: slideContent }],
              ...Platform.select({
                web: {
                  boxShadow: `0 32px 80px rgba(0,0,0,0.65), 0 0 120px ${currentStep.accentColor}15`,
                } as any,
              }),
            },
          ]}
        >
          {/* Top bar: Skip + Step badge */}
          <View style={styles.cardTopBar}>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipButton}>
              <Text style={styles.skipText}>Omitir tutorial</Text>
              <Feather name="x" size={14} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
            <StepBadge current={step} total={STEPS.length} color={currentStep.accentColor} />
          </View>

          {/* Welcome header on step 0 */}
          {step === 0 && (
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeEmoji}>👋</Text>
              <Text style={styles.welcomeTitle}>
                ¡Bienvenido{userName ? `, ${userName}` : ''}!
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Te mostraremos cómo funciona Bitácora Digital en unos sencillos pasos.
              </Text>
            </View>
          )}

          {/* Icon ring */}
          <View style={styles.iconSection}>
            <PulsingIconRing
              icon={currentStep.icon}
              accentColor={currentStep.accentColor}
              ringColors={currentStep.ringColors}
              isActive={visible}
            />
          </View>

          {/* Step title */}
          <Text style={[styles.stepTitle, { color: currentStep.accentColor }]}>
            {currentStep.title}
          </Text>

          {/* Description */}
          <Text style={styles.stepDescription}>
            {currentStep.description}
          </Text>

          {/* Tip box */}
          <View style={[styles.tipBox, { backgroundColor: `${currentStep.accentColor}10`, borderColor: `${currentStep.accentColor}25` }]}>
            <Text style={styles.tipText}>
              {currentStep.tip}
            </Text>
          </View>

          {/* Progress dots */}
          <ProgressDots current={step} total={STEPS.length} accentColor={currentStep.accentColor} />

          {/* Nav buttons */}
          <View style={styles.navRow}>
            {step > 0 ? (
              <TouchableOpacity onPress={handlePrev} activeOpacity={0.7} style={styles.prevButton}>
                <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.7)" />
                <Text style={styles.prevButtonText}>Anterior</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.8}
              style={[
                styles.nextButton,
                { backgroundColor: currentStep.accentColor },
                Platform.select({
                  web: { boxShadow: `0 6px 24px ${currentStep.accentColor}40` } as any,
                }),
              ]}
            >
              <Text style={styles.nextButtonText}>
                {isLastStep ? '¡Comenzar!' : 'Siguiente'}
              </Text>
              <Feather
                name={isLastStep ? 'check-circle' : 'arrow-right'}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          {/* Keyboard hint for desktop */}
          {isDesktop && (
            <View style={styles.keyboardHint}>
              <Text style={styles.keyboardHintText}>
                Usa ← → para navegar · Esc para omitir
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Keyboard support for web */}
      {Platform.OS === 'web' && <WebKeyboardHandler onNext={handleNext} onPrev={handlePrev} onSkip={handleSkip} step={step} />}
    </Animated.View>
  );
}

/* ─────────── Web Keyboard Navigation ─────────── */

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

/* ─────────────── Styles ─────────────── */

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
  },
  scrollContentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#111318',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 28,
    overflow: 'hidden',
  },
  cardDesktop: {
    width: '100%',
    maxWidth: 520,
  },
  cardMobile: {
    width: '100%',
    maxWidth: 420,
  },

  /* Top bar */
  cardTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  skipText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  stepBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },

  /* Welcome */
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },

  /* Icon */
  iconSection: {
    alignItems: 'center',
    marginVertical: 18,
  },
  iconRingOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
    height: 110,
  },
  pulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
  },
  iconRingInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Content */
  stepTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 10,
  },
  stepDescription: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  tipBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  tipText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 19,
  },

  /* Dots */
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 22,
  },
  dot: {
    height: 8,
    ...Platform.select({
      web: { transition: 'all 0.3s ease' } as any,
    }),
  },

  /* Nav buttons */
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  prevButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  prevButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  nextButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  nextButtonText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14.5,
    color: '#FFFFFF',
  },

  /* Keyboard hint */
  keyboardHint: {
    alignItems: 'center',
    marginTop: 14,
    opacity: 0.35,
  },
  keyboardHintText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#FFFFFF',
  },
});
