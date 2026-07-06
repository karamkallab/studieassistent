import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { HighlighterText } from '../../components/HighlighterText';
import { getStreak } from '../../lib/streak';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type StudyPlan = {
  id: string;
  title: string;
  time_of_day: string;
  duration_minutes: number;
  course_id: string | null;
  weekdays: number[];
  specific_date: string | null;
  recurring: boolean;
  courses: { name: string } | null;
};
type DueCourse = { courseId: string; courseName: string; dueCount: number };

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const DAY_NAMES = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function dbDay() { return (new Date().getDay() + 6) % 7; } // 0=Mon..6=Sun

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [todayPlans, setTodayPlans] = useState<StudyPlan[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [dueCourses, setDueCourses] = useState<DueCourse[]>([]);
  const [streak, setStreak] = useState(0);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [weeklyDone, setWeeklyDone] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    const today = todayStr();
    const day = dbDay();

    const [
      { data: allPlans },
      { data: comps },
      { data: dueCards },
      { data: courses },
      streakDays,
    ] = await Promise.all([
      supabase.from('study_plans')
        .select('id, title, time_of_day, duration_minutes, course_id, weekdays, specific_date, recurring, courses(name)')
        .eq('user_id', user!.id),
      supabase.from('study_plan_completions')
        .select('plan_id').eq('completed_on', today),
      supabase.from('flashcards')
        .select('id, course_id')
        .eq('user_id', user!.id)
        .lte('next_review_at', new Date().toISOString()),
      supabase.from('courses').select('id, name'),
      getStreak(user!.id),
    ]);

    // Filter plans for today
    const plans = (allPlans ?? []).filter(p => {
      if (p.specific_date === today) return true;
      if (p.recurring && Array.isArray(p.weekdays) && p.weekdays.includes(day)) return true;
      return false;
    }) as unknown as StudyPlan[];
    plans.sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
    setTodayPlans(plans);
    setCompletions(new Set((comps ?? []).map(c => c.plan_id)));

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

    // Weekly progress
    const monday = new Date();
    monday.setDate(monday.getDate() - day);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday.getTime() + 7 * 86400000 - 1);

    let total = 0;
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(monday.getTime() + d * 86400000);
      const dayStr = dayDate.toISOString().split('T')[0];
      for (const plan of allPlans ?? []) {
        if (plan.specific_date === dayStr) { total++; continue; }
        if (plan.recurring && Array.isArray(plan.weekdays) && plan.weekdays.includes(d)) total++;
      }
    }
    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];
    const { data: weekComps } = await supabase
      .from('study_plan_completions')
      .select('plan_id')
      .gte('completed_on', mondayStr)
      .lte('completed_on', sundayStr);

    setWeeklyTotal(total);
    setWeeklyDone((weekComps ?? []).length);
    setStreak(streakDays);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const handleToggleDone = async (planId: string) => {
    const today = todayStr();
    const isDone = completions.has(planId);
    if (isDone) {
      await supabase.from('study_plan_completions')
        .delete().eq('plan_id', planId).eq('completed_on', today);
      setCompletions(prev => { const s = new Set(prev); s.delete(planId); return s; });
      setWeeklyDone(w => Math.max(0, w - 1));
    } else {
      await supabase.from('study_plan_completions')
        .insert({ plan_id: planId, completed_on: today });
      setCompletions(prev => new Set([...prev, planId]));
      setWeeklyDone(w => w + 1);
    }
  };

  const navigateToFocus = () => {
    // Navigate to the Fokus tab via parent tab navigator
    (navigation as any).getParent?.()?.navigate('Fokus');
  };

  const navigateToPlan = () => {
    (navigation as any).getParent?.()?.navigate('Planera');
  };

  const dateLabel = () => {
    const d = new Date();
    return `${DAY_NAMES[dbDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.ink} /></View>;
  }

  return (
    <ScrollView
      style={s.container}
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
        <HighlighterText textStyle={s.heading}>Idag</HighlighterText>
        <Text style={s.dateLbl}>{dateLabel()}</Text>
        {streak > 0 && (
          <View style={s.streakBadge}>
            <Text style={s.streakTxt}>{streak} {streak === 1 ? 'dag' : 'dagar'} i rad</Text>
          </View>
        )}
      </View>

      {/* Due flashcards per course */}
      {dueCourses.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLbl}>ATT REPETERA</Text>
          {dueCourses.map(dc => (
            <TouchableOpacity
              key={dc.courseId}
              style={s.dueCard}
              onPress={() => navigation.navigate('Review', { courseId: dc.courseId, courseName: dc.courseName })}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.dueCourseName}>{dc.courseName}</Text>
                <Text style={s.dueCnt}>{dc.dueCount} kort att repetera</Text>
              </View>
              <Text style={s.dueArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick focus */}
      <TouchableOpacity style={s.focusBtn} onPress={navigateToFocus} activeOpacity={0.85}>
        <Text style={s.focusBtnTxt}>◎  Starta fokustimer</Text>
        <Text style={s.focusBtnSub}>25 min fokus · 5 min paus</Text>
      </TouchableOpacity>

      {/* Today's plans */}
      <View style={s.section}>
        <View style={s.sectionRow}>
          <Text style={s.sectionLbl}>STUDIEPASS IDAG</Text>
          <TouchableOpacity onPress={navigateToPlan}>
            <Text style={s.sectionLink}>+ Nytt pass</Text>
          </TouchableOpacity>
        </View>
        {todayPlans.length === 0 ? (
          <Text style={s.emptyTxt}>Inga pass inplanerade idag.</Text>
        ) : (
          todayPlans.map(plan => {
            const done = completions.has(plan.id);
            const courseName = plan.courses
              ? (plan.courses as any).name ?? (plan.courses as { name: string }).name
              : null;
            return (
              <View key={plan.id} style={[s.planCard, done && s.planCardDone]}>
                <TouchableOpacity onPress={() => handleToggleDone(plan.id)} style={s.doneBtn}>
                  <View style={[s.doneCircle, done && s.doneCircleFilled]}>
                    {done && <Text style={s.doneCheck}>✓</Text>}
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={[s.planTitle, done && s.planTitleDone]}>{plan.title}</Text>
                  <Text style={s.planMeta}>
                    {plan.time_of_day?.slice(0, 5)} · {plan.duration_minutes} min
                    {courseName ? ` · ${courseName}` : ''}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Weekly progress */}
      {weeklyTotal > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLbl}>VECKANS PASS</Text>
          <Text style={s.weeklyNum}>{weeklyDone} av {weeklyTotal} klara</Text>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${Math.min(100, Math.round((weeklyDone / weeklyTotal) * 100))}%` as any }]} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.lg },
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },

  header: { paddingTop: spacing.xl, gap: spacing.xs },
  heading: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },
  dateLbl: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.inkMuted },
  streakBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.highlight,
    paddingVertical: 3, paddingHorizontal: spacing.sm, borderRadius: 20, marginTop: spacing.xs,
  },
  streakTxt: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.ink },

  section: { gap: spacing.sm },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLbl: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },
  sectionLink: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.ink },

  dueCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.ink, borderRadius: radius.card,
    padding: spacing.md, gap: spacing.sm,
  },
  dueCourseName: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.paper },
  dueCnt: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.highlight, marginTop: 2 },
  dueArrow: { fontSize: fontSize.xl, color: colors.paper },

  focusBtn: {
    backgroundColor: colors.highlight, borderRadius: radius.card,
    padding: spacing.md, alignItems: 'center', gap: spacing.xs,
  },
  focusBtnTxt: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },
  focusBtnSub: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.ink },

  emptyTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted },

  planCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.card, padding: spacing.md, gap: spacing.sm,
  },
  planCardDone: { opacity: 0.55 },
  doneBtn: { padding: spacing.xs },
  doneCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: colors.inkMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  doneCircleFilled: { backgroundColor: colors.sage, borderColor: colors.sage },
  doneCheck: { color: '#fff', fontSize: 12, lineHeight: 14, fontFamily: fontFamily.bodySemiBold },
  planTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },
  planTitleDone: { textDecorationLine: 'line-through', color: colors.inkMuted },
  planMeta: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, marginTop: 2 },

  weeklyNum: { fontFamily: fontFamily.mono, fontSize: fontSize.lg, color: colors.ink },
  progressBg: { height: 6, backgroundColor: colors.cardBorder, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.sage, borderRadius: 3 },
});
