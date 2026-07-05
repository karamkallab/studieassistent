import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { MindmapView } from '../../components/MindmapView';
import { MindmapNode, sampleMindmap } from '../../data/sampleMindmap';
import { colors, fontFamily, fontSize, spacing } from '../../theme/tokens';

type Props = NativeStackScreenProps<AppStackParamList, 'Mindmap'>;

export default function MindmapScreen({ route }: Props) {
  const { courseId, documentId } = route.params;
  const { user } = useAuth();
  const [data, setData] = useState<MindmapNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (documentId) {
        const { data: row } = await supabase
          .from('mindmaps')
          .select('content')
          .eq('document_id', documentId)
          .eq('user_id', user!.id)
          .maybeSingle();
        if (row?.content) {
          setData(row.content as MindmapNode);
          setLoading(false);
          return;
        }
      }
      // Fall back to sample mindmap
      setData(sampleMindmap);
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

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.hint}>Tryck på en nod med prick för att expandera/kollapsa</Text>
        {data && <MindmapView data={data} />}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },
  hint: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
});
