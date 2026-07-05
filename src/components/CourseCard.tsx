import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  useReducedMotion,
} from 'react-native-reanimated';
import { colors, fontFamily, fontSize, radius, spacing, cardRotation } from '../theme/tokens';

interface Course {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Props {
  course: Course;
  index: number;
}

export function CourseCard({ course, index }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const delay = reduceMotion ? 0 : index * 50;
    opacity.value = withDelay(delay, withTiming(1, { duration: 280 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 280 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { rotate: `${cardRotation(index)}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <Text style={styles.name}>{course.name}</Text>
      {course.description ? (
        <Text style={styles.description}>{course.description}</Text>
      ) : null}
      <Text style={styles.date}>
        {new Date(course.created_at).toLocaleDateString('sv-SE', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.xs,
  },
  name: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  description: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  date: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
});
