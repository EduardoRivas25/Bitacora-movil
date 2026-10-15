import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingOverlay from './src/components/OnboardingOverlay';

export default function App() {
  let [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <OnboardingProvider>
          <View style={styles.root}>
            <AppNavigator />
            <OnboardingOverlay />
          </View>
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});