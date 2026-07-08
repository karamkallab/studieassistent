import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useConfirmDialog } from '../../components/ConfirmDialog';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AnimatedProgressBar } from '../../components/AnimatedProgressBar';
import { BookIcon } from '../../components/icons/BookIcon';
import { StackIcon } from '../../components/icons/StackIcon';
import { PencilIcon } from '../../components/icons/PencilIcon';
import { ShuffleIcon } from '../../components/icons/ShuffleIcon';
import { CheckCircleIcon } from '../../components/icons/CheckCircleIcon';
import { UploadIcon } from '../../components/icons/UploadIcon';
import { FileIcon } from '../../components/icons/FileIcon';
import { HexagonIcon } from '../../components/icons/HexagonIcon';
import { ChevronRightIcon } from '../../components/icons/ChevronRightIcon';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';
import { getUsage, canUpload, incrementUploads, FREE_UPLOADS_PER_MONTH } from '../../lib/limits';

type Flashcard = { id: string; question: string; answer: string; next_review_at: string };
type Document = { id: string; name: string; generated_at: string | null };
type QuizQuestion = { id: string; question: string; correct_answer: string };

type Props = NativeStackScreenProps<AppStackParamList, 'Course'>;

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default function CourseScreen({ route, navigation }: Props) {
  const { courseId, courseName } = route.params;
  const { user } = useAuth();
  const [courseColor, setCourseColor] = useState(colors.ink);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizCount, setQuizCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [uploadsRemaining, setUploadsRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null); // document_id being generated
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const { confirm, element: confirmDialog } = useConfirmDialog();

  const fetchAll = useCallback(async () => {
    try {
      const [
        { data: courseData },
        { data: cardData },
        { data: docData },
        { data: quizData },
        usage,
      ] = await Promise.all([
        supabase.from('courses').select('color').eq('id', courseId).single(),
        supabase.from('flashcards').select('id, question, answer, next_review_at')
          .eq('course_id', courseId).eq('user_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('documents').select('id, name, generated_at')
          .eq('course_id', courseId).eq('user_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('quiz_questions').select('id, question, correct_answer')
          .eq('course_id', courseId).eq('user_id', user!.id).order('created_at'),
        getUsage(user!.id),
      ]);

      if (courseData?.color) setCourseColor(courseData.color);
      const allCards = cardData ?? [];
      setCards(allCards);
      setDueCount(allCards.filter((c) => new Date(c.next_review_at) <= new Date()).length);
      setDocuments(docData ?? []);
      const qs = (quizData ?? []) as QuizQuestion[];
      setQuizQuestions(qs);
      setQuizCount(qs.length);
      setUploadsRemaining(usage.uploadsRemaining);
    } catch {
      confirm('Fel', 'Kunde inte hämta kursdata. Kontrollera din internetanslutning.', [{ text: 'OK' }]);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Genereringen misslyckades.';
      confirm('Fel', msg, [{ text: 'OK' }]);
    } finally {
      setGenerating(null);
    }
  };

  const handleUploadPdf = async () => {
    const ok = await canUpload(user!.id);
    if (!ok) {
      confirm(
        'Uppladdningsgräns nådd',
        `Du har använt alla ${FREE_UPLOADS_PER_MONTH} uppladdningar för den här månaden. Uppgradera till Premium för obegränsade uppladdningar.`,
        [
          { text: 'Avbryt', style: 'cancel' },
          { text: 'Se Premium', onPress: () => navigation.navigate('Upgrade') },
        ],
      );
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) return;
    const file = result.assets[0];

    setUploadingPdf(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const filePath = `${user!.id}/${courseId}/${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(filePath, decodeBase64(base64), { contentType: 'application/pdf' });
      if (uploadErr) throw uploadErr;

      const { data: doc, error: docErr } = await supabase
        .from('documents')
        .insert({ course_id: courseId, user_id: user!.id, name: file.name, storage_path: filePath, file_type: 'pdf' })
        .select()
        .single();
      if (docErr) throw docErr;

      await incrementUploads(user!.id);
      await fetchAll();
      await handleGenerate(doc.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Uppladdningen misslyckades.';
      confirm('Fel', msg, [{ text: 'OK' }]);
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleDeleteQuizQuestion = (id: string) => {
    confirm('Ta bort fråga?', 'Det går inte att ångra.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort', style: 'destructive',
        onPress: async () => {
          const { data, error } = await supabase.from('quiz_questions').delete().eq('id', id).select('id');
          if (error || !data?.length) {
            console.error('Kunde inte ta bort frågan:', error);
            confirm('Fel', 'Kunde inte ta bort frågan. Kontrollera din anslutning eller behörigheter.', [{ text: 'OK' }]);
          } else {
            setQuizQuestions((p) => p.filter((q) => q.id !== id));
          }
        },
      },
    ]);
  };

  const handleDeleteCard = (id: string) => {
    confirm('Ta bort kort?', 'Det går inte att ångra.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort', style: 'destructive',
        onPress: async () => {
          const { data, error } = await supabase.from('flashcards').delete().eq('id', id).select('id');
          if (error || !data?.length) {
            console.error('Kunde inte ta bort kortet:', error);
            confirm('Fel', 'Kunde inte ta bort kortet. Kontrollera din anslutning eller behörigheter.', [{ text: 'OK' }]);
          } else {
            setCards((p) => p.filter((c) => c.id !== id));
          }
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

  const progress = cards.length > 0 ? (cards.length - dueCount) / cards.length : null;
  const progressPct = progress != null ? Math.round(progress * 100) : null;

  const MODES = [
    {
      id: 'review' as const, title: 'Flashcards', desc: 'REPETITION · SM-2', Icon: StackIcon,
      disabled: cards.length === 0,
      onPress: () => navigation.navigate('Review', { courseId, courseName }),
    },
    {
      id: 'write' as const, title: 'Skrivläge', desc: 'TESTA DIG SJÄLV', Icon: PencilIcon,
      disabled: cards.length === 0,
      onPress: () => navigation.navigate('Write', { courseId, courseName }),
    },
    {
      id: 'match' as const, title: 'Matcha', desc: `${cards.length} KORT · SNABBAST TID`, Icon: ShuffleIcon,
      disabled: cards.length < 2,
      onPress: () => navigation.navigate('Match', { courseId, courseName }),
    },
    {
      id: 'quiz' as const, title: 'Quiz', desc: 'FLERVAL', Icon: CheckCircleIcon,
      disabled: quizCount === 0,
      onPress: () => navigation.navigate('Quiz', { courseId, courseName }),
    },
  ];

  return (
    <ScreenContainer
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchAll(); }}
          tintColor={colors.ink}
        />
      }
      overlay={confirmDialog}
    >
      <View style={styles.headerArea}>
        {/* Kursrubrik */}
        <View style={styles.titleRow}>
          <View style={[styles.iconBadge, { backgroundColor: courseColor }]}>
            <BookIcon size={26} color={colors.paper} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{courseName}</Text>
            <Text style={styles.meta}>
              {documents.length} DOKUMENT · {cards.length} KORT · {dueCount} DUE
            </Text>
          </View>
        </View>

        {/* Kursframsteg */}
        {progressPct != null && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>KURSFRAMSTEG</Text>
              <Text style={styles.progressPct}>{progressPct}%</Text>
            </View>
            <AnimatedProgressBar progress={progress!} color={courseColor} />
          </View>
        )}

        {/* Studielägen */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>STUDIELÄGEN</Text>
          <View style={styles.modeGrid}>
            {MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[styles.modeCard, mode.disabled && styles.modeCardDisabled]}
                onPress={mode.onPress}
                disabled={mode.disabled}
                activeOpacity={0.85}
              >
                <mode.Icon size={22} color={colors.ink} />
                <Text style={styles.modeTitle}>{mode.title}</Text>
                <Text style={styles.modeDesc}>{mode.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tankekarta */}
        <TouchableOpacity
          style={styles.toolRow}
          onPress={() => navigation.navigate('Mindmap', { courseId, courseName })}
          activeOpacity={0.85}
        >
          <HexagonIcon size={18} color={colors.ink} />
          <Text style={styles.toolRowTxt}>Tankekarta</Text>
          <ChevronRightIcon size={16} color={colors.inkMuted} />
        </TouchableOpacity>

        {/* Material */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>MATERIAL</Text>
            <TouchableOpacity
              style={styles.uploadPill}
              onPress={handleUploadPdf}
              disabled={uploadingPdf}
              activeOpacity={0.85}
            >
              {uploadingPdf ? (
                <ActivityIndicator size="small" color={colors.paper} />
              ) : (
                <UploadIcon size={14} color={colors.paper} />
              )}
              <Text style={styles.uploadPillTxt}>{uploadingPdf ? 'Laddar upp…' : 'Ladda upp PDF'}</Text>
            </TouchableOpacity>
          </View>
          {documents.length === 0 ? (
            <Text style={styles.emptyTxt}>Inga dokument ännu.</Text>
          ) : (
            documents.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={[styles.docCard, { borderLeftWidth: 3, borderLeftColor: courseColor }]}
                onPress={() => (doc.generated_at
                  ? navigation.navigate('Summary', { documentId: doc.id, courseId })
                  : handleGenerate(doc.id))}
                disabled={generating === doc.id}
                activeOpacity={0.85}
              >
                <View style={styles.docIconBox}>
                  <FileIcon size={18} color={colors.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                  <Text style={styles.docMeta}>
                    {generating === doc.id ? 'GENERERAR…' : doc.generated_at ? 'AI-BEARBETAD' : 'VÄNTAR'}
                  </Text>
                </View>
                <ChevronRightIcon size={16} color={colors.inkMuted} />
              </TouchableOpacity>
            ))
          )}
          {uploadsRemaining !== null && (
            <Text style={styles.quota}>
              {uploadsRemaining} av {FREE_UPLOADS_PER_MONTH} uppladdningar kvar denna månad
            </Text>
          )}
        </View>

        {/* Quiz-frågor */}
        {quizQuestions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>QUIZ-FRÅGOR ({quizQuestions.length})</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Quiz', { courseId, courseName })}>
                <Text style={styles.addCardText}>Starta quiz</Text>
              </TouchableOpacity>
            </View>
            {quizQuestions.map((q) => (
              <View key={q.id} style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.question} numberOfLines={2}>{q.question}</Text>
                  <Text style={styles.answer} numberOfLines={1}>Svar: {q.correct_answer}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteQuizQuestion(q.id)} style={styles.actionBtn}>
                  <Text style={[styles.actionText, { color: colors.rust }]}>Ta bort</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Flashkort-sektion header */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>
            FLASHKORT {cards.length > 0 ? `(${cards.length})` : ''}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateFlashcard', { courseId })}>
            <Text style={styles.addCardText}>+ Nytt kort</Text>
          </TouchableOpacity>
        </View>
      </View>

      {cards.length === 0 ? (
        <View style={styles.emptyCards}>
          <Text style={styles.emptyCardsText}>Inga flashkort ännu.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateFlashcard', { courseId })}>
            <Text style={styles.emptyCardsLink}>Skapa ditt första kort</Text>
          </TouchableOpacity>
        </View>
      ) : (
        cards.map((item) => (
          <View key={item.id} style={styles.card}>
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
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },
  headerArea: { padding: spacing.md, gap: spacing.lg },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBadge: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },
  meta: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, marginTop: 2, letterSpacing: 0.3 },

  section: { gap: spacing.sm },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },
  progressPct: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.ink },

  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  modeCard: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.card,
    padding: spacing.md, gap: spacing.xs,
  },
  modeCardDisabled: { opacity: 0.4 },
  modeTitle: { fontFamily: fontFamily.serifRegular, fontSize: fontSize.lg, color: colors.ink, marginTop: spacing.xs },
  modeDesc: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 0.3 },

  toolRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.card, padding: spacing.md,
  },
  toolRowTxt: { flex: 1, fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },

  uploadPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.ink, borderRadius: 20,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
  },
  uploadPillTxt: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.paper },

  docCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.button, padding: spacing.md,
  },
  docIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center',
  },
  docName: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },
  docMeta: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, marginTop: 2, letterSpacing: 0.5 },

  quota: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted },

  addCardText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.ink },

  list: { paddingBottom: spacing['2xl'] },
  emptyTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted },
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
