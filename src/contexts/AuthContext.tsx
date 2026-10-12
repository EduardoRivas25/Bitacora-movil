import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import type { UserSchema } from '@insforge/sdk';
import { insforge } from '../lib/insforgeClient';
import * as auth from '../services/auth';
import type { AccountRequestType } from '../types';

interface AuthContextType {
  user: UserSchema | null;
  authMethod: auth.AuthMethod | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string | undefined, role: AccountRequestType) => Promise<{ requireEmailVerification: boolean }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInApple: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: { name: string; area: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSchema | null>(null);
  const [authMethod, setAuthMethod] = useState<auth.AuthMethod | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      try {
        const restored = await auth.restoreUser();
        if (mounted) {
          setUser(restored);
          setAuthMethod(auth.getAuthMethod(restored));
        }
      } catch (error) {
        console.warn('No se pudo recuperar la sesión de InsForge', error);
        if (mounted) {
          setUser(null);
          setAuthMethod(null);
        }
      } finally {
        if (mounted) setIsInitializing(false);
      }
    };
    void hydrate();

    const unsubscribe = insforge.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === 'signedOut') {
        setUser(null);
        setAuthMethod(null);
      } else if (Platform.OS === 'web') {
        void auth.currentUser().then((current) => {
          if (mounted) {
            setUser(current);
            setAuthMethod(auth.getAuthMethod(current));
          }
        }).catch((error) => {
          console.error('No se pudo actualizar la sesión de InsForge', error);
        });
      }
    });

    const appState = AppState.addEventListener('change', (state) => {
      if (Platform.OS !== 'web' && state === 'active') {
        void auth.refreshMobileSession().then((current) => {
          if (mounted) {
            setUser(current);
            setAuthMethod(auth.getAuthMethod(current));
          }
        }).catch(() => {});
      }
    });
    const refreshTimer = Platform.OS === 'web' ? null : setInterval(() => {
      void auth.refreshMobileSession().then((current) => {
        if (mounted) {
          setUser(current);
          setAuthMethod(auth.getAuthMethod(current));
        }
      }).catch(() => {});
    }, 5 * 60 * 1000);

    return () => {
      mounted = false;
      unsubscribe();
      appState.remove();
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const current = await auth.signInWithEmail(email, password);
      setUser(current);
      setAuthMethod(auth.getAuthMethod(current));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string | undefined, role: AccountRequestType) => {
    setIsLoading(true);
    try {
      const result = await auth.signUpWithEmail(email, password, name, role);
      if (result?.accessToken && result.user) {
        setUser(result.user);
        setAuthMethod('email');
      }
      return { requireEmailVerification: Boolean(result?.requireEmailVerification) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    setIsLoading(true);
    try {
      const current = await auth.verifyEmail(email, code);
      setUser(current);
      setAuthMethod(auth.getAuthMethod(current));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInProvider = useCallback(async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    try {
      const current = await auth.signInWithProvider(provider);
      if (current) {
        setUser(current);
        setAuthMethod(auth.getAuthMethod(current));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
    } finally {
      setUser(null);
      setAuthMethod(null);
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (profile: { name: string; area: string }) => {
    await auth.saveProfile(profile);
    setUser(current => current ? {
      ...current,
      profile: { ...current.profile, name: profile.name.trim(), area: profile.area.trim() },
    } : current);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      authMethod,
      isAuthenticated: user !== null,
      isInitializing,
      isLoading,
      signIn,
      signUp,
      verifyEmail,
      signInGoogle: () => signInProvider('google'),
      signInApple: () => signInProvider('apple'),
      signOut,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
}
