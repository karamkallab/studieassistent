import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { useConfirmDialog } from '../../components/ConfirmDialog';
import { MonthCalendarModal } from '../../components/MonthCalendarModal';
import { cancelStudyPlan } from '../../lib/notifications';
import { usePlanCompletions, occurrenceOn, type StudyPlan } from '../../hooks/usePlanCompletions';
import { localDateStr, dbDayIndex, mondayOf } from '../../lib/dates';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

const UNDO_WINDOW_MS = 4000;

const DAY_NAMES = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export default function PlanScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { plans, setPlans, loading, fetchRange, occurrencesOn, isDone, toggleDone } = usePlanCompletions(user?.id);

  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    plan: StudyPlan;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const pendingDeleteRef = useRef(pendingDelete);
  pendingDeleteRef.current = pendingDelete;
  const { confirm, element: confirmDialog } = useConfirmDialog();

  const monday = mondayOf(anchorDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const todayStr = localDateStr(new Date());

  const fetchAll = useCallback(async () => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    await fetchRange(monday, sunday);
    setRefreshing(false);
  }, [fetchRange, monday.getTime()]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const excludeOccurrence = async (plan: StudyPlan, dateStr: string) => {
    const prevExcluded = plan.excluded_dates ?? [];
    const nextExcluded = [...prevExcluded, dateStr];
    setPlans(prev => prev.map(p => (p.id === plan.id ? { ...p, excluded_dates: nextExcluded } : p)));

    const { data, error } = await supabase.from('study_plans')
      .update({ excluded_dates: nextExcluded })
      .eq('id', plan.id)
      .select('id');

    if (error || !data?.length) {
      console.error('Kunde inte ta bort tillfället:', error);
      setPlans(prev => prev.map(p => (p.id === plan.id ? { ...p, excluded_dates: prevExcluded } : p)));
      confirm('Fel', 'Kunde inte ta bort tillfället. Kontrollera din anslutning eller behörigheter.', [{ text: 'OK' }]);
    }
  };

  const commitDelete = async (plan: StudyPlan) => {
    const { data, error } = await supabase.from('study_plans').delete().eq('id', plan.id).select('id');
    if (error || !data?.length) {
      console.error('Kunde inte ta bort studiepasset:', error);
      setPlans(prev => (prev.some(p => p.id === plan.id) ? prev : [...prev, plan]));
      confirm('Fel', 'Kunde inte ta bort passet. Kontrollera din anslutning eller behörigheter.', [{ text: 'OK' }]);
      return;
    }
    await cancelStudyPlan(plan.id);
  };

  const deleteSeries = (plan: StudyPlan) => {
    setPlans(prev => prev.filter(p => p.id !== plan.id));
    commitDelete(plan);
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timer);
    const { plan } = pendingDelete;
    setPlans(prev => [...prev, plan]);
    setPendingDelete(null);
  };

  const deleteWithUndo = (plan: StudyPlan) => {
    if (pendingDelete) {
      clearTimeout(pendingDelete.timer);
      commitDelete(pendingDelete.plan);
    }
    setPlans(prev => prev.filter(p => p.id !== plan.id));
    const timer = setTimeout(() => {
      setPendingDelete(current => {
        if (current && current.plan.id === plan.id) commitDelete(current.plan);
        return null;
      });
    }, UNDO_WINDOW_MS);
    setPendingDelete({ plan, timer });
  };

  useEffect(() => () => {
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timer);
      commitDelete(pendingDeleteRef.current.plan);
    }
  }, []);

  const handleDelete = (plan: StudyPlan, dateStr: string) => {
    if (plan.recurring) {
      confirm(plan.title, 'Detta pass upprepas varje vecka.', [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Ta bort endast detta tillfälle', onPress: () => excludeOccurrence(plan, dateStr) },
        { text: 'Ta bort hela serien', style: 'destructive', onPress: () => deleteSeries(plan) },
      ]);
    } else {
      confirm('Ta bort passet?', plan.title, [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Ta bort', style: 'destructive', onPress: () => deleteWithUndo(plan) },
      ]);
    }
  };

  const weekLabel = () => {
    const mon = weekDates[0];
    const sun = weekDates[6];
    if (mon.getMonth() === sun.getMonth()) {
      return `${mon.getDate()}–${sun.getDate()} ${MONTH_NAMES[mon.getMonth()]}`;
    }
    return `${mon.getDate()} ${MONTH_NAMES[mon.getMonth()]} – ${sun.getDate()} ${MONTH_NAMES[sun.getMonth()]}`;
  };

  const totalForWeek = weekDates.reduce((sum, d) => sum + occurrencesOn(d).length, 0);
  const doneForWeek = weekDates.reduce(
    (sum, d) => sum + occurrencesOn(d).filter(p => isDone(p.id, d)).length,
    0,
  );

  const hasPlansOn = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return plans.some(p => occurrenceOn(p, date));
  }, [plans]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.ink} /></View>;
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <HighlighterText textStyle={s.heading}>Planera</HighlighterText>
        <View style={s.weekNav}>
          <TouchableOpacity
            onPress={() => setAnchorDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}
            style={s.weekBtn}
          >
            <Text style={s.weekBtnTxt}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCalendarOpen(true)} style={s.weekLabelBtn}>
            <Text style={s.weekLabel}>{weekLabel()}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAnchorDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}
            style={s.weekBtn}
          >
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
          const dayPlans = occurrencesOn(date);
          const dateStr = localDateStr(date);
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
                  const done = isDone(plan.id, date);
                  const courseName = plan.courses ? plan.courses.name : null;
                  return (
                    <View key={plan.id} style={[s.planCard, done && s.planCardDone]}>
                      <TouchableOpacity
                        onPress={() => toggleDone(plan.id, date)}
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
                      <TouchableOpacity onPress={() => handleDelete(plan, dateStr)} style={s.editBtn}>
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

      {/* Undo toast */}
      {pendingDelete && (
        <View style={s.toast}>
          <Text style={s.toastTxt} numberOfLines={1}>Passet togs bort</Text>
          <TouchableOpacity onPress={undoDelete}>
            <Text style={s.toastUndo}>ÅNGRA</Text>
          </TouchableOpacity>
        </View>
      )}

      {confirmDialog}

      <MonthCalendarModal
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        initialMonth={anchorDate}
        onSelectDate={setAnchorDate}
        hasPlansOn={hasPlansOn}
      />
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
  weekLabelBtn: { flex: 1, paddingVertical: spacing.xs },
  weekLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.ink, textDecorationLine: 'underline' },
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

  toast: {
    position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.xl + 52 + spacing.sm,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.ink, borderRadius: radius.button,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: spacing.md,
  },
  toastTxt: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.paper },
  toastUndo: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.highlight },
});
