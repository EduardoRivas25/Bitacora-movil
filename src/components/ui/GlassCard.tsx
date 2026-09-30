import React from 'react';
import { StyleSheet, ViewStyle, StyleProp, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  onPress?: () => void;
  activeOpacity?: number;
}

export default function GlassCard({
  children,
  style,
  intensity,
  onPress,
  activeOpacity = 0.8,
}: GlassCardProps) {
  const { colors, isDark } = useTheme();
  const blurIntensity = intensity !== undefined ? intensity : colors.blurIntensity;

  const containerStyle = [
    styles.container,
    {
      borderColor: colors.cardBorder,
      backgroundColor: colors.cardBg,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity 
        activeOpacity={activeOpacity} 
        onPress={onPress}
        style={containerStyle}
      >
        <BlurView intensity={blurIntensity} tint={colors.blurTint} style={styles.blur}>
          {children}
        </BlurView>
      </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyle}>
      <BlurView intensity={blurIntensity} tint={colors.blurTint} style={styles.blur}>
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  blur: {
    padding: 20,
    width: '100%',
    height: '100%',
  },
});
