import { Platform } from 'react-native';
import { createClient } from '@insforge/sdk';

if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

const baseUrl = process.env.EXPO_PUBLIC_INSFORGE_URL;
const anonKey = process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY;

if (!baseUrl || !anonKey) {
  console.warn('Falta la configuración pública de InsForge en .env');
}

// Native clients receive refresh tokens in response bodies. Browser clients
// use InsForge's refresh cookie and CSRF flow.
export const insforge = createClient({
  baseUrl,
  anonKey,
  isServerMode: Platform.OS !== 'web',
});
