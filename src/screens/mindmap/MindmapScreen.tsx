import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { MindmapView } from '../../components/MindmapView';
import { MindmapNode, sampleMindmap } from '../../data/sampleMindmap';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Props = NativeStackScreenProps<AppStackParamList, 'Mindmap'>;

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function addChild(tree: MindmapNode, parentId: string, topic: string): MindmapNode {
  if (tree.id === parentId) {
    return { ...tree, children: [...tree.children, { id: makeId(), topic, children: [] }] };
  }
  return { ...tree, children: tree.children.map((c) => addChild(c, parentId, topic)) };
}

function editTopic(tree: MindmapNode, nodeId: string, topic: string): MindmapNode {
  if (tree.id === nodeId) return { ...tree, topic };
  return { ...tree, children: tree.children.map((c) => editTopic(c, nodeId, topic)) };
}

function deleteNode(tree: MindmapNode, nodeId: string): MindmapNode {
  return {
    ...tree,
    children: tree.children
      .filter((c) => c.id !== nodeId)
      .map((c) => deleteNode(c, nodeId)),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MindmapScreen({ route, navigation }: Props) {
  const { courseId, documentId } = route.params;
  const { user } = useAuth();

  const [data, setData] = useState<MindmapNode | null>(null);
  const [mindmapRowId, setMindmapRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal state
  type ModalMode = 'addChild' | 'editTopic';
  const [modal, setModal] = useState<{ mode: ModalMode; nodeId: string } | null>(null);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    (async () => {
      const q = supabase
        .from('mindmaps')
        .select('id, content')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (documentId) q.eq('document_id', documentId);
      else q.eq('course_id', courseId);

      const { data: rows } = await q;
      if (rows && rows.length > 0) {
        setData(rows[0].content as MindmapNode);
        setMindmapRowId(rows[0].id as string);
      } else {
        setData(sampleMindmap);
      }
      setLoading(false);
    })();
  }, []);

  const saveTree = useCallback(async (tree: MindmapNode) => {
    setSaving(true);
    try {
      if (mindmapRowId) {
        await supabase.from('mindmaps').update({ content: tree }).eq('id', mindmapRowId);
      } else {
        const { data: row } = await supabase
          .from('mindmaps')
          .insert({ course_id: courseId, document_id: documentId ?? null, user_id: user!.id, content: tree })
          .select('id')
          .single();
        if (row) setMindmapRowId(row.id as string);
      }
    } catch {
      Alert.alert('Fel', 'Kunde inte spara tankekartan.');
    } finally {
      setSaving(false);
    }
  }, [mindmapRowId, courseId, documentId, user]);

  const handleNodePress = (nodeId: string, topic: string, isRoot: boolean) => {
    const options: Array<{ text: string; style?: 'default' | 'destructive' | 'cancel'; onPress?: () => void }> = [
      {
        text: 'Lägg till undernod',
        onPress: () => { setInputText(''); setModal({ mode: 'addChild', nodeId }); },
      },
      {
        text: 'Redigera text',
        onPress: () => { setInputText(topic); setModal({ mode: 'editTopic', nodeId }); },
      },
    ];

    if (!isRoot) {
      options.push({
        text: 'Ta bort nod',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Ta bort nod?',
            'Noden och alla undernoder tas bort.',
            [
              { text: 'Avbryt', style: 'cancel' },
              {
                text: 'Ta bort',
                style: 'destructive',
                onPress: () => {
                  const updated = deleteNode(data!, nodeId);
                  setData(updated);
                  saveTree(updated);
                },
              },
            ],
          );
        },
      });
    }

    options.push({ text: 'Avbryt', style: 'cancel' });
    Alert.alert(topic.length > 30 ? topic.slice(0, 27) + '…' : topic, undefined, options);
  };

  const handleModalConfirm = () => {
    if (!modal || !data || !inputText.trim()) {
      setModal(null);
      return;
    }
    let updated: MindmapNode;
    if (modal.mode === 'addChild') {
      updated = addChild(data, modal.nodeId, inputText.trim());
    } else {
      updated = editTopic(data, modal.nodeId, inputText.trim());
    }
    setData(updated);
    saveTree(updated);
    setModal(null);
    setInputText('');
  };

  // Update navigation header buttons
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setEditMode((m) => !m)}
          style={{ marginRight: spacing.md }}
        >
          <Text style={[styles.headerBtn, editMode && styles.headerBtnActive]}>
            {editMode ? 'Klar' : 'Redigera'}
          </Text>
        </TouchableOpacity>
      ),
      headerTitle: saving ? 'Sparar…' : 'Tankekarta',
    });
  }, [editMode, saving, navigation]);

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
        <Text style={styles.hint}>
          {editMode
            ? 'Tryck på en nod för att redigera, lägga till eller ta bort'
            : 'Pan/zoom fritt · Tryck på nod med prick för att kollapsa'}
        </Text>

        {data && (
          <MindmapView
            data={data}
            editMode={editMode}
            onNodePress={handleNodePress}
          />
        )}
      </View>

      {/* Text-input modal */}
      <Modal visible={modal !== null} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {modal?.mode === 'addChild' ? 'Ny undernod' : 'Redigera text'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Skriv text här..."
              placeholderTextColor={colors.inkMuted}
              autoFocus
              onSubmitEditing={handleModalConfirm}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setModal(null); setInputText(''); }}
              >
                <Text style={styles.modalCancelText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOkBtn, !inputText.trim() && styles.modalOkBtnDisabled]}
                onPress={handleModalConfirm}
                disabled={!inputText.trim()}
              >
                <Text style={styles.modalOkText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },
  hint: {
    fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted,
    textAlign: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  headerBtn: {
    fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink,
  },
  headerBtnActive: { color: colors.sage },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
  },
  modalBox: {
    backgroundColor: colors.cardBg, borderRadius: radius.card,
    padding: spacing.xl, width: '100%', gap: spacing.md,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  modalTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.lg, color: colors.ink },
  modalInput: {
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.button,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    fontSize: fontSize.base, fontFamily: fontFamily.body, color: colors.ink,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  modalCancelBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.button,
  },
  modalCancelText: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.inkMuted },
  modalOkBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    backgroundColor: colors.ink, borderRadius: radius.button,
  },
  modalOkBtnDisabled: { opacity: 0.4 },
  modalOkText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.paper },
});
