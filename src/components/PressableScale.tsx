import React from 'react';
import { Pressable, type PressableProps, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

// Drop-in Pressable replacement that scales down to 0.97 while pressed,
// for the "every tap gives a little" feel. Skips the animation entirely
// under reduce-motion.
export function PressableScale({ style, onPressIn, onPressOut, children, ...rest }: Props) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[style, animStyle]}
      onPressIn={(e) => {
        if (!reduceMotion) scale.value = withTiming(0.97, { duration: 100 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduceMotion) scale.value = withTiming(1, { duration: 100 });
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
