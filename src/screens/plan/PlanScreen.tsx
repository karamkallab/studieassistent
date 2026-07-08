import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { useConfirmDialog } from '../../components/ConfirmDialog';
import { MonthCalendarGrid } from '../../components/MonthCalendarGrid';
import { StaggerIn } from '../../components/StaggerIn';
import { PressableScale } from '../../components/PressableScale';
import { AnimatedCheck } from '../../components/AnimatedCheck';
import { ScreenContainer } from '../../components/ScreenContainer';
import { cancelStudyPlan } from '../../lib/notifications';
import { usePlanCompletions, occurrenceOn, type StudyPlan } from '../../hooks/usePlanCompletions';
import { localDateStr, dbDayIndex, mondayOf } from '../../lib/dates';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

const UNDO_WINDOW_MS = 4000;
// Persists the pending delete so it still commits if the app is closed or
// reloaded mid-undo-window — an in-memory setTimeout alone doesn't survive that.
const PENDING_DELETE_KEY = 'plan_pending_delete_v1';

const DAY_LETTERS = ['MÅN', 'TIS', 'ONS', 'TOR', 'FRE', 'LÖR', 'SÖN'];

export default function PlanScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { plans, setPlans, loading, fetchRange, occurrencesOn, isDone, toggleDone } = usePlanCompletions(user?.id);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    plan: StudyPlan;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const pendingDeleteRef = useRef(pendingDelete);
  pendingDeleteRef.current = pendingDelete;
  const { confirm, element: confirmDialog } = useConfirmDialog();

  const monday = mondayOf(selectedDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const todayStr = localDateStr(new Date());
  const selectedDateStr = localDateStr(selectedDate);

  const fetchAll = useCallback(async () => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    await fetchRange(monday, sunday);
    setRefreshing(false);
  }, [fetchRange, monday.getTime()]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const selectDate = (date: Date) => {
    setSelectedDate(date);
    setCalendarYear(date.getFullYear());
    setCalendarMonth(date.getMonth());
  };

  const shiftWeek = (deltaDays: number) => {
    selectDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + deltaDays));
  };

  const changeCalendarMonth = (delta: number) => {
    let m = calendarMonth + delta;
    let y = calendarYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setCalendarMonth(m);
    setCalendarYear(y);
  };

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
    await AsyncStorage.removeItem(PENDING_DELETE_KEY);
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
    AsyncStorage.removeItem(PENDING_DELETE_KEY);
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
    AsyncStorage.setItem(PENDING_DELETE_KEY, JSON.stringify({ planId: plan.id }));
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

  // If a previous session was closed/reloaded mid-undo-window, the setTimeout
  // above never got to fire. Finish that delete now — by the time we're back,
  // the undo window has long since expired either way.
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(PENDING_DELETE_KEY);
      if (!raw) return;
      await AsyncStorage.removeItem(PENDING_DELETE_KEY);
      const { planId } = JSON.parse(raw) as { planId: string };
      const { error } = await supabase.from('study_plans').delete().eq('id', planId);
      if (!error) {
        await cancelStudyPlan(planId);
        setPlans(prev => prev.filter(p => p.id !== planId));
      }
    })();
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

  const hasPlansOn = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return plans.some(p => occurrenceOn(p, date));
  }, [plans]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.ink} /></View>;
  }

  const selectedPlans = occurrencesOn(selectedDate).slice().sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
  const selectedDayLetter = DAY_LETTERS[dbDayIndex(selectedDate)];

  return (
    <ScreenContainer
      contentContainerStyle={s.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchAll(); }}
          tintColor={colors.ink}
        />
      }
      header={
        <View style={s.header}>
          <Text style={s.caption}>PLANERING</Text>
          <Text style={s.heading}>Studieplan</Text>

          <View style={s.dayRow}>
            <TouchableOpacity onPress={() => shiftWeek(-7)} style={s.weekArrow}>
              <Text style={s.weekArrowTxt}>‹</Text>
            </TouchableOpacity>
            <View style={s.dayCells}>
              {weekDates.map(date => {
                const dateStr = localDateStr(date);
                const isSelected = dateStr === selectedDateStr;
                const hasPlans = hasPlansOn(dateStr);
                return (
                  <TouchableOpacity key={dateStr} style={s.dayCell} onPress={() => selectDate(date)}>
                    <Text style={s.dayLetter}>{DAY_LETTERS[dbDayIndex(date)]}</Text>
                    <View style={[s.dayCircle, isSelected && s.dayCircleSelected]}>
                      <Text style={[s.dayNum, isSelected && s.dayNumSelected]}>{date.getDate()}</Text>
                    </View>
                    {isSelected ? (
                      <View style={s.dayUnderline} />
                    ) : hasPlans ? (
                      <View style={s.dayDot} />
                    ) : (
                      <View style={s.dayDotSpacer} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => shiftWeek(7)} style={s.weekArrow}>
              <Text style={s.weekArrowTxt}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
      overlay={
        <>
          {/* FAB */}
          <PressableScale
            style={s.fab}
            onPress={() => navigation.navigate('CreatePlan', {})}
          >
            <Text style={s.fabTxt}>+</Text>
          </PressableScale>

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
        </>
      }
    >
      <View style={s.daySection}>
        <Text style={s.passCount}>
          {selectedPlans.length} PASS · {selectedDayLetter}
        </Text>

        {selectedPlans.length === 0 ? (
          <View style={s.emptyDay}>
            <Text style={s.emptyDayTxt}>Inga pass denna dag.</Text>
          </View>
        ) : (
          selectedPlans.map((plan, index) => {
            const done = isDone(plan.id, selectedDate);
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
                  <PressableScale
                    onPress={() => toggleDone(plan.id, selectedDate)}
                    style={s.doneBtn}
                  >
                    <View style={[s.doneCircle, done && s.doneCircleFilled]}>
                      {done && <AnimatedCheck size={12} />}
                    </View>
                  </PressableScale>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.planTitle, done && s.planTitleDone]}>{plan.title}</Text>
                    <Text style={s.planMeta}>
                      {plan.time_of_day?.slice(0, 5)} · {plan.duration_minutes} min
                      {courseName ? <Text style={{ color: courseColor }}> · {courseName}</Text> : ''}
                      {plan.recurring ? ' · återkommande' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('CreatePlan', { planId: plan.id })}
                    style={s.editBtn}
                  >
                    <Text style={s.editTxt}>Redigera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(plan, selectedDateStr)} style={s.editBtn}>
                    <Text style={[s.editTxt, { color: colors.rust }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              </StaggerIn>
            );
          })
        )}
      </View>

      <View style={s.calendarSection}>
        <MonthCalendarGrid
          year={calendarYear}
          month={calendarMonth}
          onPrevMonth={() => changeCalendarMonth(-1)}
          onNextMonth={() => changeCalendarMonth(1)}
          onSelectDate={selectDate}
          hasPlansOn={hasPlansOn}
        />
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  caption: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },
  heading: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink, marginBottom: spacing.sm },

  dayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  weekArrow: { padding: spacing.xs, minWidth: 24, alignItems: 'center' },
  weekArrowTxt: { fontFamily: fontFamily.body, fontSize: fontSize.xl, color: colors.inkMuted },
  dayCells: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { alignItems: 'center', gap: 4 },
  dayLetter: { fontFamily: fontFamily.mono, fontSize: 9, color: colors.inkMuted, letterSpacing: 0.3 },
  dayCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  dayCircleSelected: { backgroundColor: colors.highlight },
  dayNum: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  dayNumSelected: { fontFamily: fontFamily.bodySemiBold, color: colors.ink },
  dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.inkMuted },
  dayDotSpacer: { width: 4, height: 4 },
  dayUnderline: { width: 14, height: 2, borderRadius: 1, backgroundColor: colors.highlight },

  scroll: { paddingBottom: 100, gap: spacing.lg },

  daySection: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  passCount: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },
  emptyDay: { paddingVertical: spacing.lg, alignItems: 'center' },
  emptyDayTxt: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.inkMuted },

  planCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.card, padding: spacing.sm, gap: spacing.sm,
  },
  planCardDone: { opacity: 0.65 },
  doneBtn: { padding: spacing.xs },
  doneCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.inkMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  doneCircleFilled: { backgroundColor: colors.sage, borderColor: colors.sage },
  planTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.ink },
  planTitleDone: { color: colors.inkMuted },
  planMeta: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, marginTop: 1 },
  editBtn: { paddingHorizontal: spacing.xs, paddingVertical: 2 },
  editTxt: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.inkMuted, textDecorationLine: 'underline' },

  calendarSection: { paddingHorizontal: spacing.md },

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
  toastUndo: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.paper, textDecorationLine: 'underline' },
});
