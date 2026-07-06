import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { HighlighterText } from '../../components/HighlighterText';
import { cancelStudyPlan } from '../../lib/notifications';
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

const DAY_NAMES = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const day = (today.getDay() + 6) % 7;
  const monday = new Date(today.getTime() - day * 86400000 + offset * 7 * 86400000);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * 86400000));
}

function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function dbDayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export default function PlanScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const weekDates = getWeekDates(weekOffset);
  const todayStr = new Date().toISOString().split('T')[0];

  const fetchAll = useCallback(async () => {
    const monday = weekDates[0];
    const sunday = weekDates[6];
    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];

    const [{ data: planData }, { data: compData }] = await Promise.all([
      supabase.from('study_plans')
        .select('id, title, time_of_day, duration_minutes, course_id, weekdays, specific_date, recurring, courses(name)')
        .eq('user_id', user!.id)
        .order('time_of_day'),
      supabase.from('study_plan_completions')
        .select('plan_id, completed_on')
        .gte('completed_on', mondayStr)
        .lte('completed_on', sundayStr),
    ]);

    setPlans((planData ?? []) as unknown as StudyPlan[]);
    setCompletions(new Set((compData ?? []).map(c => c.plan_id)));
    setLoading(false);
    setRefreshing(false);
  }, [user, weekOffset]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const plansForDay = (date: Date): StudyPlan[] => {
    const dateStr = date.toISOString().split('T')[0];
    const dayIdx = dbDayIndex(date);
    return plans.filter(p => {
      if (p.specific_date === dateStr) return true;
      if (p.recurring && p.weekdays.includes(dayIdx)) return true;
      return false;
    });
  };

  const handleToggleDone = async (planId: string, dateStr: string) => {
    const isDone = completions.has(planId);
    if (isDone) {
      await supabase.from('study_plan_completions')
        .delete().eq('plan_id', planId).eq('completed_on', dateStr);
      setCompletions(prev => { const s = new Set(prev); s.delete(planId); return s; });
    } else {
      await supabase.from('study_plan_completions')
        .insert({ plan_id: planId, completed_on: dateStr });
      setCompletions(prev => new Set([...prev, planId]));
    }
  };

  const handleDelete = (plan: StudyPlan) => {
    Alert.alert('Ta bort pass?', plan.title, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort', style: 'destructive',
        onPress: async () => {
          await supabase.from('study_plans').delete().eq('id', plan.id);
          await cancelStudyPlan(plan.id);
          setPlans(prev => prev.filter(p => p.id !== plan.id));
        },
      },
    ]);
  };

  const weekLabel = () => {
    const mon = weekDates[0];
    const sun = weekDates[6];
    if (mon.getMonth() === sun.getMonth()) {
      return `${mon.getDate()}–${sun.getDate()} ${MONTH_NAMES[mon.getMonth()]}`;
    }
    return `${mon.getDate()} ${MONTH_NAMES[mon.getMonth()]} – ${sun.getDate()} ${MONTH_NAMES[sun.getMonth()]}`;
  };

  const totalForWeek = weekDates.reduce((sum, d) => sum + plansForDay(d).length, 0);
  const doneForWeek = completions.size;

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.ink} /></View>;
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <HighlighterText textStyle={s.heading}>Planera</HighlighterText>
        <View style={s.weekNav}>
          <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} style={s.weekBtn}>
            <Text style={s.weekBtnTxt}>‹</Text>
          </TouchableOpacity>
          <Text style={s.weekLabel}>{weekLabel()}</Text>
          <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)} style={s.weekBtn}>
            <Text style={s.weekBtnTxt}>›</Text>
          </TouchableOpacity>
        </View>
        {totalForWeek > 0 && (
          <Text style={s.weekProgress}>
            {doneForWeek} av {totalForWeek} pass klara denna vecka
          </Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAll(); }}
            tintColor={colors.ink}
          />
        }
      >
        {weekDates.map(date => {
          const dayPlans = plansForDay(date);
          const dateStr = date.toISOString().split('T')[0];
          const isToday = dateStr === todayStr;
          return (
            <View key={dateStr} style={s.daySection}>
              <View style={s.dayHeader}>
                <Text style={[s.dayName, isToday && s.dayNameToday]}>
                  {DAY_NAMES[dbDayIndex(date)]}
                </Text>
                <Text style={[s.dayDate, isToday && s.dayDateToday]}>{fmtDate(date)}</Text>
                {isToday && <View style={s.todayDot} />}
              </View>
              {dayPlans.length === 0 ? (
                <Text style={s.emptyDay}>–</Text>
              ) : (
                dayPlans.map(plan => {
                  const done = completions.has(plan.id);
                  const courseName = plan.courses
                    ? (plan.courses as { name: string }).name
                    : null;
                  return (
                    <View key={plan.id} style={[s.planCard, done && s.planCardDone]}>
                      <TouchableOpacity
                        onPress={() => handleToggleDone(plan.id, dateStr)}
                        style={s.doneBtn}
                      >
                        <View style={[s.doneCircle, done && s.doneCircleFilled]}>
                          {done && <Text style={s.doneCheck}>✓</Text>}
                        </View>
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.planTitle, done && s.planTitleDone]}>{plan.title}</Text>
                        <Text style={s.planMeta}>
                          {plan.time_of_day?.slice(0, 5)} · {plan.duration_minutes} min
                          {courseName ? ` · ${courseName}` : ''}
                          {plan.recurring ? ' · återkommande' : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('CreatePlan', { planId: plan.id })}
                        style={s.editBtn}
                      >
                        <Text style={s.editTxt}>Redigera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(plan)} style={s.editBtn}>
                        <Text style={[s.editTxt, { color: colors.rust }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('CreatePlan', {})}
        activeOpacity={0.85}
      >
        <Text style={s.fabTxt}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  heading: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },

  weekNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weekBtn: { padding: spacing.xs, minWidth: 32, alignItems: 'center' },
  weekBtnTxt: { fontFamily: fontFamily.body, fontSize: fontSize.xl, color: colors.inkMuted },
  weekLabel: { flex: 1, fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.ink },
  weekProgress: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted },

  scroll: { paddingBottom: 100 },

  daySection: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayName: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.inkMuted, width: 28 },
  dayNameToday: { color: colors.ink, fontFamily: fontFamily.monoMedium },
  dayDate: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.inkMuted },
  dayDateToday: { color: colors.ink },
  todayDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.highlight,
  },
  emptyDay: {
    fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.cardBorder,
    paddingLeft: spacing.xl,
  },

  planCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.card, padding: spacing.sm, gap: spacing.sm,
  },
  planCardDone: { opacity: 0.5 },
  doneBtn: { padding: spacing.xs },
  doneCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.inkMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  doneCircleFilled: { backgroundColor: colors.sage, borderColor: colors.sage },
  doneCheck: { color: '#fff', fontSize: 11, lineHeight: 13, fontFamily: fontFamily.bodySemiBold },
  planTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.ink },
  planTitleDone: { textDecorationLine: 'line-through', color: colors.inkMuted },
  planMeta: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, marginTop: 1 },
  editBtn: { paddingHorizontal: spacing.xs, paddingVertical: 2 },
  editTxt: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.inkMuted, textDecorationLine: 'underline' },

  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.xl,
    backgroundColor: colors.ink, width: 52, height: 52,
    borderRadius: 26, alignItems: 'center', justifyContent: 'center',
  },
  fabTxt: { color: colors.paper, fontSize: 28, lineHeight: 32, fontFamily: fontFamily.body },
});
