import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import type { UserSchema } from '@insforge/sdk';
import { insforge } from '../lib/insforgeClient';

const REFRESH_TOKEN_KEY = 'insforge_refresh_token';
const NATIVE_REDIRECT = 'bitacoraredes://auth/callback';

if (Platform.OS !== 'web') {
  // The SDK's PKCE helper needs Web Crypto, TextEncoder and btoa. Expo Crypto
  // supplies the cryptographic operations; the two fallbacks encode the
  // ASCII-only PKCE verifier when those browser globals are absent on Hermes.
  if (!globalThis.crypto?.subtle) {
    Object.assign(globalThis, {
      crypto: {
        getRandomValues: Crypto.getRandomValues,
        subtle: {
          digest: (_algorithm: string, data: BufferSource) => Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data),
        },
      },
    });
  }
  if (!globalThis.TextEncoder) {
    Object.assign(globalThis, {
      TextEncoder: class {
        encode(value: string) { return Uint8Array.from(value, (character) => character.charCodeAt(0)); }
      },
    });
  }
  if (!globalThis.btoa) {
    Object.assign(globalThis, {
      btoa: (binary: string) => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let encoded = '';
        for (let i = 0; i < binary.length; i += 3) {
          const a = binary.charCodeAt(i);
          const b = i + 1 < binary.length ? binary.charCodeAt(i + 1) : 0;
          const c = i + 2 < binary.length ? binary.charCodeAt(i + 2) : 0;
          encoded += alphabet[a >> 2];
          encoded += alphabet[((a & 3) << 4) | (b >> 4)];
          encoded += i + 1 < binary.length ? alphabet[((b & 15) << 2) | (c >> 6)] : '=';
          encoded += i + 2 < binary.length ? alphabet[c & 63] : '=';
        }
        return encoded;
      },
    });
  }
}

type SessionResult = { user: UserSchema; accessToken: string; refreshToken?: string };

async function acceptSession(data: SessionResult | null, previousRefreshToken?: string): Promise<UserSchema> {
  if (!data) throw new Error('InsForge no devolvió una sesión.');
  if (Platform.OS !== 'web') {
    const refreshToken = data.refreshToken || previousRefreshToken;
    if (!refreshToken) throw new Error('InsForge no devolvió el token de renovación móvil.');
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    // In mobile mode the SDK sets its HTTP token but does not populate its
    // in-memory user session. Seed the access token for getCurrentUser().
    insforge.setAccessToken(data.accessToken);
  }
  return data.user;
}

let mobileRestore: Promise<UserSchema | null> | null = null;

async function restoreMobileUser(): Promise<UserSchema | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  const { data, error } = await insforge.auth.refreshSession({ refreshToken });
  if (error || !data?.accessToken || !data.user) {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    insforge.setAccessToken(null);
    return null;
  }
  return acceptSession(data, refreshToken);
}

export async function restoreUser(): Promise<UserSchema | null> {
  if (Platform.OS !== 'web') {
    if (!mobileRestore) {
      mobileRestore = restoreMobileUser().finally(() => { mobileRestore = null; });
    }
    return mobileRestore;
  }
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error) return null;
  return data.user;
}

export async function refreshMobileSession(): Promise<UserSchema | null> {
  if (Platform.OS === 'web') return null;
  return restoreUser();
}

export async function currentUser(): Promise<UserSchema | null> {
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error) throw error;
  return data.user;
}

export async function saveProfile(profile: { name: string; area: string }): Promise<void> {
  const user = await currentUser();
  if (!user) throw new Error('Debes iniciar sesión para actualizar tu perfil.');
  const { error } = await insforge.auth.setProfile({
    ...user.profile,
    name: profile.name.trim(),
    area: profile.area.trim(),
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string): Promise<UserSchema> {
  const { data, error } = await insforge.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return acceptSession(data);
}

export async function signUpWithEmail(email: string, password: string, name?: string) {
  const { data, error } = await insforge.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    name: name?.trim(),
  });
  if (error) throw error;
  if (data?.accessToken && data.user) await acceptSession(data as SessionResult);
  return data;
}

export async function verifyEmail(email: string, otp: string): Promise<UserSchema> {
  const { data, error } = await insforge.auth.verifyEmail({ email: email.trim().toLowerCase(), otp: otp.trim() });
  if (error) throw error;
  return acceptSession(data);
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await insforge.auth.sendResetPasswordEmail({ email: email.trim().toLowerCase() });
  if (error) throw error;
}

export async function exchangePasswordResetCode(email: string, code: string): Promise<string> {
  const { data, error } = await insforge.auth.exchangeResetPasswordToken({
    email: email.trim().toLowerCase(),
    code: code.trim(),
  });
  if (error) throw error;
  if (!data?.token) throw new Error('InsForge no devolvió un token de recuperación.');
  return data.token;
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const { error } = await insforge.auth.resetPassword({ otp: token, newPassword });
  if (error) throw error;
}

export async function signInWithProvider(provider: 'google' | 'github'): Promise<UserSchema | null> {
  const redirectTo = Platform.OS === 'web'
    ? window.location.origin
    : NATIVE_REDIRECT;
  const { data, error } = await insforge.auth.signInWithOAuth(provider, {
    redirectTo,
    skipBrowserRedirect: Platform.OS !== 'web',
  });
  if (error) throw error;
  if (Platform.OS === 'web') return null; // SDK completes the callback after navigation.
  if (!data.url || !data.codeVerifier) throw new Error('No se pudo iniciar la autorización externa.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null;
  const callback = new URL(result.url);
  const oauthError = callback.searchParams.get('error');
  if (oauthError) throw new Error(callback.searchParams.get('error_description') || oauthError);
  const code = callback.searchParams.get('insforge_code');
  if (!code) throw new Error('No se recibió el código de autorización de InsForge.');
  const exchange = await insforge.auth.exchangeOAuthCode(code, data.codeVerifier);
  if (exchange.error) throw exchange.error;
  return acceptSession(exchange.data);
}

export async function signOut(): Promise<void> {
  const { error } = await insforge.auth.signOut();
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    insforge.setAccessToken(null);
  }
  if (error) throw error;
}
