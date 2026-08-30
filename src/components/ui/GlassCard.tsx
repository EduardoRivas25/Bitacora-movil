import React from 'react';
import { StyleSheet, ViewStyle, StyleProp, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';

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
  intensity = 30,
  onPress,
  activeOpacity = 0.8,
}: GlassCardProps) {
  if (onPress) {
    return (
      <TouchableOpacity 
        activeOpacity={activeOpacity} 
        onPress={onPress}
        style={[styles.container, style]}
      >
        <BlurView intensity={intensity} tint="dark" style={styles.blur}>
          {children}
        </BlurView>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={intensity} tint="dark" style={styles.blur}>
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  blur: {
    padding: 20,
    width: '100%',
    height: '100%',
  },
});
