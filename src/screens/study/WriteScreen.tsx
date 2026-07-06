import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, useReducedMotion,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { sm2 } from '../../lib/sm2';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Flashcard = {
  id: string; question: string; answer: string;
  ease_factor: number; interval_days: number; repetitions: number;
};

type CheckResult = 'idle' | 'correct' | 'wrong';

type Props = NativeStackScreenProps<AppStackParamList, 'Write'>;

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isClose(input: string, correct: string): boolean {
  const a = normalize(input);
  const b = normalize(correct);
  if (a === b) return true;
  // Levenshtein distance ≤ 2 for short answers
  if (Math.abs(a.length - b.length) > 3) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr;
  }
  return prev[b.length] <= 2;
}

export default function WriteScreen({ route, navigation }: Props) {
  const { courseId, courseName } = route.params;
  const { user } = useAuth();
  const reduceMotion = useReducedMotion() ?? false;

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<CheckResult>('idle');
  const [loading, setLoading] = useState(true);
  const [correct, setCorrect] = useState(0);
  const [cardKey, setCardKey] = useState(0);

  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(12);

  const animateIn = () => {
    if (reduceMotion) { cardOpacity.value = 1; cardY.value = 0; return; }
    cardOpacity.value = 0; cardY.value = 12;
    cardOpacity.value = withTiming(1, { duration: 220 });
    cardY.value = withTiming(0, { duration: 220 });
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('flashcards')
        .select('id, question, answer, ease_factor, interval_days, repetitions')
        .eq('course_id', courseId).eq('user_id', user!.id)
        .order('next_review_at');
      setCards(data ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (!loading) animateIn(); }, [loading, cardKey]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  const handleCheck = useCallback(async () => {
    if (result !== 'idle' || !input.trim()) return;
    const card = cards[idx];
    const ok = isClose(input, card.answer);
    setResult(ok ? 'correct' : 'wrong');
    if (ok) setCorrect(c => c + 1);

    const grade = ok ? 5 : 2;
    const r = sm2(card.ease_factor, card.interval_days, card.repetitions, grade);
    await supabase.from('flashcards').update({
      ease_factor: r.easeFactor, interval_days: r.intervalDays,
      repetitions: r.repetitions, next_review_at: r.nextReviewAt.toISOString(),
    }).eq('id', card.id);
  }, [result, input, cards, idx]);

  const handleNext = useCallback(() => {
    const next = idx + 1;
    if (next >= cards.length) {
      navigation.replace('ReviewComplete', { count: correct + (result === 'correct' ? 1 : 0), streakDays: 0 });
    } else {
      setIdx(next);
      setInput('');
      setResult('idle');
      setCardKey(k => k + 1);
    }
  }, [idx, cards, correct, result]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.ink} /></View>;

  if (cards.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Inga kort att öva på</Text>
        <Text style={styles.emptyBody}>Skapa flashkort i kursvyn först.</Text>
      </View>
    );
  }

  const card = cards[idx];
  const bgColor =
    result === 'correct' ? colors.sage :
    result === 'wrong' ? colors.rust :
    colors.cardBg;
  const textColor = result !== 'idle' ? '#fff' : colors.ink;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </Pressable>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${((idx + 1) / cards.length) * 100}%` }]} />
          </View>
          <Text style={styles.counter}>{idx + 1}/{cards.length}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.questionCard, cardStyle]}>
            <Text style={styles.sideLabel}>FRÅGA</Text>
            <Text style={styles.questionText}>{card.question}</Text>
          </Animated.View>

          {/* Answer input */}
          <View style={[styles.answerBox, { borderColor: bgColor === colors.cardBg ? colors.cardBorder : bgColor }]}>
            <TextInput
              style={[styles.answerInput, { color: result !== 'idle' ? bgColor : colors.ink }]}
              placeholder="Skriv ditt svar..."
              placeholderTextColor={colors.inkMuted}
              value={input}
              onChangeText={setInput}
              editable={result === 'idle'}
              multiline
              onSubmitEditing={handleCheck}
              returnKeyType="done"
              blurOnSubmit
            />
          </View>

          {/* Show correct answer on wrong */}
          {result === 'wrong' && (
            <View style={styles.correctBox}>
              <Text style={styles.correctLabel}>Rätt svar:</Text>
              <Text style={styles.correctText}>{card.answer}</Text>
            </View>
          )}

          {/* Result tag */}
          {result !== 'idle' && (
            <View style={[styles.resultTag, { backgroundColor: bgColor }]}>
              <Text style={styles.resultTagText}>
                {result === 'correct' ? '✓ Rätt!' : '✗ Fel'}
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.actions}>
            {result === 'idle' ? (
              <Pressable
                style={[styles.btn, !input.trim() && styles.btnDisabled]}
                onPress={handleCheck}
                disabled={!input.trim()}
              >
                <Text style={styles.btnTxt}>Kontrollera</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.btn} onPress={handleNext}>
                <Text style={styles.btnTxt}>
                  {idx + 1 < cards.length ? 'Nästa →' : 'Klar'}
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  emptyTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.lg, color: colors.ink },
  emptyBody: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.inkMuted, textAlign: 'center' },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.sm, gap: spacing.sm },
  closeBtn: { padding: spacing.xs },
  closeTxt: { fontFamily: fontFamily.body, fontSize: fontSize.lg, color: colors.inkMuted },
  progressBg: { flex: 1, height: 6, backgroundColor: colors.cardBorder, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.ink, borderRadius: 3 },
  counter: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, minWidth: 32, textAlign: 'right' },

  body: { padding: spacing.md, gap: spacing.md },

  questionCard: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.card, padding: spacing.xl, gap: spacing.sm, minHeight: 120, justifyContent: 'center',
  },
  sideLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },
  questionText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xl, color: colors.ink, lineHeight: 30 },

  answerBox: {
    borderWidth: 1.5, borderRadius: radius.button,
    backgroundColor: colors.cardBg, minHeight: 80,
  },
  answerInput: {
    padding: spacing.md, fontSize: fontSize.base, fontFamily: fontFamily.body,
    lineHeight: 24, textAlignVertical: 'top',
  },

  correctBox: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.sage,
    borderRadius: radius.button, padding: spacing.md, gap: spacing.xs,
  },
  correctLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.sage, letterSpacing: 1 },
  correctText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },

  resultTag: { alignSelf: 'flex-start', borderRadius: 20, paddingVertical: 4, paddingHorizontal: spacing.md },
  resultTagText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: '#fff' },

  actions: { marginTop: spacing.sm },
  btn: { backgroundColor: colors.ink, padding: spacing.md, borderRadius: radius.button, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnTxt: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.paper },
});
