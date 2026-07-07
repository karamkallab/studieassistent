import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing, cardRotation } from '../theme/tokens';
import { StaggerIn } from './StaggerIn';
import { PressableScale } from './PressableScale';
import { AnimatedProgressBar } from './AnimatedProgressBar';
import { BookIcon } from './icons/BookIcon';

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
  onDelete?: () => void;
  progress?: number | null; // fraction of cards not overdue, 0..1; null hides the bar
}

export function CourseCard({ course, index, onPress, onLongPress, onDelete, progress }: Props) {
  return (
    <StaggerIn index={index} rotateDeg={cardRotation(index)}>
      <PressableScale onPress={onPress} onLongPress={onLongPress} disabled={!onPress} style={styles.card}>
        <View style={styles.topRow}>
          <View style={[styles.iconBadge, { backgroundColor: course.color }]}>
            <BookIcon size={18} color={colors.paper} />
          </View>
          <Text style={styles.name} numberOfLines={1}>{course.name}</Text>
          {onDelete && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onDelete(); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {course.description ? (
          <Text style={styles.description}>{course.description}</Text>
        ) : null}
        {progress != null && (
          <AnimatedProgressBar progress={progress} color={course.color} />
        )}
        <Text style={styles.date}>
          {new Date(course.created_at).toLocaleDateString('sv-SE', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
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
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  name: {
    flex: 1,
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  deleteBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  deleteTxt: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.rust,
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
