import React, { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

type Props = {
  index: number;
  style?: ViewStyle | ViewStyle[];
  rotateDeg?: number;
  children: React.ReactNode;
};

// Fade + slide-up entrance, staggered by 50ms per index. Used for list/grid
// items (course cards, plan cards) so they arrive one after another instead
// of popping in all at once.
export function StaggerIn({ index, style, rotateDeg = 0, children }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const delay = reduceMotion ? 0 : index * 50;
    const duration = reduceMotion ? 0 : 280;
    opacity.value = withDelay(delay, withTiming(1, { duration }));
    translateY.value = withDelay(delay, withTiming(0, { duration }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotateDeg}deg` },
    ],
  }));

  return (
    <Animated.View style={[style, animStyle]}>
      {children}
    </Animated.View>
  );
}
