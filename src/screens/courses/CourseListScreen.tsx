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
import { CourseCard } from '../../components/CourseCard';
import { HighlighterText } from '../../components/HighlighterText';
import { colors, fontFamily, fontSize, spacing } from '../../theme/tokens';

type Course = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type Props = NativeStackScreenProps<AppStackParamList, 'CourseList'>;

export default function CourseListScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) Alert.alert('Fel', error.message);
    else setCourses(data ?? []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchCourses(); }, []));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HighlighterText textStyle={styles.heading}>Mina kurser</HighlighterText>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Logga ut</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          color={colors.ink}
        />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Inga kurser ännu</Text>
              <Text style={styles.emptySubtitle}>
                Tryck på + för att skapa din första kurs
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <CourseCard course={item} index={index} />
          )}
        />
      )}

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
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  heading: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl'],
    color: colors.ink,
  },
  signOut: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    textDecorationLine: 'underline',
  },
  loader: {
    marginTop: spacing['2xl'],
  },
  list: {
    paddingBottom: 100,
    paddingTop: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: spacing['2xl'] * 1.5,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
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
  fabText: {
    color: colors.paper,
    fontSize: 28,
    lineHeight: 32,
    fontFamily: fontFamily.body,
  },
});
