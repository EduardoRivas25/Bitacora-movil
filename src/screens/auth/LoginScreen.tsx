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
  Image
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';

const APP_LOGO = Platform.OS === 'web'
  ? require('../../../assets/logobitacoraredes.webp')
  : require('../../../assets/logobitacoraredes.png');

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const navigation = useNavigation<any>();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = () => {
    if (isRegister) {
      if (name.trim() !== '' && email.trim() !== '' && password !== '' && password === confirmPassword) {
        navigation.navigate('Dashboard');
      }
    } else {
      if (email.trim() !== '' && password !== '') {
        navigation.navigate('Dashboard');
      }
    }
  };

  const handleSocialAuth = (provider: string) => {
    // Simulación de autenticación social (Google / GitHub)
    navigation.navigate('Dashboard');
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <BlurView 
          intensity={30} 
          tint="dark" 
          style={[styles.glassCard, { width: isTablet ? 430 : '90%', maxWidth: 450 }]}
        >
          <Text style={styles.title}>
            {isRegister ? 'Crear Cuenta en\nBitácora Digital' : 'Bienvenido a\nBitácora Digital'}
          </Text>
          
          <View style={styles.navIconContainer}>
            <View style={styles.logoBadge}>
              <Image source={APP_LOGO} style={styles.logoImage} resizeMode="contain" />
            </View>
          </View>

          {/* Campo Nombre (solo en registro) */}
          {isRegister && (
            <TextInput
              placeholder="Nombre completo"
              placeholderTextColor="rgba(255, 255, 255, 0.25)"
              style={styles.input}
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
          )}

          {/* Campo Correo */}
          <TextInput
            placeholder="Correo electrónico"
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          {/* Campo Contraseña */}
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="rgba(255, 255, 255, 0.25)"
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
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

          {/* Campo Confirmar Contraseña (solo en registro) */}
          {isRegister && (
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Confirmar contraseña"
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
                secureTextEntry={!showConfirmPassword}
                style={[styles.input, styles.passwordInput]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
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
          )}

          {/* Olvidaste contraseña (solo en login) */}
          {!isRegister && (
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          )}

          {/* Botón Principal */}
          <TouchableOpacity 
            style={[styles.button, isRegister && { marginTop: 10 }]} 
            activeOpacity={0.8} 
            onPress={handleSubmit}
          >
            <Text style={styles.buttonText}>
              {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
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
  input: {
    fontFamily: 'Poppins_400Regular',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 18,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 16,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }) as any,
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