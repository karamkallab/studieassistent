import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, ScrollView } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { colors, fontFamily, fontSize, spacing } from '../../theme/tokens';

type Props = NativeStackScreenProps<AppStackParamList, 'Summary'>;

export default function SummaryScreen({ route }: Props) {
  const { documentId, courseId } = route.params;
  const { user } = useAuth();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const query = supabase
        .from('summaries')
        .select('content')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (documentId) query.eq('document_id', documentId);
      else query.eq('course_id', courseId);

      const { data } = await query.maybeSingle();
      setContent(data?.content ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  if (!content) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Ingen sammanfattning ännu</Text>
        <Text style={styles.emptySubtitle}>
          Ladda upp ett dokument och generera studiematerial för att se en sammanfattning.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Markdown style={markdownStyles}>{content}</Markdown>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.xl, paddingBottom: spacing['2xl'] },
  center: {
    flex: 1, backgroundColor: colors.paper,
    justifyContent: 'center', alignItems: 'center',
    padding: spacing.xl, gap: spacing.md,
  },
  emptyTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.lg, color: colors.ink, textAlign: 'center' },
  emptySubtitle: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.inkMuted, textAlign: 'center', lineHeight: 24 },
});

const markdownStyles = {
  body: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.ink, lineHeight: 26 },
  heading1: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.sm },
  heading2: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xl, color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.xs },
  heading3: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.lg, color: colors.ink, marginTop: spacing.md, marginBottom: spacing.xs },
  strong: { fontFamily: fontFamily.bodySemiBold },
  bullet_list: { marginLeft: spacing.md },
  list_item: { marginVertical: spacing.xs },
  code_block: { backgroundColor: colors.cardBg, borderRadius: 6, padding: spacing.md, fontFamily: fontFamily.mono, fontSize: fontSize.sm },
  code_inline: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, backgroundColor: colors.cardBg, paddingHorizontal: 4 },
  hr: { borderBottomColor: colors.cardBorder, borderBottomWidth: 1, marginVertical: spacing.md },
};
