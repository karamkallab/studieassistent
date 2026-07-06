import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { CourseCard } from '../../components/CourseCard';
import { HighlighterText } from '../../components/HighlighterText';
import { getStreak } from '../../lib/streak';
import { colors, fontFamily, fontSize, spacing } from '../../theme/tokens';

type Course = { id: string; name: string; description: string | null; created_at: string };
type Props = NativeStackScreenProps<AppStackParamList, 'CourseList'>;

export default function CourseListScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);

  const fetchAll = useCallback(async () => {
    try {
      const [{ data, error }, streakDays] = await Promise.all([
        supabase.from('courses').select('*').order('created_at', { ascending: false }),
        getStreak(user!.id),
      ]);
      if (error) Alert.alert('Fel', 'Kunde inte hämta kurser. Kontrollera din internetanslutning.');
      else setCourses(data ?? []);
      setStreak(streakDays);
    } catch {
      Alert.alert('Fel', 'Något gick fel. Försök igen.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchAll(); }, [fetchAll]));

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <HighlighterText textStyle={styles.heading}>Mina kurser</HighlighterText>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Logga ut</Text>
          </TouchableOpacity>
        </View>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>{streak} {streak === 1 ? 'dag' : 'dagar'} i rad</Text>
          </View>
        )}
      </View>

      <FlatList
        data={courses}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink}
            colors={[colors.ink]}
          />
        }
        ListEmptyComponent={
          !loading ? (
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
          ) : null
        }
        renderItem={({ item, index }) => (
          <CourseCard
            course={item}
            index={index}
            onPress={() => navigation.navigate('Course', { courseId: item.id, courseName: item.name })}
            onLongPress={() => {
              Alert.alert(item.name, 'Vad vill du göra?', [
                {
                  text: 'Redigera kurs',
                  onPress: () => navigation.navigate('EditCourse', {
                    courseId: item.id,
                    courseName: item.name,
                    description: item.description ?? '',
                  }),
                },
                {
                  text: 'Ta bort kurs',
                  style: 'destructive',
                  onPress: () => Alert.alert(
                    'Ta bort kurs?',
                    `"${item.name}" och allt innehåll (flashkort, quiz, mindmaps) raderas permanent.`,
                    [
                      { text: 'Avbryt', style: 'cancel' },
                      {
                        text: 'Ta bort',
                        style: 'destructive',
                        onPress: async () => {
                          const { error } = await supabase.from('courses').delete().eq('id', item.id);
                          if (error) Alert.alert('Fel', 'Kunde inte ta bort kursen.');
                          else setCourses((prev) => prev.filter((c) => c.id !== item.id));
                        },
                      },
                    ],
                  ),
                },
                { text: 'Avbryt', style: 'cancel' },
              ]);
            }}
          />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateCourse')}
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },
  signOutBtn: { padding: spacing.xs },
  signOutText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted, textDecorationLine: 'underline' },
  streakBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.highlight,
    paddingVertical: 3, paddingHorizontal: spacing.sm,
    borderRadius: 20,
  },
  streakText: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.ink },
  list: { paddingTop: spacing.sm, paddingBottom: 100 },
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
  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.xl,
    backgroundColor: colors.ink, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
  },
  fabText: { color: colors.paper, fontSize: 28, lineHeight: 32, fontFamily: fontFamily.body },
});
