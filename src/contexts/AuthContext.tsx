import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import type { UserSchema } from '@insforge/sdk';
import { insforge } from '../lib/insforgeClient';
import * as auth from '../services/auth';

interface AuthContextType {
  user: UserSchema | null;
  authMethod: auth.AuthMethod | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  authorizationError: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string | undefined) => Promise<{ requireEmailVerification: boolean }>;
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
  const [authorizationError, setAuthorizationError] = useState('');
  const authorizationRequestId = useRef(0);

  const applyTrustedRole = useCallback(async (current: UserSchema | null): Promise<boolean> => {
    const requestId = ++authorizationRequestId.current;
    if (!current) {
      setUser(null);
      setAuthorizationError('');
      return false;
    }
    try {
      const access = await auth.getTrustedAccountAccess(current.id);
      if (requestId !== authorizationRequestId.current) return false;
      if (!access.exists || !access.active || !access.role) {
        setUser(null);
        setAuthorizationError(!access.exists
          ? 'Tu cuenta todavía no tiene un rol asignado. Contacta a un administrador para solicitar acceso.'
          : !access.active
            ? 'Tu cuenta está desactivada. Contacta a un administrador para recuperar el acceso.'
            : 'Tu cuenta no tiene un rol válido asignado. Contacta a un administrador.');
        return false;
      }
      setUser({ ...current, profile: { ...current.profile, role: access.role } });
      setAuthorizationError('');
      return true;
    } catch (error) {
      if (requestId !== authorizationRequestId.current) return false;
      console.error('No se pudo verificar el rol protegido en InsForge', error);
      setUser(null);
      setAuthorizationError('No se pudo verificar tu acceso en InsForge. Vuelve a intentarlo más tarde.');
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      try {
        const restored = await auth.restoreUser();
        if (mounted) {
          const allowed = await applyTrustedRole(restored);
          setAuthMethod(allowed ? auth.getAuthMethod(restored) : null);
        }
      } catch (error) {
        console.warn('No se pudo recuperar la sesión de InsForge', error);
        if (mounted) {
          void applyTrustedRole(null);
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
        void applyTrustedRole(null);
        setAuthMethod(null);
      } else if (Platform.OS === 'web') {
        void auth.currentUser().then((current) => {
          if (mounted) {
            void applyTrustedRole(current).then(allowed => {
              if (mounted) setAuthMethod(allowed ? auth.getAuthMethod(current) : null);
            });
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
            void applyTrustedRole(current).then(allowed => {
              if (mounted) setAuthMethod(allowed ? auth.getAuthMethod(current) : null);
            });
          }
        }).catch(() => {});
      }
    });
    const refreshTimer = Platform.OS === 'web' ? null : setInterval(() => {
      void auth.refreshMobileSession().then((current) => {
        if (mounted) {
          void applyTrustedRole(current).then(allowed => {
            if (mounted) setAuthMethod(allowed ? auth.getAuthMethod(current) : null);
          });
        }
      }).catch(() => {});
    }, 5 * 60 * 1000);

    return () => {
      mounted = false;
      authorizationRequestId.current += 1;
      unsubscribe();
      appState.remove();
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [applyTrustedRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const current = await auth.signInWithEmail(email, password);
      const allowed = await applyTrustedRole(current);
      if (!allowed) throw new Error('No tienes acceso activo a Bitácora Digital.');
      setAuthMethod(auth.getAuthMethod(current));
    } finally {
      setIsLoading(false);
    }
  }, [applyTrustedRole]);

  const signUp = useCallback(async (email: string, password: string, name: string | undefined) => {
    setIsLoading(true);
    try {
      const result = await auth.signUpWithEmail(email, password, name);
      if (result?.accessToken && result.user) {
        const allowed = await applyTrustedRole(result.user);
        if (!allowed) throw new Error('Tu cuenta fue creada, pero todavía requiere que un administrador habilite tu acceso.');
        setAuthMethod('email');
      }
      return { requireEmailVerification: Boolean(result?.requireEmailVerification) };
    } finally {
      setIsLoading(false);
    }
  }, [applyTrustedRole]);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    setIsLoading(true);
    try {
      const current = await auth.verifyEmail(email, code);
      const allowed = await applyTrustedRole(current);
      if (!allowed) throw new Error('Tu cuenta requiere que un administrador habilite tu acceso.');
      setAuthMethod(auth.getAuthMethod(current));
    } finally {
      setIsLoading(false);
    }
  }, [applyTrustedRole]);

  const signInProvider = useCallback(async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    try {
      const current = await auth.signInWithProvider(provider);
      if (current) {
        const allowed = await applyTrustedRole(current);
        if (!allowed) throw new Error('No tienes acceso activo a Bitácora Digital.');
        setAuthMethod(auth.getAuthMethod(current));
      }
    } finally {
      setIsLoading(false);
    }
  }, [applyTrustedRole]);

  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
    } finally {
      await applyTrustedRole(null);
      setAuthMethod(null);
      setIsLoading(false);
    }
  }, [applyTrustedRole]);

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
      authorizationError,
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
