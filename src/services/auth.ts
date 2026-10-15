import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import type { UserSchema } from '@insforge/sdk';
import { assertInsForgeConfigured, insforge } from '../lib/insforgeClient';

const REFRESH_TOKEN_KEY = 'insforge_refresh_token';
const PENDING_OAUTH_PROVIDER_KEY = '@bitacora_pending_oauth_provider';
const NATIVE_REDIRECT = 'bitacoraredes://auth/callback';

export type AuthMethod = 'email' | 'google' | 'apple';
export type AccountRole = 'Administrador' | 'Técnico de red';

function getProfile(user: UserSchema): Record<string, unknown> {
  const profile: unknown = user.profile;
  return profile && typeof profile === 'object' && !Array.isArray(profile)
    ? profile as Record<string, unknown>
    : {};
}

export function getAccountRole(user: UserSchema | null): AccountRole | null {
  if (!user) return null;
  const role = getProfile(user).role;
  return role === 'Administrador' || role === 'Técnico de red' ? role : null;
}

export async function getTrustedAccountAccess(userId: string): Promise<{
  role: AccountRole | null;
  active: boolean;
  exists: boolean;
}> {
  const { data, error } = await insforge.database
    .from('app_user_roles')
    .select('role, active')
    .eq('user_id', userId)
    .limit(1);
  if (error) throw error;
  const record = data?.[0];
  const role = record?.role;
  return {
    role: role === 'Administrador' || role === 'Técnico de red' ? role : null,
    active: record?.active === true,
    exists: Boolean(record),
  };
}

export function getAuthMethod(user: UserSchema | null): AuthMethod | null {
  if (!user) return null;
  const method = getProfile(user).auth_method;
  return method === 'email' || method === 'google' || method === 'apple' ? method : null;
}

async function saveAccountMetadata(
  user: UserSchema,
  metadata: { authMethod?: AuthMethod },
): Promise<UserSchema> {
  const profile = {
    ...getProfile(user),
    ...(metadata.authMethod ? { auth_method: metadata.authMethod } : {}),
  };
  const { error } = await insforge.auth.setProfile(profile);
  if (error) throw error;
  return { ...user, profile };
}

async function completePendingBrowserOAuth(user: UserSchema): Promise<UserSchema> {
  if (Platform.OS !== 'web') return user;
  const pendingMethod = await AsyncStorage.getItem(PENDING_OAUTH_PROVIDER_KEY);
  if (pendingMethod !== 'google' && pendingMethod !== 'apple') return user;
  const updated = await saveAccountMetadata(user, { authMethod: pendingMethod });
  await AsyncStorage.removeItem(PENDING_OAUTH_PROVIDER_KEY);
  return updated;
}

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
  return data.user ? completePendingBrowserOAuth(data.user) : null;
}

export async function refreshMobileSession(): Promise<UserSchema | null> {
  if (Platform.OS === 'web') return null;
  return restoreUser();
}

export async function currentUser(): Promise<UserSchema | null> {
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error) throw error;
  return data.user ? completePendingBrowserOAuth(data.user) : null;
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
  await AsyncStorage.removeItem(PENDING_OAUTH_PROVIDER_KEY);
  const { data, error } = await insforge.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return saveAccountMetadata(await acceptSession(data), { authMethod: 'email' });
}

export async function signUpWithEmail(email: string, password: string, name: string | undefined) {
  const normalizedEmail = email.trim().toLowerCase();
  await AsyncStorage.removeItem(PENDING_OAUTH_PROVIDER_KEY);
  const { data, error } = await insforge.auth.signUp({
    email: normalizedEmail,
    password,
    name: name?.trim(),
  });
  if (error) throw error;
  if (data?.accessToken && data.user) {
    const user = await acceptSession(data as SessionResult);
    const updatedUser = await saveAccountMetadata(user, { authMethod: 'email' });
    return { ...data, user: updatedUser };
  }
  return data;
}

export async function verifyEmail(email: string, otp: string): Promise<UserSchema> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await insforge.auth.verifyEmail({ email: normalizedEmail, otp: otp.trim() });
  if (error) throw error;
  const user = await acceptSession(data);
  return saveAccountMetadata(user, { authMethod: 'email' });
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

export async function signInWithProvider(provider: 'google' | 'apple'): Promise<UserSchema | null> {
  assertInsForgeConfigured();
  const redirectTo = Platform.OS === 'web'
    ? window.location.origin
    : NATIVE_REDIRECT;
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(PENDING_OAUTH_PROVIDER_KEY, provider);
  }
  const { data, error } = await insforge.auth.signInWithOAuth(provider, {
    redirectTo,
    skipBrowserRedirect: Platform.OS !== 'web',
  });
  if (error) {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(PENDING_OAUTH_PROVIDER_KEY);
    throw error;
  }
  if (Platform.OS === 'web') return null;
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
  return saveAccountMetadata(await acceptSession(exchange.data), { authMethod: provider });
}

export async function signOut(): Promise<void> {
  const { error } = await insforge.auth.signOut();
  await AsyncStorage.removeItem(PENDING_OAUTH_PROVIDER_KEY);
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    insforge.setAccessToken(null);
  }
  if (error) throw error;
}
