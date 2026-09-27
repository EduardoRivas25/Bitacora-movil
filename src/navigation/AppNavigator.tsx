import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../types';

import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';

import LoginScreen from '../screens/auth/LoginScreen';
import BottomTabNavigator from './BottomTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Extraemos el tema dinámico y los colores correspondientes
  const { theme, colors: themeColors } = useTheme();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer
      theme={{
        dark: theme === 'dark', // Ahora reacciona al estado del contexto
        colors: {
          primary: Colors.primary,
          background: themeColors.background, // Fondo dinámico
          card: themeColors.card,             // Tarjetas dinámicas
          text: themeColors.text,             // Texto dinámico
          border: Colors.border,
          notification: Colors.danger,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          // Aplicamos el color de fondo dinámico directamente al contenedor de las vistas
          contentStyle: { backgroundColor: themeColors.background },
          animation: 'fade',
        }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={BottomTabNavigator} />
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ animationTypeForReplace: 'pop' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}