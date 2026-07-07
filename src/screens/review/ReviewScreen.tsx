import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { sm2 } from '../../lib/sm2';
import { updateStreak } from '../../lib/streak';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Flashcard = {
  id: string;
  question: string;
  answer: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
};

type Props = NativeStackScreenProps<AppStackParamList, 'Review'>;

const GRADES = [
  { label: 'Igen', grade: 2, color: colors.rust },
  { label: 'Svårt', grade: 3, color: colors.inkMuted },
  { label: 'Bra', grade: 4, color: colors.ink },
  { label: 'Lätt', grade: 5, color: colors.sage },
] as const;

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Single flashcard with flip + exit animations ───────────────────────────

interface CardProps {
  card: Flashcard;
  index: number;
  total: number;
  onGrade: (grade: number) => void;
  reduceMotion: boolean;
}

function FlashCard({ card, index, total, onGrade, reduceMotion }: CardProps) {
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useSharedValue(0);
  const cardX = useSharedValue(reduceMotion ? 0 : 40);
  const cardOpacity = useSharedValue(reduceMotion ? 1 : 0);

  // Entrance
  useEffect(() => {
    if (reduceMotion) return;
    cardX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.ease) });
    cardOpacity.value = withTiming(1, { duration: 220 });
  }, []);

  const handleFlip = () => {
    if (flipped) return;
    setFlipped(true);
    if (reduceMotion) {
      flipAnim.value = 1;
    } else {
      flipAnim.value = withTiming(1, { duration: 350, easing: Easing.inOut(Easing.ease) });
    }
  };

  const handleGrade = useCallback((grade: number) => {
    const isGood = grade >= 4;
    const targetX = isGood ? SCREEN_W : -SCREEN_W;

    const finish = () => onGrade(grade);

    if (reduceMotion) {
      finish();
      return;
    }
    cardX.value = withTiming(targetX, { duration: 250 });
    cardOpacity.value = withTiming(0, { duration: 200 }, () => runOnJS(finish)());
  }, [onGrade]);

  // Container (entrance + exit)
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cardX.value }],
    opacity: cardOpacity.value,
    borderColor:
      cardX.value > 20 ? colors.sage : cardX.value < -20 ? colors.rust : colors.cardBorder,
  }));

  // Front face (question)
  const frontStyle = useAnimatedStyle(() => {
    const rotate = interpolate(flipAnim.value, [0, 1], [0, 180]);
    const opacity = interpolate(flipAnim.value, [0, 0.45, 0.5], [1, 1, 0], Extrapolation.CLAMP);
    return { transform: [{ rotateY: `${rotate}deg` }], opacity };
  });

  // Back face (answer)
  const backStyle = useAnimatedStyle(() => {
    const rotate = interpolate(flipAnim.value, [0, 1], [-180, 0]);
    const opacity = interpolate(flipAnim.value, [0.5, 0.55, 1], [0, 1, 1], Extrapolation.CLAMP);
    return { transform: [{ rotateY: `${rotate}deg` }], opacity };
  });

  return (
    <View style={styles.cardWrapper}>
      {/* Progress */}
      <Text style={styles.counter}>{index + 1} av {total}</Text>

      {/* Card */}
      <Pressable onPress={handleFlip} disabled={flipped}>
        <Animated.View style={[styles.card, containerStyle]}>
          {/* Front */}
          <Animated.View style={[styles.face, frontStyle]}>
            <Text style={styles.sideLabel}>FRÅGA</Text>
            <Text style={styles.cardText}>{card.question}</Text>
          </Animated.View>

          {/* Back */}
          <Animated.View
            style={[
              { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
              styles.face,
              backStyle,
            ]}
          >
            <Text style={styles.sideLabel}>SVAR</Text>
            <Text style={styles.cardText}>{card.answer}</Text>
          </Animated.View>
        </Animated.View>
      </Pressable>

      {/* Hint / grade buttons */}
      {!flipped ? (
        <Text style={styles.hint}>Tryck på kortet för att se svaret</Text>
      ) : (
        <View style={styles.grades}>
          {GRADES.map(({ label, grade, color }) => (
            <Pressable
              key={grade}
              style={[styles.gradeBtn, { borderColor: color }]}
              onPress={() => handleGrade(grade)}
            >
              <Text style={[styles.gradeLabel, { color }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Review screen ────────────────────────────────────────────────────────────

export default function ReviewScreen({ route, navigation }: Props) {
  const { courseId, courseName } = route.params;
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardKey, setCardKey] = useState(0);
  const [graded, setGraded] = useState(0);
  const [loading, setLoading] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const fetchDue = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('flashcards')
        .select('id, question, answer, ease_factor, interval_days, repetitions')
        .eq('course_id', courseId)
        .eq('user_id', user!.id)
        .lte('next_review_at', now)
        .order('next_review_at', { ascending: true });

      setCards(data ?? []);
      setLoading(false);
    };
    fetchDue();
  }, []);

  const handleGrade = useCallback(async (grade: number) => {
    const card = cards[currentIndex];
    const result = sm2(card.ease_factor, card.interval_days, card.repetitions, grade);

    await supabase.from('flashcards').update({
      ease_factor: result.easeFactor,
      interval_days: result.intervalDays,
      repetitions: result.repetitions,
      next_review_at: result.nextReviewAt.toISOString(),
    }).eq('id', card.id);

    const next = currentIndex + 1;
    const newGraded = graded + 1;

    if (next >= cards.length) {
      // All done — update streak and navigate
      const streakDays = await updateStreak(user!.id);
      navigation.replace('ReviewComplete', { count: newGraded, streakDays });
    } else {
      setGraded(newGraded);
      setCurrentIndex(next);
      setCardKey((k) => k + 1);
    }
  }, [cards, currentIndex, graded]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Hämtar kort...</Text>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Inga kort att repetera!</Text>
        <Text style={styles.emptySubtitle}>Kom tillbaka imorgon eller skapa nya kort.</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Tillbaka</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScreenContainer
      scroll={false}
      header={
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
          <Text style={styles.courseName} numberOfLines={1}>{courseName}</Text>
          <View style={styles.closeBtnPlaceholder} />
        </View>
      }
    >
      <FlashCard
        key={cardKey}
        card={cards[currentIndex]}
        index={currentIndex}
        total={cards.length}
        onGrade={handleGrade}
        reduceMotion={reduceMotion ?? false}
      />
    </ScreenContainer>
  );
}

const CARD_H = 260;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  closeBtn: { padding: spacing.sm },
  closeBtnText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.lg,
    color: colors.inkMuted,
  },
  closeBtnPlaceholder: { width: 36 },
  courseName: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  loadingText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
  },
  emptyTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.lg,
    color: colors.ink,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.button,
  },
  backBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.base,
    color: colors.ink,
  },

  // Card
  cardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  counter: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    letterSpacing: 0.5,
  },
  card: {
    width: SCREEN_W - spacing.xl * 2,
    minHeight: CARD_H,
    backgroundColor: colors.cardBg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  face: {
    width: '100%',
    minHeight: CARD_H,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  sideLabel: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    letterSpacing: 1.5,
  },
  cardText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xl,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 32,
  },
  hint: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    letterSpacing: 0.5,
  },
  grades: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gradeBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.button,
    alignItems: 'center',
  },
  gradeLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.sm,
  },
});
