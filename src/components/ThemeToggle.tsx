import React, { useRef, useEffect } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
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
    <TouchableOpacity onPress={toggleTheme} style={{ marginLeft: 15 }}>
      <Animated.View style={{ transform: [{ rotate: spin }, { scale: scale }] }}>
        <Feather 
          name={isDark ? 'moon' : 'sun'} 
          size={24} 
          color={colors.text} 
        />
      </Animated.View>
    </TouchableOpacity>
  );
}