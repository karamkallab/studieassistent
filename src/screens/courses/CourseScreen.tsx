import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { HighlighterText } from '../../components/HighlighterText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';
import { getUsage, FREE_UPLOADS_PER_MONTH } from '../../lib/limits';

type Flashcard = { id: string; question: string; answer: string; next_review_at: string };
type Document = { id: string; name: string; generated_at: string | null };

type Props = NativeStackScreenProps<AppStackParamList, 'Course'>;

export default function CourseScreen({ route, navigation }: Props) {
  const { courseId, courseName } = route.params;
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [quizCount, setQuizCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [uploadsRemaining, setUploadsRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null); // document_id being generated

  const fetchAll = useCallback(async () => {
    try {
      const [
        { data: cardData },
        { data: docData },
        { count: qCount },
        usage,
      ] = await Promise.all([
        supabase.from('flashcards').select('id, question, answer, next_review_at')
          .eq('course_id', courseId).eq('user_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('documents').select('id, name, generated_at')
          .eq('course_id', courseId).eq('user_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('quiz_questions').select('id', { count: 'exact', head: true })
          .eq('course_id', courseId).eq('user_id', user!.id),
        getUsage(user!.id),
      ]);

      const allCards = cardData ?? [];
      setCards(allCards);
      setDueCount(allCards.filter((c) => new Date(c.next_review_at) <= new Date()).length);
      setDocuments(docData ?? []);
      setQuizCount(qCount ?? 0);
      setUploadsRemaining(usage.uploadsRemaining);
    } catch {
      Alert.alert('Fel', 'Kunde inte hämta kursdata. Kontrollera din internetanslutning.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId, user]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const handleGenerate = async (docId: string) => {
    setGenerating(docId);
    try {
      const { error } = await supabase.functions.invoke('generate-study-material', {
        body: { document_id: docId },
      });
      if (error) throw new Error(error.message);
      await fetchAll();
      Alert.alert('Klart!', 'Studiematerial har genererats.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Genereringen misslyckades.';
      Alert.alert('Fel', msg);
    } finally {
      setGenerating(null);
    }
  };

  const handleDeleteCard = (id: string) => {
    Alert.alert('Ta bort kort?', 'Det går inte att ångra.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort', style: 'destructive',
        onPress: async () => {
          await supabase.from('flashcards').delete().eq('id', id);
          setCards((p) => p.filter((c) => c.id !== id));
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={cards}
      keyExtractor={(c) => c.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchAll(); }}
          tintColor={colors.ink}
          colors={[colors.ink]}
        />
      }
      ListHeaderComponent={
        <View style={styles.headerArea}>
          {/* Kursrubrik */}
          <HighlighterText textStyle={styles.title}>{courseName}</HighlighterText>

          {/* Studiematerial-sektion */}
          {documents.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DOKUMENT</Text>
              {documents.map((doc) => (
                <View key={doc.id} style={styles.docRow}>
                  <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                  {doc.generated_at ? (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Summary', { documentId: doc.id, courseId })}
                    >
                      <Text style={styles.docAction}>Sammanfattning</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      disabled={generating === doc.id}
                      onPress={() => handleGenerate(doc.id)}
                    >
                      <Text style={[styles.docAction, { color: colors.sage }]}>
                        {generating === doc.id ? 'Genererar...' : 'Generera material'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Studieverktyg */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>STUDIEVERKTYG</Text>
            <View style={styles.toolGrid}>
              {dueCount > 0 && (
                <TouchableOpacity
                  style={[styles.toolCard, { backgroundColor: colors.ink }]}
                  onPress={() => navigation.navigate('Review', { courseId, courseName })}
                >
                  <Text style={[styles.toolCount, { color: colors.highlight }]}>{dueCount}</Text>
                  <Text style={[styles.toolLabel, { color: colors.paper }]}>att repetera</Text>
                </TouchableOpacity>
              )}
              {cards.length > 0 && dueCount === 0 && (
                <View style={[styles.toolCard, { backgroundColor: colors.cardBg }]}>
                  <Text style={styles.toolCount}>{cards.length}</Text>
                  <Text style={styles.toolLabel}>flashkort</Text>
                  <Text style={styles.toolDone}>Klart idag!</Text>
                </View>
              )}
              {quizCount > 0 && (
                <TouchableOpacity
                  style={styles.toolCard}
                  onPress={() => navigation.navigate('Quiz', { courseId, courseName })}
                >
                  <Text style={styles.toolCount}>{quizCount}</Text>
                  <Text style={styles.toolLabel}>quiz-frågor</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.toolCard}
                onPress={() => navigation.navigate('Mindmap', { courseId, courseName })}
              >
                <Text style={styles.toolIcon}>⬡</Text>
                <Text style={styles.toolLabel}>tankekarta</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Kvot-indikator */}
          {uploadsRemaining !== null && (
            <Text style={styles.quota}>
              {uploadsRemaining} av {FREE_UPLOADS_PER_MONTH} uppladdningar kvar denna månad
            </Text>
          )}

          {/* Flashkort-sektion header */}
          <View style={styles.cardSectionHeader}>
            <Text style={styles.sectionLabel}>
              FLASHKORT {cards.length > 0 ? `(${cards.length})` : ''}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('CreateFlashcard', { courseId })}>
              <Text style={styles.addCardText}>+ Nytt kort</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyCards}>
          <Text style={styles.emptyCardsText}>Inga flashkort ännu.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateFlashcard', { courseId })}>
            <Text style={styles.emptyCardsLink}>Skapa ditt första kort</Text>
          </TouchableOpacity>
        </View>
      }
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.question} numberOfLines={2}>{item.question}</Text>
            <Text style={styles.answer} numberOfLines={1}>{item.answer}</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateFlashcard', { courseId, cardId: item.id })}
              style={styles.actionBtn}
            >
              <Text style={styles.actionText}>Redigera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteCard(item.id)} style={styles.actionBtn}>
              <Text style={[styles.actionText, { color: colors.rust }]}>Ta bort</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },
  headerArea: { padding: spacing.md, gap: spacing.lg },
  title: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },

  section: { gap: spacing.sm },
  sectionLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },

  docRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.button, padding: spacing.md,
  },
  docName: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.ink, marginRight: spacing.sm },
  docAction: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.ink, textDecorationLine: 'underline' },

  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  toolCard: {
    flex: 1, minWidth: 100, backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.card,
    padding: spacing.md, alignItems: 'center', gap: spacing.xs,
  },
  toolCount: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },
  toolLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted },
  toolIcon: { fontSize: fontSize.xl, color: colors.ink },
  toolDone: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.sage },

  quota: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted },

  cardSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addCardText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.ink },

  list: { paddingBottom: spacing['2xl'] },
  emptyCards: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyCardsText: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.inkMuted },
  emptyCardsLink: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink, textDecorationLine: 'underline' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.card, marginHorizontal: spacing.md,
    marginBottom: spacing.sm, padding: spacing.md, gap: spacing.sm,
  },
  cardContent: { flex: 1, gap: spacing.xs },
  question: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },
  answer: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted },
  cardActions: { flexDirection: 'column', gap: spacing.xs, alignItems: 'flex-end' },
  actionBtn: { paddingVertical: 2, paddingHorizontal: spacing.xs },
  actionText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink, textDecorationLine: 'underline' },
});
