import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  text: string;
  card: string;
  gradient: [string, string];
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
  buttonBg: string;
  buttonText: string;
  searchBg: string;
  searchBorder: string;
  chipBg: string;
  chipBorder: string;
  chipActiveBg: string;
  chipActiveText: string;
  blurTint: 'dark' | 'light';
  blurIntensity: number;
  modalBg: string;
  modalOverlay: string;
  divider: string;
}

const darkColors: ThemeColors = {
  background: '#050505',
  text: '#FFFFFF',
  card: '#121212',
  gradient: ['#050505', '#121212'],
  cardBg: 'rgba(0, 0, 0, 0.5)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
  textTertiary: 'rgba(255, 255, 255, 0.45)',
  inputBg: 'rgba(255, 255, 255, 0.05)',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  placeholder: 'rgba(255, 255, 255, 0.35)',
  buttonBg: '#FFFFFF',
  buttonText: '#000000',
  searchBg: 'rgba(255, 255, 255, 0.05)',
  searchBorder: 'rgba(255, 255, 255, 0.08)',
  chipBg: 'rgba(255, 255, 255, 0.05)',
  chipBorder: 'rgba(255, 255, 255, 0.08)',
  chipActiveBg: '#FFFFFF',
  chipActiveText: '#000000',
  blurTint: 'dark',
  blurIntensity: 30,
  modalBg: 'rgba(18, 18, 22, 0.96)',
  modalOverlay: 'rgba(0, 0, 0, 0.78)',
  divider: 'rgba(255, 255, 255, 0.08)',
};

const lightColors: ThemeColors = {
  background: '#EDF2F7',
  text: '#0F172A',
  card: '#FFFFFF',
  gradient: ['#F1F5F9', '#E2E8F0'],
  cardBg: '#FFFFFF',
  cardBorder: '#CBD5E1',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  placeholder: '#94A3B8',
  buttonBg: '#0F172A',
  buttonText: '#FFFFFF',
  searchBg: '#FFFFFF',
  searchBorder: '#CBD5E1',
  chipBg: '#F1F5F9',
  chipBorder: '#CBD5E1',
  chipActiveBg: '#0F172A',
  chipActiveText: '#FFFFFF',
  blurTint: 'light',
  blurIntensity: 60,
  modalBg: '#FFFFFF',
  modalOverlay: 'rgba(15, 23, 42, 0.45)',
  divider: '#E2E8F0',
};

export interface ThemeContextData {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const THEME_STORAGE_KEY = '@app_theme';

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

const transitionStyles = `
  .theme-view-transition::view-transition-image-pair(root) { isolation: auto; }
  .theme-view-transition::view-transition-old(root),
  .theme-view-transition::view-transition-new(root) {
    animation: none;
    mix-blend-mode: normal;
  }
  .theme-view-transition::view-transition-new(root) {
    clip-path: circle(0 at 50% 50%);
    animation: theme-circle-reveal 1s ease-in-out both;
  }
  @keyframes theme-circle-reveal {
    to { clip-path: circle(150vmax at 50% 50%); }
  }
`;

function prepareWebTransition() {
  if (document.getElementById('theme-transition-styles')) return;
  const style = document.createElement('style');
  style.id = 'theme-transition-styles';
  style.textContent = transitionStyles;
  document.head.appendChild(style);
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Modo oscuro por defecto
  const [theme, setTheme] = useState<Theme>('dark');
  const transitionInProgress = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') {
          setTheme(saved);
        }
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    if (transitionInProgress.current) return;
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    const applyTheme = () => {
      setTheme(nextTheme);
      AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme).catch(() => {});
    };

    if (Platform.OS !== 'web' || !document.startViewTransition ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      applyTheme();
      return;
    }

    prepareWebTransition();
    transitionInProgress.current = true;
    document.documentElement.classList.add('theme-view-transition');
    const transition = document.startViewTransition(() => {
      flushSync(applyTheme);
    });
    const finish = () => {
      document.documentElement.classList.remove('theme-view-transition');
      transitionInProgress.current = false;
    };
    transition.finished.then(finish, finish);
  };

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
