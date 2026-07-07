import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
};

type AnswerState = 'default' | 'correct' | 'wrong' | 'faded';

type Props = NativeStackScreenProps<AppStackParamList, 'Quiz'>;

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const ADVANCE_DELAY = 1000;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function OptionButton({
  label,
  text,
  state,
  onPress,
  reduceMotion,
}: {
  label: string;
  text: string;
  state: AnswerState;
  onPress: () => void;
  reduceMotion: boolean;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg =
    state === 'correct' ? colors.sage :
    state === 'wrong' ? colors.rust :
    colors.cardBg;

  const textColor =
    state === 'correct' || state === 'wrong' ? '#fff' :
    state === 'faded' ? colors.inkMuted :
    colors.ink;

  const borderColor =
    state === 'correct' ? colors.sage :
    state === 'wrong' ? colors.rust :
    colors.cardBorder;

  return (
    <AnimatedPressable
      style={[styles.option, { backgroundColor: bg, borderColor }, animStyle]}
      onPress={onPress}
      onPressIn={() => { if (!reduceMotion) scale.value = withTiming(0.97, { duration: 80 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 120 }); }}
      disabled={state !== 'default'}
    >
      <Text style={[styles.optionLabel, { color: textColor, opacity: state === 'faded' ? 0.45 : 1 }]}>
        {label}
      </Text>
      <Text style={[styles.optionText, { color: textColor, opacity: state === 'faded' ? 0.45 : 1 }]}>
        {text}
      </Text>
    </AnimatedPressable>
  );
}

export default function QuizScreen({ route, navigation }: Props) {
  const { courseId, courseName } = route.params;
  const { user } = useAuth();
  const reduceMotion = useReducedMotion() ?? false;

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('quiz_questions')
        .select('id, question, options, correct_answer')
        .eq('course_id', courseId)
        .eq('user_id', user!.id)
        .order('created_at');
      setQuestions(data ?? []);
      setLoading(false);
    })();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const current = questions[currentIndex];

  const handleAnswer = (option: string) => {
    if (selected !== null) return;
    const isCorrect = option === current.correct_answer;
    const newScore = isCorrect ? score + 1 : score;
    setSelected(option);
    if (isCorrect) setScore(newScore);

    timer.current = setTimeout(() => {
      const next = currentIndex + 1;
      if (next >= questions.length) {
        navigation.replace('QuizResult', { score: newScore, total: questions.length, courseId, courseName });
      } else {
        setCurrentIndex(next);
        setSelected(null);
      }
    }, ADVANCE_DELAY);
  };

  const getState = (option: string): AnswerState => {
    if (selected === null) return 'default';
    if (option === current.correct_answer) return 'correct';
    if (option === selected) return 'wrong';
    return 'faded';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Inga quizfrågor</Text>
        <Text style={styles.emptySubtitle}>
          Frågor skapas automatiskt när du genererar studiematerial från ett dokument.
        </Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Tillbaka</Text>
        </Pressable>
      </View>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      header={
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.counter}>{currentIndex + 1}/{questions.length}</Text>
        </View>
      }
    >
      {/* Question card */}
      <View style={styles.questionCard}>
        <Text style={styles.questionLabel}>FRÅGA</Text>
        <Text style={styles.questionText}>{current.question}</Text>
      </View>

      {/* Options */}
      <View style={styles.options}>
        {current.options.map((opt, i) => (
          <OptionButton
            key={i}
            label={OPTION_LABELS[i]}
            text={opt}
            state={getState(opt)}
            onPress={() => handleAnswer(opt)}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, backgroundColor: colors.paper,
    alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.md,
  },
  emptyTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.lg, color: colors.ink, textAlign: 'center' },
  emptySubtitle: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.inkMuted, textAlign: 'center' },
  backBtn: { marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.button },
  backBtnText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  closeBtn: { padding: spacing.xs },
  closeBtnText: { fontFamily: fontFamily.body, fontSize: fontSize.lg, color: colors.inkMuted },
  progressBg: {
    flex: 1, height: 6, backgroundColor: colors.cardBorder, borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.ink, borderRadius: 3 },
  counter: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, minWidth: 32, textAlign: 'right' },

  content: { padding: spacing.md, gap: spacing.lg },

  questionCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.card,
    padding: spacing.xl, gap: spacing.sm, minHeight: 140,
    justifyContent: 'center',
  },
  questionLabel: {
    fontFamily: fontFamily.mono, fontSize: fontSize.xs,
    color: colors.inkMuted, letterSpacing: 1.5,
  },
  questionText: {
    fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.lg,
    color: colors.ink, lineHeight: 28,
  },

  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, borderWidth: 1.5, borderRadius: radius.button, gap: spacing.sm,
  },
  optionLabel: {
    fontFamily: fontFamily.mono, fontSize: fontSize.sm,
    width: 24, textAlign: 'center',
  },
  optionText: {
    flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.base, lineHeight: 22,
  },
});
