import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { CourseCard } from '../../components/CourseCard';
import { useConfirmDialog } from '../../components/ConfirmDialog';
import { PressableScale } from '../../components/PressableScale';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, fontFamily, fontSize, spacing } from '../../theme/tokens';

type Course = { id: string; name: string; description: string | null; created_at: string; color: string };

export default function CourseListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressByCourse, setProgressByCourse] = useState<Record<string, number>>({});
  const [cardCountByCourse, setCardCountByCourse] = useState<Record<string, number>>({});
  const [dueCountByCourse, setDueCountByCourse] = useState<Record<string, number>>({});
  const [docCountByCourse, setDocCountByCourse] = useState<Record<string, number>>({});
  const { confirm, element: confirmDialog } = useConfirmDialog();

  const fetchAll = useCallback(async () => {
    try {
      const [{ data, error }, { data: cardData }, { data: docData }] = await Promise.all([
        supabase.from('courses').select('*').order('created_at', { ascending: false }),
        supabase.from('flashcards').select('course_id, next_review_at').eq('user_id', user!.id),
        supabase.from('documents').select('course_id').eq('user_id', user!.id),
      ]);
      if (error) confirm('Fel', 'Kunde inte hämta kurser. Kontrollera din internetanslutning.', [{ text: 'OK' }]);
      else setCourses(data ?? []);

      const now = new Date();
      const totals = new Map<string, { total: number; notOverdue: number }>();
      for (const card of cardData ?? []) {
        const entry = totals.get(card.course_id) ?? { total: 0, notOverdue: 0 };
        entry.total++;
        if (new Date(card.next_review_at) > now) entry.notOverdue++;
        totals.set(card.course_id, entry);
      }
      const progress: Record<string, number> = {};
      const cardCounts: Record<string, number> = {};
      const dueCounts: Record<string, number> = {};
      for (const [courseId, { total, notOverdue }] of totals) {
        progress[courseId] = notOverdue / total;
        cardCounts[courseId] = total;
        dueCounts[courseId] = total - notOverdue;
      }
      setProgressByCourse(progress);
      setCardCountByCourse(cardCounts);
      setDueCountByCourse(dueCounts);

      const docCounts: Record<string, number> = {};
      for (const doc of docData ?? []) {
        docCounts[doc.course_id] = (docCounts[doc.course_id] ?? 0) + 1;
      }
      setDocCountByCourse(docCounts);
    } catch {
      confirm('Fel', 'Något gick fel. Försök igen.', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchAll(); }, [fetchAll]));

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const handleDeleteCourse = (item: Course) => {
    confirm(
      'Ta bort kurs?',
      `"${item.name}" och allt innehåll (flashkort, quiz, mindmaps) raderas permanent.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            const { data, error } = await supabase.from('courses').delete().eq('id', item.id).select('id');
            if (error || !data?.length) {
              console.error('Kunde inte ta bort kursen:', error);
              confirm('Fel', 'Kunde inte ta bort kursen. Kontrollera din anslutning eller behörigheter.', [{ text: 'OK' }]);
            } else {
              setCourses((prev) => prev.filter((c) => c.id !== item.id));
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.ink}
          colors={[colors.ink]}
        />
      }
      header={
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.caption}>
                {courses.length} {courses.length === 1 ? 'AKTIV KURS' : 'AKTIVA KURSER'}
              </Text>
              <Text style={styles.heading}>Kurser</Text>
            </View>
            <PressableScale
              style={styles.addBtn}
              onPress={() => navigation.navigate('CreateCourse')}
            >
              <Text style={styles.addBtnText}>+</Text>
            </PressableScale>
          </View>
        </View>
      }
    >
      {courses.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Inga kurser ännu</Text>
          <Text style={styles.emptySubtitle}>
            Skapa din första kurs för att komma igång. Du kan ladda upp ett PDF-dokument och låta appen generera flashkort, quiz och sammanfattning automatiskt.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('CreateCourse')}
          >
            <Text style={styles.emptyBtnText}>Skapa en kurs</Text>
          </TouchableOpacity>
        </View>
      ) : (
        courses.map((item, index) => (
          <CourseCard
            key={item.id}
            course={item}
            index={index}
            progress={progressByCourse[item.id] ?? null}
            docCount={docCountByCourse[item.id] ?? 0}
            cardCount={cardCountByCourse[item.id] ?? 0}
            dueCount={dueCountByCourse[item.id] ?? 0}
            onPress={() => navigation.navigate('Course', { courseId: item.id, courseName: item.name })}
            onLongPress={() => {
              confirm(item.name, 'Vad vill du göra?', [
                { text: 'Avbryt', style: 'cancel' },
                {
                  text: 'Redigera kurs',
                  onPress: () => navigation.navigate('EditCourse', {
                    courseId: item.id,
                    courseName: item.name,
                    description: item.description ?? '',
                    color: item.color,
                  }),
                },
                {
                  text: 'Ta bort kurs',
                  style: 'destructive',
                  onPress: () => handleDeleteCourse(item),
                },
              ]);
            }}
          />
        ))
      )}

      {confirmDialog}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  caption: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },
  heading: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },
  addBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: colors.paper, fontSize: 24, lineHeight: 28, fontFamily: fontFamily.body },
  list: { paddingTop: spacing.sm, paddingBottom: spacing['2xl'] },
  empty: {
    alignItems: 'center',
    paddingTop: spacing['2xl'] * 1.5,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xl, color: colors.ink },
  emptySubtitle: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.inkMuted, textAlign: 'center', lineHeight: 24 },
  emptyBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.ink,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
  },
  emptyBtnText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.paper },
});
