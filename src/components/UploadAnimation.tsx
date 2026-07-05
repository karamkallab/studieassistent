import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { colors, fontFamily, fontSize, spacing } from '../theme/tokens';

export type UploadPhase = 'uploading' | 'reading' | 'summarizing';

const PHASE_LABEL: Record<UploadPhase, string> = {
  uploading: 'Laddar upp...',
  reading: 'Läser dokumentet...',
  summarizing: 'Skapar sammanfattning...',
};

const DOC_W = 100;
const DOC_H = 130;
const SWEEP_W = 36;

interface Props {
  phase: UploadPhase;
}

export function UploadAnimation({ phase }: Props) {
  const sweepX = useSharedValue(-(SWEEP_W + 4));
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      sweepX.value = DOC_W / 2 - SWEEP_W / 2;
      return;
    }
    sweepX.value = withRepeat(
      withSequence(
        withTiming(DOC_W + 4, { duration: 950, easing: Easing.inOut(Easing.quad) }),
        withTiming(-(SWEEP_W + 4), { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweepX.value }],
  }));

  return (
    <View style={styles.wrapper}>
      {/* Document */}
      <View style={styles.doc}>
        {/* Corner fold */}
        <View style={styles.fold} />
        {/* Text lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[styles.line, i === 0 && styles.lineShort]}
          />
        ))}
        {/* Sweeping highlight */}
        <Animated.View
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
            styles.sweep,
            sweepStyle,
          ]}
        />
      </View>

      {/* Status text */}
      <Text style={styles.status}>{PHASE_LABEL[phase]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  doc: {
    width: DOC_W,
    height: DOC_H,
    backgroundColor: colors.cardBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    padding: 14,
    gap: 8,
  },
  fold: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    backgroundColor: colors.paper,
    borderBottomLeftRadius: 4,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
  },
  line: {
    height: 7,
    backgroundColor: colors.cardBorder,
    borderRadius: 3,
  },
  lineShort: {
    width: '60%',
  },
  sweep: {
    width: SWEEP_W,
    backgroundColor: colors.highlight,
    opacity: 0.65,
  },
  status: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    letterSpacing: 0.2,
  },
});
