import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing, cardRotation } from '../theme/tokens';
import { StaggerIn } from './StaggerIn';
import { PressableScale } from './PressableScale';
import { AnimatedProgressBar } from './AnimatedProgressBar';
import { BookIcon } from './icons/BookIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface Course {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  color: string;
}

interface Props {
  course: Course;
  index: number;
  onPress?: () => void;
  onLongPress?: () => void;
  docCount?: number;
  cardCount?: number;
  dueCount?: number;
  progress?: number | null; // fraction of cards not overdue, 0..1; null hides the bar
}

export function CourseCard({ course, index, onPress, onLongPress, docCount, cardCount, dueCount, progress }: Props) {
  const metaParts = [
    docCount != null ? `${docCount} DOKUMENT` : null,
    cardCount != null ? `${cardCount} KORT` : null,
    dueCount != null ? `${dueCount} ATT REPETERA` : null,
  ].filter(Boolean);

  return (
    <StaggerIn index={index} rotateDeg={cardRotation(index)}>
      <PressableScale onPress={onPress} onLongPress={onLongPress} disabled={!onPress} style={styles.card}>
        <View style={styles.topRow}>
          <View style={[styles.iconBadge, { backgroundColor: course.color }]}>
            <BookIcon size={22} color={colors.paper} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.name} numberOfLines={1}>{course.name}</Text>
            {metaParts.length > 0 && (
              <Text style={styles.meta} numberOfLines={2}>{metaParts.join(' · ')}</Text>
            )}
          </View>
          {onPress && <ChevronRightIcon size={18} color={colors.inkMuted} />}
        </View>
        {progress != null && (
          <AnimatedProgressBar progress={progress} color={course.color} />
        )}
      </PressableScale>
    </StaggerIn>
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
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  name: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  meta: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    letterSpacing: 0.3,
  },
});
