import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

interface OnboardingContextType {
  /** true while AsyncStorage is loading the flag */
  isCheckingOnboarding: boolean;
  /** true when the overlay should be shown */
  showOnboarding: boolean;
  /** Mark onboarding as completed for the current user */
  completeOnboarding: () => Promise<void>;
  /** Force-show the onboarding again (e.g. from settings) */
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_KEY_PREFIX = '@onboarding_done_';

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const storageKey = user?.id ? `${ONBOARDING_KEY_PREFIX}${user.id}` : null;

  useEffect(() => {
    if (!isAuthenticated || !storageKey) {
      setShowOnboarding(false);
      setIsCheckingOnboarding(false);
      return;
    }

    let mounted = true;
    setIsCheckingOnboarding(true);

    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (mounted) {
          // Show onboarding only if user has NOT completed it
          setShowOnboarding(value !== 'true');
        }
      })
      .catch(() => {
        // On error, show onboarding to be safe
        if (mounted) setShowOnboarding(true);
      })
      .finally(() => {
        if (mounted) setIsCheckingOnboarding(false);
      });

    return () => { mounted = false; };
  }, [isAuthenticated, storageKey]);

  const completeOnboarding = useCallback(async () => {
    setShowOnboarding(false);
    if (storageKey) {
      await AsyncStorage.setItem(storageKey, 'true').catch(() => {});
    }
  }, [storageKey]);

  const resetOnboarding = useCallback(async () => {
    if (storageKey) {
      await AsyncStorage.removeItem(storageKey).catch(() => {});
    }
    setShowOnboarding(true);
  }, [storageKey]);

  return (
    <OnboardingContext.Provider value={{
      isCheckingOnboarding,
      showOnboarding,
      completeOnboarding,
      resetOnboarding,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding debe ser usado dentro de un OnboardingProvider');
  return context;
}
