import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { getStreak } from '../../lib/streak';
import { usePlanCompletions } from '../../hooks/usePlanCompletions';
import { mondayOf } from '../../lib/dates';
import { PressableScale } from '../../components/PressableScale';
import { StaggerIn } from '../../components/StaggerIn';
import { AnimatedCheck } from '../../components/AnimatedCheck';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useStreakPulse } from '../../hooks/useStreakPulse';
import { BoltIcon } from '../../components/icons/BoltIcon';
import { PlayIcon } from '../../components/icons/PlayIcon';
import { ArrowRightIcon } from '../../components/icons/ArrowRightIcon';
import { StackIcon } from '../../components/icons/StackIcon';
import { ChevronRightIcon } from '../../components/icons/ChevronRightIcon';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type DueCourse = { courseId: string; courseName: string; dueCount: number };

const DAY_NAMES_FULL = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
const MONTH_NAMES_FULL = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
];

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { plans, loading: plansLoading, fetchRange, occurrencesOn, isDone, toggleDone } = usePlanCompletions(user?.id);

  const [dueCourses, setDueCourses] = useState<DueCourse[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [focusWorkMins, setFocusWorkMins] = useState(25);
  const [focusBreakMins, setFocusBreakMins] = useState(5);

  const today = new Date();
  const monday = mondayOf(today);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const fetchAll = useCallback(async () => {
    const now = new Date();
    const weekMonday = mondayOf(now);
    const weekSunday = new Date(weekMonday);
    weekSunday.setDate(weekMonday.getDate() + 6);

    const [
      { data: dueCards },
      { data: courses },
      streakDays,
      { data: focusSettings },
    ] = await Promise.all([
      supabase.from('flashcards')
        .select('id, course_id')
        .eq('user_id', user!.id)
        .lte('next_review_at', new Date().toISOString()),
      supabase.from('courses').select('id, name'),
      getStreak(user!.id),
      supabase.from('user_settings')
        .select('focus_work_minutes, focus_break_minutes')
        .eq('user_id', user!.id).maybeSingle(),
      fetchRange(weekMonday, weekSunday),
    ]);

    if (focusSettings) {
      setFocusWorkMins(focusSettings.focus_work_minutes);
      setFocusBreakMins(focusSettings.focus_break_minutes);
    }

    // Group due cards by course
    const courseMap = new Map<string, { name: string; count: number }>();
    for (const card of dueCards ?? []) {
      if (!courseMap.has(card.course_id)) {
        const c = (courses ?? []).find(x => x.id === card.course_id);
        courseMap.set(card.course_id, { name: c?.name ?? '–', count: 0 });
      }
      courseMap.get(card.course_id)!.count++;
    }
    setDueCourses(
      [...courseMap.entries()]
        .map(([id, v]) => ({ courseId: id, courseName: v.name, dueCount: v.count }))
        .sort((a, b) => b.dueCount - a.dueCount),
    );

    setStreak(streakDays);
    setLoading(false);
    setRefreshing(false);
  }, [user, fetchRange]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const todayPlans = occurrencesOn(today)
    .slice()
    .sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));

  const weeklyTotal = weekDates.reduce((sum, d) => sum + occurrencesOn(d).length, 0);
  const weeklyDone = weekDates.reduce(
    (sum, d) => sum + occurrencesOn(d).filter(p => isDone(p.id, d)).length,
    0,
  );

  const streakPulseStyle = useStreakPulse(streak);

  const navigateToFocus = () => {
    (navigation as any).navigate('Fokus');
  };

  const navigateToPlan = () => {
    (navigation as any).navigate('Planera');
  };

  const dateLabel = () => {
    const d = new Date();
    return `${DAY_NAMES_FULL[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTH_NAMES_FULL[d.getMonth()]}`.toUpperCase();
  };

  if (loading || plansLoading) {
    return <View style={s.center}><ActivityIndicator color={colors.ink} /></View>;
  }

  return (
    <ScreenContainer
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchAll(); }}
          tintColor={colors.ink}
          colors={[colors.ink]}
        />
      }
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.dateLbl}>{dateLabel()}</Text>
        <View style={s.headingRow}>
          <Text style={s.heading}>Idag</Text>
          {streak > 0 && (
            <Animated.View style={[s.streakBadge, streakPulseStyle]}>
              <BoltIcon size={13} color={colors.ink} />
              <Text style={s.streakTxt}>{streak} {streak === 1 ? 'dag' : 'dagar'}</Text>
            </Animated.View>
          )}
        </View>
      </View>

      {/* Weekly progress */}
      {weeklyTotal > 0 && (
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionLbl}>VECKANS PASS</Text>
            <Text style={s.weekFraction}>{weeklyDone}/{weeklyTotal}</Text>
          </View>
          <View style={s.segmentRow}>
            {Array.from({ length: weeklyTotal }, (_, i) => (
              <StaggerIn key={i} index={i} style={{ flex: 1 }}>
                <View style={[s.segment, i < weeklyDone && s.segmentFilled]} />
              </StaggerIn>
            ))}
          </View>
        </View>
      )}

      {/* Quick focus */}
      <PressableScale style={s.focusBtn} onPress={navigateToFocus}>
        <View style={s.focusRing}>
          <PlayIcon size={16} color={colors.highlight} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.focusCaption}>SNABBSTART</Text>
          <Text style={s.focusBtnTxt}>{focusWorkMins} min fokuspass</Text>
          <Text style={s.focusBtnSub}>Tryck för att starta timern</Text>
        </View>
        <View style={s.focusArrowBtn}>
          <ArrowRightIcon size={16} color={colors.ink} />
        </View>
      </PressableScale>

      {/* Due flashcards per course */}
      {dueCourses.length > 0 && (
        <View style={s.section}>
          {dueCourses.map(dc => (
            <PressableScale
              key={dc.courseId}
              style={s.dueCard}
              onPress={() => navigation.navigate('Review', { courseId: dc.courseId, courseName: dc.courseName })}
            >
              <View style={s.dueIconBox}>
                <StackIcon size={18} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.dueTitle}>{dc.dueCount} kort att repetera</Text>
                <Text style={s.dueSub}>{dc.courseName.toUpperCase()} · SM-2</Text>
              </View>
              <ChevronRightIcon size={18} color={colors.inkMuted} />
            </PressableScale>
          ))}
        </View>
      )}

      {/* Today's plans */}
      <View style={s.section}>
        <View style={s.sectionRow}>
          <Text style={s.sectionLbl}>DAGENS PASS</Text>
          <TouchableOpacity onPress={navigateToPlan}>
            <Text style={s.sectionLink}>+ Nytt pass</Text>
          </TouchableOpacity>
        </View>
        {todayPlans.length === 0 ? (
          <Text style={s.emptyTxt}>Inga pass inplanerade idag.</Text>
        ) : (
          todayPlans.map((plan, index) => {
            const done = isDone(plan.id, today);
            const courseName = plan.courses ? plan.courses.name : null;
            const courseColor = plan.courses?.color;
            return (
              <StaggerIn key={plan.id} index={index}>
                <View
                  style={[
                    s.planCard, done && s.planCardDone,
                    { borderLeftWidth: 4, borderLeftColor: courseColor ?? colors.cardBorder },
                  ]}
                >
                  <PressableScale onPress={() => toggleDone(plan.id, today)} style={s.doneBtn}>
                    <View style={[s.doneCircle, done && s.doneCircleFilled]}>
                      {done && <AnimatedCheck size={13} />}
                    </View>
                  </PressableScale>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.planTitle, done && s.planTitleDone]}>{plan.title}</Text>
                    <Text style={s.planMeta}>
                      {plan.time_of_day?.slice(0, 5)} · {plan.duration_minutes} min
                      {courseName ? <Text style={{ color: courseColor }}> · {courseName}</Text> : ''}
                    </Text>
                  </View>
                </View>
              </StaggerIn>
            );
          })
        )}
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.lg },
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },

  header: { paddingTop: spacing.xl, gap: spacing.xs },
  dateLbl: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.highlight,
    paddingVertical: 5, paddingHorizontal: spacing.sm, borderRadius: 20,
  },
  streakTxt: { fontFamily: fontFamily.monoMedium, fontSize: fontSize.xs, color: colors.ink },

  section: { gap: spacing.sm },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLbl: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },
  sectionLink: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.ink },

  weekFraction: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.ink },
  segmentRow: { flexDirection: 'row', gap: spacing.xs },
  segment: { height: 6, borderRadius: 3, backgroundColor: colors.cardBorder },
  segmentFilled: { backgroundColor: colors.ink },

  dueCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.cardBg, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.cardBorder,
    padding: spacing.md, gap: spacing.sm,
  },
  dueIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.paper,
    alignItems: 'center', justifyContent: 'center',
  },
  dueTitle: { fontFamily: fontFamily.serifRegular, fontSize: fontSize.lg, color: colors.ink },
  dueSub: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, marginTop: 2, letterSpacing: 0.5 },

  focusBtn: {
    flexDirection: 'row', backgroundColor: colors.ink, borderRadius: radius.card,
    padding: spacing.md, alignItems: 'center', gap: spacing.md,
  },
  focusRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: colors.highlight,
    alignItems: 'center', justifyContent: 'center',
  },
  focusCaption: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: 'rgba(247,245,240,0.6)', letterSpacing: 1.5 },
  focusBtnTxt: { fontFamily: fontFamily.serifRegular, fontSize: fontSize.lg, color: colors.paper, marginTop: 2 },
  focusBtnSub: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: 'rgba(247,245,240,0.7)', marginTop: 2 },
  focusArrowBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.paper,
    alignItems: 'center', justifyContent: 'center',
  },

  emptyTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted },

  planCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.card, padding: spacing.md, gap: spacing.sm,
  },
  planCardDone: { opacity: 0.65 },
  doneBtn: { padding: spacing.xs },
  doneCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: colors.inkMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  doneCircleFilled: { backgroundColor: colors.sage, borderColor: colors.sage },
  planTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },
  planTitleDone: { color: colors.inkMuted },
  planMeta: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, marginTop: 2 },
});
