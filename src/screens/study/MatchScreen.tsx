import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Flashcard = { id: string; question: string; answer: string };
type Props = NativeStackScreenProps<AppStackParamList, 'Match'>;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const BATCH = 6;

// ─── Animated card ────────────────────────────────────────────────────────────

function MatchCard({
  text,
  side,
  state,
  onPress,
  reduceMotion,
}: {
  text: string;
  side: 'q' | 'a';
  state: 'default' | 'selected' | 'matched' | 'wrong';
  onPress: () => void;
  reduceMotion: boolean;
}) {
  const shake = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (state === 'wrong' && !reduceMotion) {
      shake.value = withSequence(
        withTiming(-10, { duration: 60 }),
        withTiming(10, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
    if (state === 'matched' && !reduceMotion) {
      scale.value = withTiming(0.9, { duration: 150 });
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [state]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const bg =
    state === 'selected' ? colors.ink :
    state === 'wrong'    ? colors.rust :
    state === 'matched'  ? colors.sage :
    colors.cardBg;

  const tc =
    state === 'selected' || state === 'wrong' || state === 'matched' ? '#fff' : colors.ink;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={[styles.matchCard, { backgroundColor: bg, borderColor: bg === colors.cardBg ? colors.cardBorder : bg }]}
        onPress={onPress}
        disabled={state === 'matched'}
      >
        <Text style={[styles.matchText, { color: tc }]} numberOfLines={3}>{text}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MatchScreen({ route, navigation }: Props) {
  const { courseId, courseName } = route.params;
  const { user } = useAuth();
  const reduceMotion = useReducedMotion() ?? false;

  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [questions, setQuestions] = useState<Flashcard[]>([]);
  const [answers, setAnswers] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [wrongQ, setWrongQ] = useState<string | null>(null);
  const [wrongA, setWrongA] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: score }] = await Promise.all([
        supabase.from('flashcards').select('id, question, answer')
          .eq('course_id', courseId).eq('user_id', user!.id),
        supabase.from('match_scores').select('best_time_seconds')
          .eq('course_id', courseId).eq('user_id', user!.id).maybeSingle(),
      ]);
      const cards = data ?? [];
      setAllCards(cards);
      setBestTime(score?.best_time_seconds ?? null);
      initBatch(cards);
      setLoading(false);
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const initBatch = (cards: Flashcard[]) => {
    const batch = shuffle(cards).slice(0, BATCH);
    setQuestions(shuffle(batch));
    setAnswers(shuffle(batch));
    setMatched(new Set());
    setSelectedQ(null);
    setSelectedA(null);
    setWrongQ(null);
    setWrongA(null);
    setElapsed(0);
    setFinished(false);
    startRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
  };

  const handleQ = useCallback((id: string) => {
    if (matched.has(id) || wrongQ) return;
    setSelectedQ(id);
    if (selectedA) checkPair(id, selectedA);
  }, [matched, selectedA, wrongQ]);

  const handleA = useCallback((id: string) => {
    if (matched.has(id) || wrongA) return;
    setSelectedA(id);
    if (selectedQ) checkPair(selectedQ, id);
  }, [matched, selectedQ, wrongA]);

  const checkPair = useCallback((qId: string, aId: string) => {
    if (qId === aId) {
      // Correct match
      const newMatched = new Set(matched);
      newMatched.add(qId);
      setTimeout(() => {
        setMatched(newMatched);
        setSelectedQ(null);
        setSelectedA(null);
        if (newMatched.size === questions.length) {
          // All matched!
          if (timerRef.current) clearInterval(timerRef.current);
          const time = Math.floor((Date.now() - startRef.current) / 1000);
          setElapsed(time);
          setFinished(true);
          saveScore(time);
        }
      }, 300);
    } else {
      // Wrong
      setWrongQ(qId);
      setWrongA(aId);
      setTimeout(() => {
        setWrongQ(null);
        setWrongA(null);
        setSelectedQ(null);
        setSelectedA(null);
      }, 700);
    }
  }, [matched, questions]);

  const saveScore = async (time: number) => {
    const isNewBest = bestTime === null || time < bestTime;
    if (isNewBest) {
      await supabase.from('match_scores').upsert({
        user_id: user!.id, course_id: courseId,
        best_time_seconds: time, achieved_at: new Date().toISOString(),
      });
      setBestTime(time);
    }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const getQState = (id: string) => {
    if (matched.has(id)) return 'matched';
    if (wrongQ === id) return 'wrong';
    if (selectedQ === id) return 'selected';
    return 'default';
  };

  const getAState = (id: string) => {
    if (matched.has(id)) return 'matched';
    if (wrongA === id) return 'wrong';
    if (selectedA === id) return 'selected';
    return 'default';
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.ink} /></View>;

  if (allCards.length < 2) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>För få kort</Text>
        <Text style={styles.emptyBody}>Behöver minst 2 flashkort för att matcha.</Text>
      </View>
    );
  }

  if (finished) {
    const isNewBest = bestTime !== null && elapsed <= bestTime;
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.finishContainer}>
          <Text style={styles.finishEmoji}>⚡</Text>
          <Text style={styles.finishTitle}>Klart!</Text>
          <Text style={styles.finishTime}>{formatTime(elapsed)}</Text>
          {isNewBest && <Text style={styles.newBest}>Nytt rekord!</Text>}
          {bestTime !== null && !isNewBest && (
            <Text style={styles.prevBest}>Bästa tid: {formatTime(bestTime)}</Text>
          )}
          <View style={styles.finishActions}>
            <Pressable style={styles.btn} onPress={() => initBatch(allCards)}>
              <Text style={styles.btnTxt}>Spela igen</Text>
            </Pressable>
            <Pressable style={styles.btnGhost} onPress={() => navigation.goBack()}>
              <Text style={styles.btnGhostTxt}>Tillbaka</Text>
            </Pressable>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.grid}
      header={
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </Pressable>
          <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
          {bestTime !== null && (
            <Text style={styles.bestText}>Bäst {formatTime(bestTime)}</Text>
          )}
        </View>
      }
    >
      <View style={styles.col}>
        <Text style={styles.colLabel}>FRÅGOR</Text>
        {questions.map(q => (
          <MatchCard
            key={q.id}
            text={q.question}
            side="q"
            state={getQState(q.id) as any}
            onPress={() => handleQ(q.id)}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
      <View style={styles.col}>
        <Text style={styles.colLabel}>SVAR</Text>
        {answers.map(a => (
          <MatchCard
            key={a.id}
            text={a.answer}
            side="a"
            state={getAState(a.id) as any}
            onPress={() => handleA(a.id)}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  emptyTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.lg, color: colors.ink },
  emptyBody: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.inkMuted, textAlign: 'center' },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.sm, gap: spacing.md },
  closeBtn: { padding: spacing.xs },
  closeTxt: { fontFamily: fontFamily.body, fontSize: fontSize.lg, color: colors.inkMuted },
  timerText: { flex: 1, textAlign: 'center', fontFamily: fontFamily.mono, fontSize: fontSize.xl, color: colors.ink },
  bestText: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted },

  grid: { flexDirection: 'row', padding: spacing.sm, gap: spacing.sm, paddingBottom: spacing.xl },
  col: { flex: 1, gap: spacing.sm },
  colLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5, textAlign: 'center', marginBottom: spacing.xs },

  matchCard: {
    borderWidth: 1.5, borderRadius: radius.button,
    padding: spacing.sm, minHeight: 60, justifyContent: 'center',
  },
  matchText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 18, textAlign: 'center' },

  finishContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  finishEmoji: { fontSize: 48 },
  finishTitle: { fontFamily: fontFamily.serif, fontSize: fontSize['3xl'], color: colors.ink },
  finishTime: { fontFamily: fontFamily.mono, fontSize: fontSize['2xl'], color: colors.ink },
  newBest: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.lg, color: colors.sage },
  prevBest: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.inkMuted },
  finishActions: { gap: spacing.sm, width: '100%', marginTop: spacing.lg },
  btn: { backgroundColor: colors.ink, padding: spacing.md, borderRadius: radius.button, alignItems: 'center' },
  btnTxt: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.paper },
  btnGhost: { padding: spacing.md, borderRadius: radius.button, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  btnGhostTxt: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },
});
