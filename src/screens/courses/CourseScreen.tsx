import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { HighlighterText } from '../../components/HighlighterText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Flashcard = {
  id: string;
  question: string;
  answer: string;
  next_review_at: string;
};

type Props = NativeStackScreenProps<AppStackParamList, 'Course'>;

export default function CourseScreen({ route, navigation }: Props) {
  const { courseId, courseName } = route.params;
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dueCount, setDueCount] = useState(0);

  const fetchCards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('flashcards')
      .select('id, question, answer, next_review_at')
      .eq('course_id', courseId)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) Alert.alert('Fel', error.message);
    else {
      const all = data ?? [];
      setCards(all);
      setDueCount(all.filter((c) => new Date(c.next_review_at) <= new Date()).length);
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchCards(); }, []));

  const handleDelete = (id: string) => {
    Alert.alert('Ta bort kort?', 'Det går inte att ångra.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('flashcards').delete().eq('id', id);
          setCards((prev) => prev.filter((c) => c.id !== id));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <HighlighterText textStyle={styles.title}>{courseName}</HighlighterText>
        {dueCount > 0 && (
          <PrimaryButton
            label={`Repetera  (${dueCount})`}
            onPress={() => navigation.navigate('Review', { courseId, courseName })}
          />
        )}
        {dueCount === 0 && cards.length > 0 && (
          <Text style={styles.doneText}>Inga kort att repetera idag</Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.ink} />
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Inga kort ännu</Text>
              <Text style={styles.emptySubtitle}>Tryck på + för att skapa ditt första kort</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.question} numberOfLines={2}>{item.question}</Text>
                <Text style={styles.answer} numberOfLines={1}>{item.answer}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('CreateFlashcard', { courseId, cardId: item.id })
                  }
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionText}>Redigera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={styles.actionBtn}
                >
                  <Text style={[styles.actionText, { color: colors.rust }]}>Ta bort</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateFlashcard', { courseId })}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl'],
    color: colors.ink,
  },
  doneText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
  },
  loader: { marginTop: spacing['2xl'] },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  empty: { alignItems: 'center', marginTop: spacing['2xl'], gap: spacing.sm },
  emptyTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  emptySubtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    marginBottom: spacing.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardContent: { flex: 1, gap: spacing.xs },
  question: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  answer: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
  },
  cardActions: { flexDirection: 'column', gap: spacing.xs, alignItems: 'flex-end' },
  actionBtn: { paddingVertical: 2, paddingHorizontal: spacing.xs },
  actionText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.ink,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: colors.paper, fontSize: 28, lineHeight: 32, fontFamily: fontFamily.body },
});
