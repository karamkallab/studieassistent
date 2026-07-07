import React, { useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_PATH = 'M4 12 L9 17 L20 6';
const APPROX_LENGTH = 23;

type Props = { size?: number; color?: string; strokeWidth?: number };

// Checkmark that draws itself in (stroke-dashoffset animation) rather than
// popping in instantly — used wherever a plan/task gets marked done.
export function AnimatedCheck({ size = 12, color = '#fff', strokeWidth = 3 }: Props) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    progress.value = reduceMotion ? 1 : withTiming(1, { duration: 220 });
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: APPROX_LENGTH * (1 - progress.value),
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <AnimatedPath
        d={CHECK_PATH}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={`${APPROX_LENGTH} ${APPROX_LENGTH}`}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
