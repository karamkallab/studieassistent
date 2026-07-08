import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, AppState, AppStateStatus, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { scheduleTimerNotif, cancelTimerNotif } from '../../lib/notifications';
import { PressableScale } from '../../components/PressableScale';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AnimatedProgressBar } from '../../components/AnimatedProgressBar';
import { RotateCcwIcon } from '../../components/icons/RotateCcwIcon';
import { PlayIcon } from '../../components/icons/PlayIcon';
import { PauseIcon } from '../../components/icons/PauseIcon';
import { SkipForwardIcon } from '../../components/icons/SkipForwardIcon';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Phase = 'work' | 'break';
type TimerState = 'idle' | 'running' | 'paused';

const TIMER_KEY = 'focus_timer_state';
const RADIUS = 100;
const STROKE = 2;
const DOT_RADIUS = 7;
const SIZE = (RADIUS + DOT_RADIUS) * 2 + 4;
const PRESETS = [15, 25, 45, 50];

type Course = { id: string; name: string; color: string };
type CourseMinutes = { id: string; name: string; color: string; minutes: number };

export default function FocusScreen() {
  const { user } = useAuth();

  const [workMins, setWorkMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [phase, setPhase] = useState<Phase>('work');
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [remaining, setRemaining] = useState(25 * 60);
  const [weeklyTotalMinutes, setWeeklyTotalMinutes] = useState(0);
  const [courseBreakdown, setCourseBreakdown] = useState<CourseMinutes[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const loadWeeklyStats = useCallback(async () => {
    const [{ data: sessions }, { data: courseData }] = await Promise.all([
      supabase.from('focus_sessions').select('minutes, course_id')
        .eq('user_id', user!.id).gte('completed_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('courses').select('id, name, color').order('created_at'),
    ]);

    setWeeklyTotalMinutes((sessions ?? []).reduce((s, r) => s + r.minutes, 0));

    const byCourse = new Map<string, number>();
    for (const s of sessions ?? []) {
      if (!s.course_id) continue;
      byCourse.set(s.course_id, (byCourse.get(s.course_id) ?? 0) + s.minutes);
    }
    const breakdown = (courseData ?? [])
      .map(c => ({ id: c.id, name: c.name, color: c.color, minutes: byCourse.get(c.id) ?? 0 }))
      .filter(c => c.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
    setCourseBreakdown(breakdown);
  }, [user]);

  useEffect(() => {
    (async () => {
      const [{ data: settingsData }, { data: courseData }] = await Promise.all([
        supabase.from('user_settings').select('focus_work_minutes, focus_break_minutes')
          .eq('user_id', user!.id).maybeSingle(),
        supabase.from('courses').select('id, name, color').order('created_at'),
      ]);

      if (settingsData) {
        setWorkMins(settingsData.focus_work_minutes);
        setBreakMins(settingsData.focus_break_minutes);
        setRemaining(settingsData.focus_work_minutes * 60);
      }
      setCourses(courseData ?? []);
      await loadWeeklyStats();

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
        loadWeeklyStats();
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

  const handleSkip = () => {
    if (timerState === 'idle') return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    cancelTimerNotif();
    setTimerState('idle');
    handlePhaseEnd(phase);
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    cancelTimerNotif();
    setTimerState('idle');
    setPhase('work');
    setRemaining(workMins * 60);
  };

  const saveFocusSettings = async (work: number, brk: number) => {
    await supabase.from('user_settings')
      .upsert({ user_id: user!.id, focus_work_minutes: work, focus_break_minutes: brk });
  };

  const selectPreset = (mins: number) => {
    if (timerState !== 'idle') return;
    setWorkMins(mins);
    if (phase === 'work') setRemaining(mins * 60);
    saveFocusSettings(mins, breakMins);
  };

  const totalSec = phase === 'work' ? workMins * 60 : breakMins * 60;
  const elapsedFraction = 1 - remaining / totalSec;
  const dotAngle = (-90 + elapsedFraction * 360) * (Math.PI / 180);
  const center = SIZE / 2;
  const dotX = center + RADIUS * Math.cos(dotAngle);
  const dotY = center + RADIUS * Math.sin(dotAngle);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const selectedCourse = courses.find(c => c.id === courseId);
  const ringColor = phase === 'work' ? (selectedCourse?.color ?? colors.highlight) : colors.sage;
  const maxBreakdownMinutes = Math.max(1, ...courseBreakdown.map(c => c.minutes));

  const fmtMinutes = (mins: number) =>
    mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

  return (
    <ScreenContainer contentContainerStyle={st.content}>
      <View style={st.header}>
        <Text style={st.caption}>POMODORO · {workMins}/{breakMins}</Text>
        <Text style={st.heading}>Fokus</Text>
      </View>

      {/* Ring */}
      <View style={st.ringContainer}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={center} cy={center} r={RADIUS} fill="none" stroke={colors.cardBorder} strokeWidth={STROKE} />
          <Circle cx={dotX} cy={dotY} r={DOT_RADIUS} fill={ringColor} />
        </Svg>
        <View style={st.ringLabel}>
          <Text style={st.remainingLabel}>REMAINING</Text>
          <Text style={st.timerText}>{mm}:{ss}</Text>
          <Text style={st.phaseLabel}>
            {phase === 'break' ? 'PAUS' : (selectedCourse?.name.toUpperCase() ?? 'FOKUS')}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={st.controls}>
        <PressableScale style={st.ctrlBtn} onPress={handleReset}>
          <RotateCcwIcon size={20} color={colors.ink} />
        </PressableScale>
        <PressableScale
          style={st.ctrlBtnPrimary}
          onPress={timerState === 'running' ? handlePause : handleStart}
        >
          {timerState === 'running'
            ? <PauseIcon size={20} color={colors.paper} />
            : <PlayIcon size={20} color={colors.paper} />}
        </PressableScale>
        <PressableScale style={st.ctrlBtn} onPress={handleSkip} disabled={timerState === 'idle'}>
          <SkipForwardIcon size={20} color={timerState === 'idle' ? colors.cardBorder : colors.ink} />
        </PressableScale>
      </View>

      {/* Passlängd */}
      <View style={st.section}>
        <Text style={st.sectionLbl}>PASSLÄNGD</Text>
        <View style={st.presetRow}>
          {PRESETS.map(mins => (
            <PressableScale
              key={mins}
              style={[st.presetPill, workMins === mins && st.presetPillActive]}
              onPress={() => selectPreset(mins)}
              disabled={timerState !== 'idle'}
            >
              <Text style={[st.presetTxt, workMins === mins && st.presetTxtActive]}>{mins} min</Text>
            </PressableScale>
          ))}
        </View>
      </View>

      {/* Course picker */}
      {courses.length > 0 && (
        <View style={st.section}>
          <Text style={st.sectionLbl}>KURS</Text>
          <View style={st.chipRow}>
            <PressableScale
              style={[st.chip, !courseId && st.chipActive]}
              onPress={() => setCourseId(null)}
              disabled={timerState !== 'idle'}
            >
              <Text style={[st.chipTxt, !courseId && st.chipTxtActive]}>Ingen</Text>
            </PressableScale>
            {courses.map(c => (
              <PressableScale
                key={c.id}
                style={[st.chip, courseId === c.id && { borderColor: c.color }]}
                onPress={() => setCourseId(c.id)}
                disabled={timerState !== 'idle'}
              >
                <View style={[st.chipDot, { backgroundColor: c.color }]} />
                <Text
                  style={[st.chipTxt, courseId === c.id && st.chipTxtActive]}
                  numberOfLines={1}
                >
                  {c.name}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>
      )}

      {/* Weekly stats */}
      <View style={st.statsBox}>
        <Text style={st.statsLabel}>DEN HÄR VECKAN</Text>
        <Text style={st.statsValue}>{fmtMinutes(weeklyTotalMinutes)}</Text>
        {courseBreakdown.map(cb => (
          <View key={cb.id} style={st.breakdownRow}>
            <View style={st.breakdownHeader}>
              <Text style={st.breakdownName}>{cb.name}</Text>
              <Text style={st.breakdownMins}>{cb.minutes} MIN</Text>
            </View>
            <AnimatedProgressBar progress={cb.minutes / maxBreakdownMinutes} color={cb.color} />
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const st = StyleSheet.create({
  content: { alignItems: 'center', paddingTop: spacing.xl, paddingHorizontal: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.lg },

  header: { alignSelf: 'flex-start', gap: 2 },
  caption: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },
  heading: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },

  ringContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', alignItems: 'center', gap: 2 },
  remainingLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 2 },
  timerText: { fontFamily: fontFamily.mono, fontSize: fontSize['3xl'], color: colors.ink },
  phaseLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1 },

  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  ctrlBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  ctrlBtnPrimary: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },

  section: { width: '100%', gap: spacing.sm },
  sectionLbl: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  presetPill: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg,
  },
  presetPillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  presetTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  presetTxtActive: { color: colors.paper },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg,
  },
  chipActive: { borderColor: colors.ink },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted },
  chipTxtActive: { color: colors.ink, fontFamily: fontFamily.bodySemiBold },

  statsBox: {
    width: '100%', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.card, padding: spacing.md, gap: spacing.sm,
  },
  statsLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },
  statsValue: { fontFamily: fontFamily.serif, fontSize: fontSize.xl, color: colors.ink },
  breakdownRow: { gap: 4, marginTop: spacing.xs },
  breakdownHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownName: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  breakdownMins: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted },
});
