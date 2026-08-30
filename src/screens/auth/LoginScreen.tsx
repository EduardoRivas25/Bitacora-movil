import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, useWindowDimensions, Platform, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (email !== '' && password !== '') {
      navigation.navigate('Dashboard');
    }
  };

  return (
    <LinearGradient colors={['#050505', '#121212']} style={styles.container}>
      <BlurView 
        intensity={30} 
        tint="dark" 
        style={[styles.glassCard, { width: isTablet ? '40%' : '85%' }]}
      >
        <Text style={styles.title}>Bienvenido a{'\n'}Bitácora Digital</Text>
        
        <View style={styles.navIconContainer}>
          <Feather name="navigation" size={28} color="rgba(255, 255, 255, 0.4)" />
        </View>

        <TextInput
          placeholder="Correo electrónico"
          placeholderTextColor="rgba(255, 255, 255, 0.25)"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

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

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={handleLogin}>
          <Text style={styles.buttonText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </BlurView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 35,
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
    marginBottom: 30,
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
});