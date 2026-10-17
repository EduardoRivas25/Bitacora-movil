import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

type ShapeGridBackgroundProps = {
  lineColor?: string;
  cellSize?: number;
};

/** Animated square grid rendered with native Views, so it works without extra packages. */
export default function ShapeGridBackground({
  lineColor = 'rgba(10, 132, 255, 0.22)',
  cellSize = 42,
}: ShapeGridBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const phase = useRef(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;

    const timer = setInterval(() => {
      phase.current = (phase.current + 0.35) % cellSize;
      setOffset(phase.current);
    }, 40);
    return () => clearInterval(timer);
  }, [cellSize]);

  const columns = Math.ceil(width / cellSize) + 2;
  const rows = Math.ceil(height / cellSize) + 2;
  return (
    <View pointerEvents="none" style={styles.container}>
      {Array.from({ length: columns }, (_, column) => (
        <View
          key={`v-${column}`}
          style={[styles.verticalLine, { left: column * cellSize - offset, backgroundColor: lineColor }]}
        />
      ))}
      {Array.from({ length: rows }, (_, row) => (
        <View
          key={`h-${row}`}
          style={[styles.horizontalLine, { top: row * cellSize - offset, backgroundColor: lineColor }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  verticalLine: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  horizontalLine: { position: 'absolute', left: 0, right: 0, height: 1 },
});
