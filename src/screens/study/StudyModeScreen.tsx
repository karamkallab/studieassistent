import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { HighlighterText } from '../../components/HighlighterText';
import { colors, fontFamily, fontSize, spacing, radius, cardRotation } from '../../theme/tokens';

type Props = NativeStackScreenProps<AppStackParamList, 'StudyMode'>;

const MODES = [
  {
    id: 'review',
    title: 'Flashcards',
    desc: 'Flippa kort och betygsätt dig själv',
    emoji: '🃏',
    color: colors.ink,
  },
  {
    id: 'write',
    title: 'Skriv',
    desc: 'Testa minnet — skriv svaret med egna ord',
    emoji: '✏️',
    color: colors.ink,
  },
  {
    id: 'match',
    title: 'Matcha',
    desc: 'Para ihop frågor och svar på tid',
    emoji: '⚡',
    color: colors.ink,
  },
  {
    id: 'quiz',
    title: 'Quiz',
    desc: 'Välj rätt svar bland fyra alternativ',
    emoji: '📝',
    color: colors.ink,
  },
] as const;

export default function StudyModeScreen({ route, navigation }: Props) {
  const { courseId, courseName } = route.params;
  const { user } = useAuth();
  const [dueCount, setDueCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: cards }, { count: qc }] = await Promise.all([
        supabase.from('flashcards').select('id, next_review_at')
          .eq('course_id', courseId).eq('user_id', user!.id),
        supabase.from('quiz_questions').select('id', { count: 'exact', head: true })
          .eq('course_id', courseId).eq('user_id', user!.id),
      ]);
      const all = cards ?? [];
      setTotalCards(all.length);
      setDueCount(all.filter(c => new Date(c.next_review_at) <= new Date()).length);
      setQuizCount(qc ?? 0);
      setLoading(false);
    })();
  }, []);

  const handleMode = (id: typeof MODES[number]['id']) => {
    switch (id) {
      case 'review': navigation.navigate('Review', { courseId, courseName }); break;
      case 'write':  navigation.navigate('Write',  { courseId, courseName }); break;
      case 'match':  navigation.navigate('Match',  { courseId, courseName }); break;
      case 'quiz':   navigation.navigate('Quiz',   { courseId, courseName }); break;
    }
  };

  const subtitles: Record<string, string> = {
    review: dueCount > 0 ? `${dueCount} kort att repetera idag` : `${totalCards} kort totalt`,
    write:  totalCards > 0 ? `${totalCards} kort` : 'Inga kort ännu',
    match:  totalCards >= 2 ? `Välj 6 kort att matcha` : 'Behöver minst 2 kort',
    quiz:   quizCount > 0 ? `${quizCount} frågor` : 'Inga frågor ännu',
  };

  const disabled: Record<string, boolean> = {
    review: totalCards === 0,
    write:  totalCards === 0,
    match:  totalCards < 2,
    quiz:   quizCount === 0,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <HighlighterText textStyle={styles.title}>{courseName}</HighlighterText>
      <Text style={styles.subtitle}>Välj pluggläge</Text>

      {loading ? <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} /> : (
        <View style={styles.grid}>
          {MODES.map((mode, i) => (
            <TouchableOpacity
              key={mode.id}
              style={[
                styles.card,
                { transform: [{ rotate: `${cardRotation(i)}deg` }] },
                disabled[mode.id] && styles.cardDisabled,
              ]}
              onPress={() => handleMode(mode.id)}
              disabled={disabled[mode.id]}
              activeOpacity={0.8}
            >
              <Text style={styles.emoji}>{mode.emoji}</Text>
              <Text style={styles.modeName}>{mode.title}</Text>
              <Text style={styles.modeDesc}>{mode.desc}</Text>
              <Text style={styles.modeCount}>{subtitles[mode.id]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing['2xl'] },
  title: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.inkMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    width: '47%',
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.card,
    padding: spacing.lg, gap: spacing.sm,
  },
  cardDisabled: { opacity: 0.4 },
  emoji: { fontSize: 28 },
  modeName: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.lg, color: colors.ink },
  modeDesc: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted, lineHeight: 18 },
  modeCount: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted },
});
