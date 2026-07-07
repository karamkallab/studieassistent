import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, AppState, AppStateStatus, Alert, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { scheduleTimerNotif, cancelTimerNotif } from '../../lib/notifications';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Phase = 'work' | 'break';
type TimerState = 'idle' | 'running' | 'paused';

const TIMER_KEY = 'focus_timer_state';
const RADIUS = 88;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = (RADIUS + STROKE) * 2 + 4;

type Course = { id: string; name: string };

export default function FocusScreen() {
  const { user } = useAuth();

  const [workMins, setWorkMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [phase, setPhase] = useState<Phase>('work');
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [remaining, setRemaining] = useState(25 * 60);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    (async () => {
      const [{ data: settingsData }, { data: sessionData }, { data: courseData }] = await Promise.all([
        supabase.from('user_settings').select('focus_work_minutes, focus_break_minutes')
          .eq('user_id', user!.id).maybeSingle(),
        supabase.from('focus_sessions').select('minutes')
          .eq('user_id', user!.id).gte('completed_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('courses').select('id, name').order('created_at'),
      ]);

      if (settingsData) {
        setWorkMins(settingsData.focus_work_minutes);
        setBreakMins(settingsData.focus_break_minutes);
        setRemaining(settingsData.focus_work_minutes * 60);
      }
      setWeeklyMinutes((sessionData ?? []).reduce((s, r) => s + r.minutes, 0));
      setCourses(courseData ?? []);

      const saved = await AsyncStorage.getItem(TIMER_KEY);
      if (saved) {
        const { startTime, totalSec, phase: p } = JSON.parse(saved);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const rem = Math.max(0, totalSec - elapsed);
        setPhase(p);
        setRemaining(rem);
        if (rem > 0) {
          setTimerState('running');
          startInterval(rem, p);
        }
        await AsyncStorage.removeItem(TIMER_KEY);
      }
    })();

    const sub = AppState.addEventListener('change', handleAppState);
    return () => { sub.remove(); if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleAppState = useCallback(async (state: AppStateStatus) => {
    if (appStateRef.current !== 'active' && state === 'active') {
      const saved = await AsyncStorage.getItem(TIMER_KEY);
      if (saved) {
        const { startTime, totalSec, phase: p } = JSON.parse(saved);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const rem = Math.max(0, totalSec - elapsed);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPhase(p);
        setRemaining(rem);
        if (rem > 0) startInterval(rem, p);
        else handlePhaseEnd(p);
        await AsyncStorage.removeItem(TIMER_KEY);
      }
    } else if (state === 'background' && timerState === 'running') {
      const saved = { startTime: Date.now(), totalSec: remaining, phase };
      await AsyncStorage.setItem(TIMER_KEY, JSON.stringify(saved));
    }
    appStateRef.current = state;
  }, [timerState, remaining, phase]);

  const startInterval = (initialRemaining: number, currentPhase?: Phase) => {
    let r = initialRemaining;
    const p = currentPhase ?? phase;
    sessionStartRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      r -= 1;
      setRemaining(r);
      if (r <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimerState('idle');
        handlePhaseEnd(p);
      }
    }, 1000);
  };

  const handlePhaseEnd = async (p: Phase) => {
    await cancelTimerNotif();
    if (p === 'work') {
      const mins = Math.round((Date.now() - (sessionStartRef.current ?? Date.now())) / 60000);
      if (mins > 0) {
        await supabase.from('focus_sessions').insert({
          user_id: user!.id, course_id: courseId, minutes: mins,
          completed_at: new Date().toISOString(),
        });
        setWeeklyMinutes(w => w + mins);
      }
      Alert.alert('Bra jobbat!', 'Fokusperiod klar. Ta en paus.');
      setPhase('break');
      setRemaining(breakMins * 60);
    } else {
      Alert.alert('Paus klar', 'Redo för nästa fokusperiod?');
      setPhase('work');
      setRemaining(workMins * 60);
    }
  };

  const handleStart = async () => {
    setTimerState('running');
    startInterval(remaining);
    await scheduleTimerNotif(
      phase === 'work' ? 'Paus!' : 'Dags att fokusera',
      remaining,
    );
  };

  const handlePause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('paused');
    cancelTimerNotif();
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    cancelTimerNotif();
    setTimerState('idle');
    setPhase('work');
    setRemaining(workMins * 60);
  };

  const saveFocusSettings = async (work: number, brk: number) => {
    setSavingSettings(true);
    try {
      await supabase.from('user_settings')
        .upsert({ user_id: user!.id, focus_work_minutes: work, focus_break_minutes: brk });
    } finally {
      setSavingSettings(false);
    }
  };

  const adjustWorkMins = (delta: number) => {
    const val = Math.min(90, Math.max(5, workMins + delta));
    setWorkMins(val);
    if (timerState === 'idle' && phase === 'work') setRemaining(val * 60);
    saveFocusSettings(val, breakMins);
  };

  const adjustBreakMins = (delta: number) => {
    const val = Math.min(30, Math.max(1, breakMins + delta));
    setBreakMins(val);
    if (timerState === 'idle' && phase === 'break') setRemaining(val * 60);
    saveFocusSettings(workMins, val);
  };

  const totalSec = phase === 'work' ? workMins * 60 : breakMins * 60;
  const progress = remaining / totalSec;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <ScrollView style={st.container} contentContainerStyle={st.content}>
      <Text style={st.heading}>Fokustimer</Text>

      {/* Settings summary / adjustment */}
      <Pressable onPress={() => setSettingsOpen(o => !o)} disabled={timerState !== 'idle'}>
        <Text style={st.settingsSummary}>
          {workMins} min fokus · {breakMins} min paus  {timerState === 'idle' ? '✎' : ''}
        </Text>
      </Pressable>
      {settingsOpen && timerState === 'idle' && (
        <View style={st.settingsCard}>
          <View style={st.settingRow}>
            <Text style={st.settingLabel}>Fokusperiod (min)</Text>
            <View style={st.timeRow}>
              <Pressable onPress={() => adjustWorkMins(-5)} style={st.adjBtn} disabled={savingSettings}>
                <Text style={st.adjTxt}>−</Text>
              </Pressable>
              <Text style={st.timeVal}>{workMins}</Text>
              <Pressable onPress={() => adjustWorkMins(5)} style={st.adjBtn} disabled={savingSettings}>
                <Text style={st.adjTxt}>+</Text>
              </Pressable>
            </View>
          </View>
          <View style={st.divider} />
          <View style={st.settingRow}>
            <Text style={st.settingLabel}>Pauslängd (min)</Text>
            <View style={st.timeRow}>
              <Pressable onPress={() => adjustBreakMins(-1)} style={st.adjBtn} disabled={savingSettings}>
                <Text style={st.adjTxt}>−</Text>
              </Pressable>
              <Text style={st.timeVal}>{breakMins}</Text>
              <Pressable onPress={() => adjustBreakMins(1)} style={st.adjBtn} disabled={savingSettings}>
                <Text style={st.adjTxt}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Phase toggle */}
      <View style={st.phaseRow}>
        {(['work', 'break'] as Phase[]).map(p => (
          <Pressable
            key={p}
            style={[st.phaseBtn, phase === p && st.phaseBtnActive]}
            onPress={() => {
              if (timerState !== 'idle') return;
              setPhase(p);
              setRemaining(p === 'work' ? workMins * 60 : breakMins * 60);
            }}
            disabled={timerState !== 'idle'}
          >
            <Text style={[st.phaseTxt, phase === p && st.phaseTxtActive]}>
              {p === 'work' ? `Fokus ${workMins}m` : `Paus ${breakMins}m`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Ring */}
      <View style={st.ringContainer}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none" stroke={colors.cardBorder} strokeWidth={STROKE}
          />
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none"
            stroke={phase === 'work' ? colors.highlight : colors.sage}
            strokeWidth={STROKE}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={st.ringLabel}>
          <Text style={st.timerText}>{mm}:{ss}</Text>
          <Text style={st.phaseLabel}>{phase === 'work' ? 'FOKUS' : 'PAUS'}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={st.controls}>
        {timerState === 'running' ? (
          <Pressable style={st.btn} onPress={handlePause}>
            <Text style={st.btnTxt}>⏸  Pausa</Text>
          </Pressable>
        ) : (
          <Pressable style={st.btn} onPress={handleStart}>
            <Text style={st.btnTxt}>{timerState === 'paused' ? '▶  Fortsätt' : '▶  Starta'}</Text>
          </Pressable>
        )}
        {timerState !== 'idle' && (
          <Pressable style={st.resetBtn} onPress={handleReset}>
            <Text style={st.resetTxt}>Återställ</Text>
          </Pressable>
        )}
      </View>

      {/* Course picker */}
      {courses.length > 0 && (
        <View style={st.courseSection}>
          <Text style={st.sectionLbl}>KURS (valfritt)</Text>
          <View style={st.chipRow}>
            <Pressable
              style={[st.chip, !courseId && st.chipActive]}
              onPress={() => setCourseId(null)}
              disabled={timerState !== 'idle'}
            >
              <Text style={[st.chipTxt, !courseId && st.chipTxtActive]}>Ingen</Text>
            </Pressable>
            {courses.map(c => (
              <Pressable
                key={c.id}
                style={[st.chip, courseId === c.id && st.chipActive]}
                onPress={() => setCourseId(c.id)}
                disabled={timerState !== 'idle'}
              >
                <Text style={[st.chipTxt, courseId === c.id && st.chipTxtActive]} numberOfLines={1}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Weekly stats */}
      <View style={st.statsBox}>
        <Text style={st.statsLabel}>FOKUSTID DENNA VECKA</Text>
        <Text style={st.statsValue}>
          {weeklyMinutes >= 60
            ? `${Math.floor(weeklyMinutes / 60)}h ${weeklyMinutes % 60}m`
            : `${weeklyMinutes}m`}
        </Text>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing['2xl'], gap: spacing.lg },

  heading: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },

  settingsSummary: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.inkMuted },
  settingsCard: {
    width: '100%', backgroundColor: colors.cardBg, borderWidth: 1,
    borderColor: colors.cardBorder, borderRadius: radius.card, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, gap: spacing.sm,
  },
  settingLabel: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.cardBorder, marginHorizontal: spacing.md },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeVal: { fontFamily: fontFamily.mono, fontSize: fontSize.base, color: colors.ink, minWidth: 40, textAlign: 'center' },
  adjBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  adjTxt: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },

  phaseRow: { flexDirection: 'row', gap: spacing.sm },
  phaseBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg,
  },
  phaseBtnActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  phaseTxt: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.inkMuted },
  phaseTxtActive: { color: colors.paper },

  ringContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', alignItems: 'center', gap: spacing.xs },
  timerText: { fontFamily: fontFamily.mono, fontSize: fontSize['3xl'], color: colors.ink },
  phaseLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 2 },

  controls: { gap: spacing.sm, width: '70%' },
  btn: { backgroundColor: colors.ink, padding: spacing.md, borderRadius: radius.button, alignItems: 'center' },
  btnTxt: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.lg, color: colors.paper },
  resetBtn: { alignItems: 'center', padding: spacing.sm },
  resetTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted, textDecorationLine: 'underline' },

  courseSection: { width: '100%', paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
  sectionLbl: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted },
  chipTxtActive: { color: colors.paper },

  statsBox: { alignItems: 'center', gap: spacing.xs },
  statsLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },
  statsValue: { fontFamily: fontFamily.serif, fontSize: fontSize.xl, color: colors.ink },
});
