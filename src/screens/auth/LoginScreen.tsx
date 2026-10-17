import React, { useEffect, useRef, useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
  View,
  ScrollView,
  Image,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword, validateRequired } from '../../utils/validators';
import ThemeToggle from '../../components/ThemeToggle';
import PasswordRecoveryScreen from './PasswordRecoveryScreen';
import ShapeGridBackground from '../../components/ShapeGridBackground';
import { APPLE_SVG_XML, GOOGLE_SVG_XML } from '../../components/socialIconXml';

const LOGO_DARK = require('../../../assets/logobitacoraredes.png');
const LOGO_LIGHT = require('../../../assets/logobitacoraredesmodoclaro.png');
const WALK_SPRITE = require('../../../assets/pasos.png');
const TERMS_SECTIONS = [
  {
    title: 'Uso autorizado',
    body: 'La aplicación es para personal autorizado que administra o consulta información de redes e infraestructura. Cada usuario debe usar únicamente las funciones permitidas por su rol.',
  },
  {
    title: 'Cuenta y acceso',
    body: 'El usuario debe proporcionar datos correctos, proteger sus credenciales y no compartir su cuenta. El administrador puede habilitar o deshabilitar el acceso según las necesidades del proyecto.',
  },
  {
    title: 'Información registrada',
    body: 'Los datos de dispositivos, redes, incidentes, mantenimientos, configuraciones y reportes deben ser correctos y mantenerse actualizados. Cada usuario es responsable de las operaciones que realiza con su cuenta.',
  },
  {
    title: 'Información sensible',
    body: 'No se deben guardar contraseñas, claves privadas, tokens ni secretos en descripciones, configuraciones o archivos. Los respaldos pueden contener información sensible y solo deben consultarse o compartirse con autorización.',
  },
  {
    title: 'Disponibilidad y reportes',
    body: 'La aplicación depende de los servicios de InsForge y de la conexión a Internet. Los reportes reflejan la información disponible en el sistema al momento de generarlos; el usuario debe verificar su contenido antes de distribuirlos.',
  },
  {
    title: 'Uso indebido y soporte',
    body: 'No se permite acceder, modificar, borrar ni divulgar información sin autorización. El administrador podrá suspender el acceso ante uso indebido o por razones operativas. Para soporte o dudas, contacta al responsable del proyecto o del área de TI.',
  },
];

export default function LoginScreen() {
  // Extraemos también 'theme' para evaluar si estamos en modo oscuro
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const appLogo = isDark ? LOGO_DARK : LOGO_LIGHT;
  
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const { signIn, signUp, verifyEmail, signInGoogle, signInApple, isLoading, authorizationError } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const walkProgress = useRef(new Animated.Value(0)).current;
  const [walkFrame, setWalkFrame] = useState(1);
  const [walkFacing, setWalkFacing] = useState(1);
  const [isWalking, setIsWalking] = useState(true);

  useEffect(() => {
    let active = true;
    let pauseTimer: ReturnType<typeof setTimeout>;
    const walkBack = () => {
      if (!active) return;
      setWalkFacing(-1);
      setIsWalking(true);
      Animated.timing(walkProgress, { toValue: 0, duration: 3000, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
        if (!active || !finished) return;
        setWalkFrame(0);
        setIsWalking(false);
        pauseTimer = setTimeout(walkForward, 2500);
      });
    };
    const walkForward = () => {
      if (!active) return;
      setWalkFacing(1);
      setIsWalking(true);
      Animated.timing(walkProgress, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
        if (!active || !finished) return;
        setWalkFrame(0);
        setIsWalking(false);
        pauseTimer = setTimeout(walkBack, 2500);
      });
    };
    walkForward();
    return () => {
      active = false;
      walkProgress.stopAnimation();
      clearTimeout(pauseTimer);
    };
  }, [walkProgress]);

  useEffect(() => {
    if (!isWalking) return;
    const frameTimer = setInterval(() => setWalkFrame(frame => (frame % 5) + 1), 150);
    return () => clearInterval(frameTimer);
  }, [isWalking]);

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (isRegister) {
      const nameVal = validateRequired(name, 2, 'El nombre completo');
      if (!nameVal.valid) errors.name = nameVal.error!;
    }

    if (!termsAccepted) {
      errors.terms = 'Debes aceptar los términos y condiciones para continuar.';
    }

    const emailVal = validateEmail(email);
    if (!emailVal.valid) errors.email = emailVal.error!;

    const passVal = validatePassword(password, 6);
    if (!passVal.valid) errors.password = passVal.error!;

    if (isRegister) {
      if (!confirmPassword) {
        errors.confirmPassword = 'Debes confirmar tu contraseña.';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden.';
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setErrorMsg(Object.values(errors)[0]);
      return false;
    }

    setErrorMsg('');
    return true;
  };

  const handleBackToLogin = () => {
    setIsRegister(false);
    setPendingVerificationEmail('');
    setVerificationCode('');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setFieldErrors({});
    setShowTerms(false);
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (pendingVerificationEmail) {
      if (!/^\d{6}$/.test(verificationCode.trim())) {
        setErrorMsg('Introduce el código de seis dígitos enviado a tu correo.');
        return;
      }
      try {
        await verifyEmail(pendingVerificationEmail, verificationCode);
      } catch (err: any) {
        setErrorMsg(err?.message || 'No se pudo verificar el correo.');
        if (err?.message?.includes('administrador habilite')) {
          setPendingVerificationEmail('');
          setVerificationCode('');
        }
      }
      return;
    }
    if (!validateForm()) return;

    try {
      if (isRegister) {
        const result = await signUp(email.trim(), password, name.trim());
        if (result.requireEmailVerification) {
          setPendingVerificationEmail(email.trim());
          setIsRegister(false);
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      const msg = err?.message || 'Error de autenticación';
      if (msg.includes('administrador habilite')) {
        setIsRegister(false);
        setPendingVerificationEmail('');
        setVerificationCode('');
        setName('');
        setPassword('');
        setConfirmPassword('');
      }
      setErrorMsg(msg);
    }
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setFieldErrors(current => ({ ...current, terms: '' }));
    setErrorMsg(current => current === 'Debes aceptar los términos y condiciones para continuar.' ? '' : current);
    setShowTerms(false);
  };

  const handleSocialAuth = async (provider: string) => {
    if (!termsAccepted) {
      setErrorMsg('Debes aceptar los términos y condiciones para continuar.');
      setShowTerms(true);
      return;
    }
    setErrorMsg('');
    setPendingVerificationEmail('');
    setVerificationCode('');
    setFieldErrors({});
    try {
      if (provider === 'Google') {
        await signInGoogle();
      } else {
        await signInApple();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || `Error al autenticar con ${provider}`);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setTermsAccepted(false);
    setShowTerms(false);
    setErrorMsg('');
    setFieldErrors({});
    setPendingVerificationEmail('');
    setVerificationCode('');
  };

  const isSmallMobile = width < 380;

  if (showRecovery) {
    return <PasswordRecoveryScreen initialEmail={email} onBack={() => setShowRecovery(false)} />;
  }
  
  // Colores dinámicos calculados
  const placeholderColor = isDark ? 'rgba(255, 255, 255, 0.58)' : '#526174';
  const inputBgColor = isDark ? 'rgba(255, 255, 255, 0.075)' : '#F8FAFC';
  const inputBorderColor = isDark ? 'rgba(255, 255, 255, 0.22)' : '#738196';
  const secondaryTextColor = isDark ? 'rgba(255, 255, 255, 0.76)' : '#334155';
  const mutedTextColor = isDark ? 'rgba(255, 255, 255, 0.58)' : '#526174';
  const socialButtonBackground = isDark ? 'rgba(255, 255, 255, 0.11)' : 'rgba(15, 23, 42, 0.11)';
  const socialButtonBorder = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.25)';
  const primaryButtonBackground = isDark ? '#E5E7EB' : '#111827';
  const primaryButtonText = isDark ? '#050505' : '#FFFFFF';

  return (
    <LinearGradient 
      colors={isDark ? ['#050505', '#121212'] : ['#E8ECEF', '#F8F9FA']} 
      style={styles.container}
    >
      <ShapeGridBackground
        lineColor={isDark ? 'rgba(255, 255, 255, 0.075)' : 'rgba(0, 0, 0, 0.22)'}
      />
      <View style={styles.topBar}>
        <ThemeToggle 
          style={[
            styles.themeToggleBtn,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              borderColor: inputBorderColor,
            }
          ]}
          size={18}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BlurView
          intensity={isDark ? 30 : 50}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.glassCard,
            {
              width: isTablet ? 440 : isSmallMobile ? '94%' : '90%',
              maxWidth: 460,
              padding: isSmallMobile ? 22 : 32,
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.7)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(15, 23, 42, 0.32)',
            },
          ]}
        >
          {(isRegister || Boolean(pendingVerificationEmail)) && (
            <TouchableOpacity
              style={[
                styles.backToHomeHeaderButton,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: inputBorderColor,
                }
              ]}
              onPress={handleBackToLogin}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Volver al inicio"
            >
              <Feather name="arrow-left" size={15} color={colors.text} />
              <Text style={[styles.backToHomeHeaderText, { color: colors.text }]}>
                Volver al inicio
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.title, isSmallMobile && { fontSize: 22, lineHeight: 28 }, { color: colors.text }]}>
            {pendingVerificationEmail ? 'Verifica tu correo' : isRegister ? 'Crear cuenta\nen Bitácora Digital' : 'Bienvenido a\nBitácora Digital'}
          </Text>

          <View style={styles.navIconContainer}>
            <View style={[styles.logoBadge, { 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' 
            }]}>
              <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
            </View>
          </View>

          {errorMsg !== '' && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color="#FF453A" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
          {authorizationError !== '' && errorMsg === '' && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color="#FF453A" />
              <Text style={styles.errorText}>{authorizationError}</Text>
            </View>
          )}

          {pendingVerificationEmail !== '' ? (
            <View style={styles.verificationCardContent}>
              <Text style={[styles.verificationDesc, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }]}>
                Escribe el código de seis dígitos enviado a:{'\n'}
                <Text style={{ fontFamily: 'Poppins_600SemiBold', color: colors.text }}>
                  {pendingVerificationEmail}
                </Text>
              </Text>

              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Código de 6 dígitos"
                  placeholderTextColor={placeholderColor}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  style={[
                    styles.input,
                    styles.verificationCodeInput,
                    verificationCode.length > 0 && styles.verificationCodeInputFilled,
                    { backgroundColor: inputBgColor, borderColor: inputBorderColor, color: colors.text }
                  ]}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.button, 
                  { backgroundColor: primaryButtonBackground, marginTop: 4 },
                  isLoading && { opacity: 0.6 }
                ]}
                activeOpacity={0.8}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text style={[styles.buttonText, { color: primaryButtonText }]}>
                  {isLoading ? 'Verificando...' : 'Verificar correo'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelVerificationButton,
                  { borderColor: inputBorderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }
                ]}
                activeOpacity={0.7}
                onPress={handleBackToLogin}
              >
                <Feather name="arrow-left" size={16} color={colors.text} style={{ marginRight: 6 }} />
                <Text style={[styles.cancelVerificationText, { color: colors.text }]}>
                  Volver al inicio de sesión
                </Text>
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: inputBorderColor }]} />
                <Text style={[styles.dividerText, { color: mutedTextColor }]}>
                  o continuar con
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: inputBorderColor }]} />
              </View>

              <View style={styles.socialContainer}>
                <TouchableOpacity 
                  style={[styles.socialButton, { 
                    backgroundColor: socialButtonBackground,
                    borderColor: socialButtonBorder
                  }]} 
                  activeOpacity={0.8} 
                  onPress={() => handleSocialAuth('Google')}
                >
                  <View style={styles.socialIcon}><SvgXml xml={GOOGLE_SVG_XML} width={18} height={18} /></View>
                  <Text style={[styles.socialButtonText, { color: colors.text }]}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.socialButton, { 
                    backgroundColor: socialButtonBackground,
                    borderColor: socialButtonBorder
                  }]} 
                  activeOpacity={0.8} 
                  onPress={() => handleSocialAuth('Apple')}
                >
                  <View style={styles.socialIcon}><SvgXml xml={APPLE_SVG_XML} width={17} height={20} override={{ fill: colors.text }} /></View>
                  <Text style={[styles.socialButtonText, { color: colors.text }]}>Apple</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {isRegister && (
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="Nombre completo"
                    placeholderTextColor={placeholderColor}
                    style={[
                      styles.input, 
                      { backgroundColor: inputBgColor, borderColor: inputBorderColor, color: colors.text },
                      fieldErrors.name && styles.inputError
                    ]}
                    autoCapitalize="words"
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                    }}
                  />
                  {fieldErrors.name && <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text>}
                </View>
              )}

              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityLabel="Acepto los términos y condiciones"
                  accessibilityHint={termsAccepted ? 'Desmarca para retirar tu aceptación' : 'Abre los términos para revisarlos y aceptarlos'}
                  accessibilityState={{ checked: termsAccepted }}
                  style={[
                    styles.checkbox,
                    { borderColor: colors.text, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' },
                    termsAccepted && { backgroundColor: colors.text }
                  ]}
                  onPress={() => {
                    if (termsAccepted) {
                      setTermsAccepted(false);
                    } else {
                      setShowTerms(true);
                    }
                  }}>
                  {termsAccepted && <Feather name="check" size={12} color={colors.background} />}
                </TouchableOpacity>
                <Text style={[styles.checkboxText, { color: secondaryTextColor }]}>
                  Acepto los{' '}
                  <Text
                    accessibilityRole="link"
                    style={[styles.termsLink, { color: colors.text }]}
                    onPress={() => setShowTerms(true)}>
                    términos y condiciones
                  </Text>
                  .
                </Text>
              </View>
              {isRegister && (
                <Text style={[styles.termsDraftHint, { color: colors.textTertiary }]}>
                  El acceso se habilita por un administrador.
                </Text>
              )}
              {fieldErrors.terms && <Text style={styles.fieldErrorText}>{fieldErrors.terms}</Text>}

              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="correo@dominio.com"
                  placeholderTextColor={placeholderColor}
                  style={[
                    styles.input, 
                    { backgroundColor: inputBgColor, borderColor: inputBorderColor, color: colors.text },
                    fieldErrors.email && styles.inputError
                  ]}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                  }}
                />
                {fieldErrors.email && <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>}
              </View>

              <View style={styles.inputWrapper}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    placeholder="Contraseña (mínimo 6 caracteres)"
                    placeholderTextColor={placeholderColor}
                    secureTextEntry={!showPassword}
                    style={[
                      styles.input, 
                      styles.passwordInput, 
                      { backgroundColor: inputBgColor, borderColor: inputBorderColor, color: colors.text },
                      fieldErrors.password && styles.inputError
                    ]}
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                    }}
                  />
                  <TouchableOpacity style={styles.eyeButton} activeOpacity={0.7} onPress={() => setShowPassword(!showPassword)}>
                    <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color={placeholderColor} />
                  </TouchableOpacity>
                </View>
                {fieldErrors.password && <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>}
              </View>

              {isRegister && (
                <View style={styles.inputWrapper}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      placeholder="Confirmar contraseña"
                      placeholderTextColor={placeholderColor}
                      secureTextEntry={!showConfirmPassword}
                      style={[
                        styles.input, 
                        styles.passwordInput, 
                        { backgroundColor: inputBgColor, borderColor: inputBorderColor, color: colors.text },
                        fieldErrors.confirmPassword && styles.inputError
                      ]}
                      value={confirmPassword}
                      onChangeText={(val) => {
                        setConfirmPassword(val);
                        if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                      }}
                    />
                    <TouchableOpacity style={styles.eyeButton} activeOpacity={0.7} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Feather name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color={placeholderColor} />
                    </TouchableOpacity>
                  </View>
                  {fieldErrors.confirmPassword && <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text>}
                </View>
              )}

              {!isRegister && (
                <TouchableOpacity style={styles.forgotPassword} onPress={() => setShowRecovery(true)}>
                <Text style={[styles.forgotPasswordText, { color: secondaryTextColor }]}>
                    ¿Olvidaste tu contraseña?
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.loginButtonTrack}>
              {!isRegister && !isLoading && (
                <Animated.View pointerEvents="none" accessible={false} style={[
                  styles.walker,
                  { transform: [
                    { translateX: walkProgress.interpolate({ inputRange: [0, 1], outputRange: [18, Math.max(18, Math.min(300, width - (isSmallMobile ? 112 : 138)))] }) },
                    { translateY: walkProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -2, 0] }) },
                    { scaleX: walkFacing },
                  ] },
                ]}>
                  <View style={styles.walkerCrop}>
                    <Image source={WALK_SPRITE} resizeMode="stretch" style={[styles.walkerSprite, { left: -walkFrame * 42 }]} />
                  </View>
                </Animated.View>
              )}
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: primaryButtonBackground },
                  isRegister && { marginTop: 10 },
                  isLoading && { opacity: 0.6 }
                ]}
                activeOpacity={0.8}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text style={[styles.buttonText, { color: primaryButtonText }]}>
                  {isLoading ? 'Validando...' : isRegister ? 'Crear cuenta' : 'Iniciar Sesión'}
                </Text>
              </TouchableOpacity>
              </View>

              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: inputBorderColor }]} />
                <Text style={[styles.dividerText, { color: mutedTextColor }]}>
                  {isRegister ? 'o registrarse con' : 'o continuar con'}
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: inputBorderColor }]} />
              </View>

              <View style={styles.socialContainer}>
                <TouchableOpacity 
                  style={[styles.socialButton, { 
                    backgroundColor: socialButtonBackground,
                    borderColor: socialButtonBorder
                  }]} 
                  activeOpacity={0.8} 
                  onPress={() => handleSocialAuth('Google')}
                >
                  <View style={styles.socialIcon}><SvgXml xml={GOOGLE_SVG_XML} width={18} height={18} /></View>
                  <Text style={[styles.socialButtonText, { color: colors.text }]}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.socialButton, { 
                    backgroundColor: socialButtonBackground,
                    borderColor: socialButtonBorder
                  }]} 
                  activeOpacity={0.8} 
                  onPress={() => handleSocialAuth('Apple')}
                >
                  <View style={styles.socialIcon}><SvgXml xml={APPLE_SVG_XML} width={17} height={20} override={{ fill: colors.text }} /></View>
                  <Text style={[styles.socialButtonText, { color: colors.text }]}>Apple</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.toggleContainer}>
                <Text style={[styles.toggleText, { color: secondaryTextColor }]}>
                  {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}
                </Text>
                <TouchableOpacity activeOpacity={0.7} onPress={toggleMode}>
                  <Text style={[styles.toggleLink, { color: colors.text }]}>
                    {isRegister ? ' Inicia sesión' : ' Regístrate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </BlurView>
      </ScrollView>
      <Modal visible={showTerms} transparent animationType="fade" onRequestClose={() => setShowTerms(false)}>
        <View style={styles.termsOverlay}>
          <View style={[styles.termsModal, { backgroundColor: colors.modalBg, borderColor: colors.cardBorder }]}>
            <View style={styles.termsModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.termsModalTitle, { color: colors.textPrimary }]}>Términos de uso</Text>
                <Text style={[styles.termsModalSubtitle, { color: colors.textSecondary }]}>Bitácora Digital</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cerrar términos y condiciones"
                style={styles.termsCloseButton}
                onPress={() => setShowTerms(false)}>
                <Feather name="x" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.termsDraftNotice}>
              <Feather name="alert-triangle" size={16} color="#FF9F0A" />
              <Text style={styles.termsDraftNoticeText}>
                Borrador pendiente de revisión y aprobación institucional. No sustituye un aviso de privacidad.
              </Text>
            </View>
            <ScrollView style={styles.termsScroll} showsVerticalScrollIndicator>
              {TERMS_SECTIONS.map(section => (
                <View key={section.title} style={styles.termsSection}>
                  <Text style={[styles.termsSectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
                  <Text style={[styles.termsSectionBody, { color: colors.textSecondary }]}>{section.body}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.termsActions}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.termsAction, styles.termsDeclineAction, { borderColor: colors.cardBorder }]}
                onPress={() => setShowTerms(false)}>
                <Text style={[styles.termsDeclineText, { color: colors.textSecondary }]}>
                  {isRegister ? 'No aceptar' : 'Cerrar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.termsAction, { backgroundColor: colors.buttonBg }]}
                onPress={handleAcceptTerms}>
                <Text style={[styles.termsCloseActionText, { color: colors.buttonText }]}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 24,
    right: 20,
    zIndex: 10,
  },
  themeToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  glassCard: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 34,
  },
  navIconContainer: { alignItems: 'center', marginBottom: 26 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  logoImage: { width: '100%', height: '100%' },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#FF453A', flex: 1 },
  inputWrapper: { marginBottom: 14 },
  input: {
    fontFamily: 'Poppins_400Regular',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    fontSize: 15,
    marginBottom: 0,
    ...Platform.select({ web: { outlineStyle: 'none' } }) as any,
  },
  inputError: { borderColor: '#FF453A', backgroundColor: 'rgba(255, 69, 58, 0.06)' },
  fieldErrorText: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#FF453A', marginTop: 4, marginLeft: 6 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 10 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: { fontFamily: 'Poppins_400Regular', fontSize: 12, flex: 1 },
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 50 },
  eyeButton: { position: 'absolute', right: 18, top: 18, height: 20, width: 20, justifyContent: 'center', alignItems: 'center' },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 25 },
  forgotPasswordText: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  button: { padding: 18, borderRadius: 16, alignItems: 'center' },
  buttonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  loginButtonTrack: { position: 'relative', overflow: 'visible' },
  walker: { position: 'absolute', zIndex: 2, top: -44, left: 0, width: 42, height: 48 },
  walkerCrop: { width: 42, height: 48, overflow: 'hidden' },
  walkerSprite: { position: 'absolute', top: -36, width: 252, height: 168 },
  termsLink: { fontFamily: 'Poppins_600SemiBold', textDecorationLine: 'underline' },
  termsDraftHint: { fontFamily: 'Poppins_400Regular', fontSize: 10, marginTop: -7, marginBottom: 10, marginLeft: 28 },
  termsOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.72)' },
  termsModal: { width: '100%', maxWidth: 520, maxHeight: '86%', borderRadius: 20, borderWidth: 1, padding: 18 },
  termsModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  termsModalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  termsModalSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
  termsCloseButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(128,128,128,0.12)' },
  termsDraftNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 12, padding: 11, marginBottom: 10, backgroundColor: 'rgba(255,159,10,0.12)' },
  termsDraftNoticeText: { flex: 1, color: '#FF9F0A', fontFamily: 'Poppins_400Regular', fontSize: 10, lineHeight: 16 },
  termsScroll: { flexShrink: 1 },
  termsSection: { marginBottom: 13 },
  termsSectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, marginBottom: 3 },
  termsSectionBody: { fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 17 },
  termsActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  termsAction: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  termsDeclineAction: { borderWidth: 1 },
  termsDeclineText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  termsCloseActionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginHorizontal: 12 },
  socialContainer: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
  },
  socialIcon: { width: 18, height: 20, flexShrink: 0, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  socialButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  toggleText: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  toggleLink: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  backToHomeHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 6,
  },
  backToHomeHeaderText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
  },
  verificationCardContent: {
    width: '100%',
    alignItems: 'stretch',
  },
  verificationDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
  },
  verificationCodeInput: {
    textAlign: 'center',
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0,
    paddingVertical: 14,
  },
  verificationCodeInputFilled: {
    fontSize: 22,
    letterSpacing: 8,
    fontFamily: 'Poppins_700Bold',
  },
  cancelVerificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 12,
  },
  cancelVerificationText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
  },
});
