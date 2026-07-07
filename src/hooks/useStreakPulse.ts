import { useEffect, useRef } from 'react';
import { useSharedValue, useAnimatedStyle, withSequence, withTiming, useReducedMotion } from 'react-native-reanimated';

// Pulses a shared scale value once, the moment `streak` increases from its
// previous value — not on every render, not on decrease, just the one
// celebratory beat when the streak actually goes up.
export function useStreakPulse(streak: number) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const prevRef = useRef(streak);

  useEffect(() => {
    if (streak > prevRef.current && !reduceMotion) {
      scale.value = withSequence(
        withTiming(1.18, { duration: 150 }),
        withTiming(1, { duration: 150 }),
      );
    }
    prevRef.current = streak;
  }, [streak]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}
