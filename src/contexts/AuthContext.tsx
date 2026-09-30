import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import type { UserSchema } from '@insforge/sdk';
import { insforge } from '../lib/insforgeClient';
import * as auth from '../services/auth';

interface AuthContextType {
  user: UserSchema | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<{ requireEmailVerification: boolean }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      try {
        const restored = await auth.restoreUser();
        if (mounted) setUser(restored);
      } catch (error) {
        console.warn('No se pudo recuperar la sesión de InsForge', error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void hydrate();

    const unsubscribe = insforge.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === 'signedOut') {
        setUser(null);
      } else if (Platform.OS === 'web') {
        void auth.currentUser().then((current) => {
          if (mounted) setUser(current);
        }).catch(() => {});
      }
    });

    const appState = AppState.addEventListener('change', (state) => {
      if (Platform.OS !== 'web' && state === 'active') {
        void auth.refreshMobileSession().then((current) => {
          if (mounted) setUser(current);
        }).catch(() => {});
      }
    });
    const refreshTimer = Platform.OS === 'web' ? null : setInterval(() => {
      void auth.refreshMobileSession().then((current) => {
        if (mounted) setUser(current);
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
      setUser(await auth.signInWithEmail(email, password));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    try {
      const result = await auth.signUpWithEmail(email, password, name);
      if (result?.accessToken && result.user) setUser(result.user);
      return { requireEmailVerification: Boolean(result?.requireEmailVerification) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    setIsLoading(true);
    try {
      setUser(await auth.verifyEmail(email, code));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInProvider = useCallback(async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      const current = await auth.signInWithProvider(provider);
      if (current) setUser(current);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: user !== null,
      isLoading,
      signIn,
      signUp,
      verifyEmail,
      signInGoogle: () => signInProvider('google'),
      signInGitHub: () => signInProvider('github'),
      signOut,
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
