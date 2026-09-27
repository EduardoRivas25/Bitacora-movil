import React, { useState } from 'react';
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
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword, validateRequired } from '../../utils/validators';

const APP_LOGO = require('../../../assets/logobitacoraredes.png');

export default function LoginScreen() {
  // Extraemos también 'theme' para evaluar si estamos en modo oscuro
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const { signIn, signUp, signInGoogle, signInGitHub, isLoading } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [jobInfo, setJobInfo] = useState('');
  const [area, setArea] = useState('');
  const [activities, setActivities] = useState('');
  const [requestType, setRequestType] = useState<'tecnico_red' | 'administrador'>('tecnico_red');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (isRegister) {
      const nameVal = validateRequired(name, 2, 'El nombre completo');
      if (!nameVal.valid) errors.name = nameVal.error!;

      const jobVal = validateRequired(jobInfo, 3, 'La información laboral');
      if (!jobVal.valid) errors.jobInfo = jobVal.error!;

      const areaVal = validateRequired(area, 2, 'El área');
      if (!areaVal.valid) errors.area = areaVal.error!;

      const activitiesVal = validateRequired(activities, 6, 'Las actividades');
      if (!activitiesVal.valid) errors.activities = activitiesVal.error!;

      if (!termsAccepted) {
        errors.terms = 'Debes aceptar los términos y condiciones para solicitar la cuenta.';
      }
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

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!validateForm()) return;

    try {
      if (isRegister) {
        await signUp(email.trim(), password, name.trim());
        setErrorMsg('Solicitud de cuenta enviada correctamente. El administrador revisará la solicitud.');
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      const msg = err?.message || 'Error de autenticación';
      setErrorMsg(msg);
    }
  };

  const handleSocialAuth = async (provider: string) => {
    setErrorMsg('');
    setFieldErrors({});
    try {
      if (provider === 'Google') {
        await signInGoogle();
      } else {
        await signInGitHub();
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
    setJobInfo('');
    setArea('');
    setActivities('');
    setRequestType('tecnico_red');
    setTermsAccepted(false);
    setErrorMsg('');
    setFieldErrors({});
  };

  const isSmallMobile = width < 380;
  
  // Colores dinámicos calculados
  const placeholderColor = isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.4)";
  const inputBgColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';
  const inputBorderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  return (
    <LinearGradient 
      colors={isDark ? ['#050505', '#121212'] : ['#E8ECEF', '#F8F9FA']} 
      style={styles.container}
    >
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
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)',
            },
          ]}
        >
          <Text style={[styles.title, isSmallMobile && { fontSize: 22, lineHeight: 28 }, { color: colors.text }]}>
            {isRegister ? 'Solicitar cuenta\nen Bitácora Digital' : 'Bienvenido a\nBitácora Digital'}
          </Text>

          <View style={styles.navIconContainer}>
            <View style={[styles.logoBadge, { 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' 
            }]}>
              <Image source={APP_LOGO} style={styles.logoImage} resizeMode="contain" />
            </View>
          </View>

          {errorMsg !== '' && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color="#FF453A" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {isRegister && (
            <>
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

              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Información laboral"
                  placeholderTextColor={placeholderColor}
                  style={[
                    styles.input, 
                    { backgroundColor: inputBgColor, borderColor: inputBorderColor, color: colors.text },
                    fieldErrors.jobInfo && styles.inputError
                  ]}
                  value={jobInfo}
                  onChangeText={(val) => {
                    setJobInfo(val);
                    if (fieldErrors.jobInfo) setFieldErrors(prev => ({ ...prev, jobInfo: '' }));
                  }}
                />
                {fieldErrors.jobInfo && <Text style={styles.fieldErrorText}>{fieldErrors.jobInfo}</Text>}
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Área en la que se desempeña"
                  placeholderTextColor={placeholderColor}
                  style={[
                    styles.input, 
                    { backgroundColor: inputBgColor, borderColor: inputBorderColor, color: colors.text },
                    fieldErrors.area && styles.inputError
                  ]}
                  value={area}
                  onChangeText={(val) => {
                    setArea(val);
                    if (fieldErrors.area) setFieldErrors(prev => ({ ...prev, area: '' }));
                  }}
                />
                {fieldErrors.area && <Text style={styles.fieldErrorText}>{fieldErrors.area}</Text>}
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Actividades principales"
                  placeholderTextColor={placeholderColor}
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.input, 
                    styles.textArea, 
                    { backgroundColor: inputBgColor, borderColor: inputBorderColor, color: colors.text },
                    fieldErrors.activities && styles.inputError
                  ]}
                  value={activities}
                  onChangeText={(val) => {
                    setActivities(val);
                    if (fieldErrors.activities) setFieldErrors(prev => ({ ...prev, activities: '' }));
                  }}
                />
                {fieldErrors.activities && <Text style={styles.fieldErrorText}>{fieldErrors.activities}</Text>}
              </View>

              <View style={styles.sectionLabelRow}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Tipo de solicitud</Text>
              </View>
              <View style={[styles.segmentedContainer, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                borderColor: inputBorderColor
              }]}>
                <TouchableOpacity
                  style={[styles.segmentOption, requestType === 'tecnico_red' && { backgroundColor: colors.text }]}
                  onPress={() => setRequestType('tecnico_red')}
                >
                  <Text style={[
                    styles.segmentText, 
                    { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' },
                    requestType === 'tecnico_red' && { color: colors.background }
                  ]}>
                    Técnico de red
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentOption, requestType === 'administrador' && { backgroundColor: colors.text }]}
                  onPress={() => setRequestType('administrador')}
                >
                  <Text style={[
                    styles.segmentText, 
                    { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' },
                    requestType === 'administrador' && { color: colors.background }
                  ]}>
                    Administrador
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={[
                    styles.checkbox, 
                    { borderColor: colors.text, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' },
                    termsAccepted && { backgroundColor: colors.text }
                  ]}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                >
                  {termsAccepted && <Feather name="check" size={12} color={colors.background} />}
                </TouchableOpacity>
                <Text style={[styles.checkboxText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }]}>
                  Acepto los términos y condiciones.
                </Text>
              </View>
              {fieldErrors.terms && <Text style={styles.fieldErrorText}>{fieldErrors.terms}</Text>}
            </>
          )}

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
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={[styles.forgotPasswordText, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }]}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.button, 
              { backgroundColor: colors.text },
              isRegister && { marginTop: 10 }, 
              isLoading && { opacity: 0.6 }
            ]}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              {isLoading ? 'Validando...' : isRegister ? 'Solicitar Cuenta' : 'Iniciar Sesión'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: inputBorderColor }]} />
            <Text style={[styles.dividerText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)' }]}>
              {isRegister ? 'o registrarse con' : 'o continuar con'}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: inputBorderColor }]} />
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity 
              style={[styles.socialButton, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderColor: inputBorderColor
              }]} 
              activeOpacity={0.8} 
              onPress={() => handleSocialAuth('Google')}
            >
              <Ionicons name="logo-google" size={18} color={colors.text} style={styles.socialIcon} />
              <Text style={[styles.socialButtonText, { color: colors.text }]}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.socialButton, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderColor: inputBorderColor
              }]} 
              activeOpacity={0.8} 
              onPress={() => handleSocialAuth('GitHub')}
            >
              <Ionicons name="logo-github" size={18} color={colors.text} style={styles.socialIcon} />
              <Text style={[styles.socialButtonText, { color: colors.text }]}>GitHub</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleText, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }]}>
              {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={toggleMode}>
              <Text style={[styles.toggleLink, { color: colors.text }]}>
                {isRegister ? ' Inicia sesión' : ' Regístrate'}
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  glassCard: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
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
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  inputError: { borderColor: '#FF453A', backgroundColor: 'rgba(255, 69, 58, 0.06)' },
  fieldErrorText: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#FF453A', marginTop: 4, marginLeft: 6 },
  sectionLabelRow: { marginTop: 4, marginBottom: 8 },
  sectionLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 12,
  },
  segmentOption: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  segmentText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
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
  socialIcon: { marginRight: 8 },
  socialButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  toggleText: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  toggleLink: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
});