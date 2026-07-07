import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { colors } from '../theme/tokens';

type Props = {
  progress: number; // 0..1
  color: string;
  height?: number;
  trackColor?: string;
};

export function AnimatedProgressBar({ progress, color, height = 6, trackColor = colors.cardBorder }: Props) {
  const width = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const pct = Math.max(0, Math.min(1, progress)) * 100;

  useEffect(() => {
    width.value = reduceMotion ? pct : withTiming(pct, { duration: 500 });
  }, [pct]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color, borderRadius: height / 2 }, animStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', width: '100%' },
  fill: { height: '100%' },
});
