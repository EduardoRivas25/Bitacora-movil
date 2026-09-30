import React, { useRef, useEffect } from 'react';
import { Animated, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  style?: StyleProp<ViewStyle>;
  size?: number;
}

export default function ThemeToggle({ style, size = 20 }: ThemeToggleProps) {
  const { theme, toggleTheme, colors } = useTheme();
  const isDark = theme === 'dark';
  const animValue = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: isDark ? 1 : 0,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [isDark, animValue]);

  const spin = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '0deg'],
  });
  
  const scale = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 1],
  });

  return (
    <TouchableOpacity 
      onPress={toggleTheme} 
      style={style || { marginLeft: 15 }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
    >
      <Animated.View style={{ transform: [{ rotate: spin }, { scale: scale }] }}>
        <Feather 
          name={isDark ? 'moon' : 'sun'} 
          size={size} 
          color={isDark ? '#FFD60A' : colors.text} 
        />
      </Animated.View>
    </TouchableOpacity>
  );
}