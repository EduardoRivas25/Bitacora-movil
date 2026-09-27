import React, { createContext, useState, useContext } from 'react';
import { useColorScheme } from 'react-native';

type Theme = 'light' | 'dark';

interface ThemeContextData {
  theme: Theme;
  toggleTheme: () => void;
  colors: {
    background: string;
    text: string;
    card: string;
  };
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Eliminamos la dependencia de useColorScheme() al inicio y forzamos 'light'
  const [theme, setTheme] = useState<Theme>('light');

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const colors = {
    background: theme === 'dark' ? '#121212' : '#F5F5F5',
    text: theme === 'dark' ? '#FFFFFF' : '#000000',
    card: theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);