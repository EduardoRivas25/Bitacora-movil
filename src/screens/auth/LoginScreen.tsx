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
  Alert 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword, validateRequired } from '../../utils/validators';

const APP_LOGO = require('../../../assets/logobitacoraredes.png');

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const { signIn, signUp, signInGoogle, signInGitHub, isLoading } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (isRegister) {
      const nameVal = validateRequired(name, 2, 'El nombre completo');
      if (!nameVal.valid) {
        errors.name = nameVal.error!;
      }
    }

    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      errors.email = emailVal.error!;
    }

    const passVal = validatePassword(password, 6);
    if (!passVal.valid) {
      errors.password = passVal.error!;
    }

    if (isRegister) {
      if (!confirmPassword) {
        errors.confirmPassword = 'Debes confirmar tu contraseña.';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden.';
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setErrorMsg(firstError);
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
    setErrorMsg('');
    setFieldErrors({});
  };

  const isSmallMobile = width < 380;

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BlurView 
          intensity={30} 
          tint="dark" 
          style={[
            styles.glassCard, 
            { 
              width: isTablet ? 440 : isSmallMobile ? '94%' : '90%', 
              maxWidth: 460,
              padding: isSmallMobile ? 22 : 32 
            }
          ]}
        >
          <Text style={[styles.title, isSmallMobile && { fontSize: 22, lineHeight: 28 }]}>
            {isRegister ? 'Crear Cuenta en\nBitácora Digital' : 'Bienvenido a\nBitácora Digital'}
          </Text>
          
          <View style={styles.navIconContainer}>
            <View style={styles.logoBadge}>
              <Image source={APP_LOGO} style={styles.logoImage} resizeMode="contain" />
            </View>
          </View>

          {/* Mensaje de error general */}
          {errorMsg !== '' && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color="#FF453A" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Campo Nombre (solo en registro) */}
          {isRegister && (
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="Nombre completo"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                style={[styles.input, fieldErrors.name && styles.inputError]}
                autoCapitalize="words"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                }}
              />
              {fieldErrors.name && (
                <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text>
              )}
            </View>
          )}

          {/* Campo Correo / Usuario */}
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="correo@dominio.com"
              placeholderTextColor="rgba(255, 255, 255, 0.25)"
              style={[styles.input, fieldErrors.email && styles.inputError]}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
              }}
            />
            {fieldErrors.email && (
              <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
            )}
          </View>

          {/* Campo Contraseña */}
          <View style={styles.inputWrapper}>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Contraseña (mínimo 6 caracteres)"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                secureTextEntry={!showPassword}
                style={[styles.input, styles.passwordInput, fieldErrors.password && styles.inputError]}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                }}
              />
              <TouchableOpacity 
                style={styles.eyeButton} 
                activeOpacity={0.7}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Feather 
                  name={showPassword ? "eye" : "eye-off"} 
                  size={20} 
                  color="rgba(255, 255, 255, 0.5)" 
                />
              </TouchableOpacity>
            </View>
            {fieldErrors.password && (
              <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
            )}
          </View>

          {/* Campo Confirmar Contraseña (solo en registro) */}
          {isRegister && (
            <View style={styles.inputWrapper}>
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Confirmar contraseña"
                  placeholderTextColor="rgba(255, 255, 255, 0.25)"
                  secureTextEntry={!showConfirmPassword}
                  style={[styles.input, styles.passwordInput, fieldErrors.confirmPassword && styles.inputError]}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }}
                />
                <TouchableOpacity 
                  style={styles.eyeButton} 
                  activeOpacity={0.7}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Feather 
                    name={showConfirmPassword ? "eye" : "eye-off"} 
                    size={20} 
                    color="rgba(255, 255, 255, 0.5)" 
                  />
                </TouchableOpacity>
              </View>
              {fieldErrors.confirmPassword && (
                <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text>
              )}
            </View>
          )}

          {/* Olvidaste contraseña (solo en login) */}
          {!isRegister && (
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          )}

          {/* Botón Principal */}
          <TouchableOpacity 
            style={[styles.button, isRegister && { marginTop: 10 }, isLoading && { opacity: 0.6 }]} 
            activeOpacity={0.8} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Validando...' : isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </Text>
          </TouchableOpacity>

          {/* Divisor */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              {isRegister ? 'o registrarse con' : 'o continuar con'}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Botones Sociales */}
          <View style={styles.socialContainer}>
            <TouchableOpacity 
              style={styles.socialButton} 
              activeOpacity={0.8}
              onPress={() => handleSocialAuth('Google')}
            >
              <Ionicons name="logo-google" size={18} color="#FFFFFF" style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.socialButton} 
              activeOpacity={0.8}
              onPress={() => handleSocialAuth('GitHub')}
            >
              <Ionicons name="logo-github" size={18} color="#FFFFFF" style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>GitHub</Text>
            </TouchableOpacity>
          </View>

          {/* Toggle entre Iniciar Sesión y Crear Cuenta */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={toggleMode}>
              <Text style={styles.toggleLink}>
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
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  glassCard: {
    padding: 35,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 34,
  },
  navIconContainer: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
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
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#FF453A',
    flex: 1,
  },
  inputWrapper: {
    marginBottom: 14,
  },
  input: {
    fontFamily: 'Poppins_400Regular',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 18,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }) as any,
  },
  inputError: {
    borderColor: '#FF453A',
    backgroundColor: 'rgba(255, 69, 58, 0.06)',
  },
  fieldErrorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#FF453A',
    marginTop: 4,
    marginLeft: 6,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 18,
    top: 18,
    height: 20,
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  forgotPasswordText: {
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#000000',
    fontSize: 15,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginHorizontal: 12,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 14,
  },
  socialIcon: {
    marginRight: 8,
  },
  socialButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    fontSize: 14,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  toggleText: {
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
  toggleLink: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    fontSize: 13,
  },
});