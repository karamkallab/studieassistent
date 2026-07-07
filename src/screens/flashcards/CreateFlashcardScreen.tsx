import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateFlashcard'>;

export default function CreateFlashcardScreen({ route, navigation }: Props) {
  const { courseId, cardId } = route.params;
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const isEditing = !!cardId;

  useEffect(() => {
    if (!cardId) return;
    supabase
      .from('flashcards')
      .select('question, answer')
      .eq('id', cardId)
      .single()
      .then(({ data }) => {
        if (data) { setQuestion(data.question); setAnswer(data.answer); }
      });
  }, [cardId]);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert('Fyll i både fråga och svar');
      return;
    }
    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('flashcards')
          .update({ question: question.trim(), answer: answer.trim() })
          .eq('id', cardId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('flashcards').insert({
          course_id: courseId,
          user_id: user!.id,
          question: question.trim(),
          answer: answer.trim(),
        });
        if (error) throw error;
      }
      navigation.goBack();
    } catch (err: unknown) {
      Alert.alert('Fel', err instanceof Error ? err.message : 'Något gick fel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Fråga</Text>
          <TextInput
            style={[styles.input, styles.tall]}
            placeholder="Skriv frågan här..."
            placeholderTextColor={colors.inkMuted}
            value={question}
            onChangeText={setQuestion}
            multiline
            textAlignVertical="top"
            autoFocus={!isEditing}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Svar</Text>
          <TextInput
            style={[styles.input, styles.tall]}
            placeholder="Skriv svaret här..."
            placeholderTextColor={colors.inkMuted}
            value={answer}
            onChangeText={setAnswer}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={isEditing ? 'Spara ändringar' : 'Skapa kort'}
            onPress={handleSave}
            loading={loading}
          />
          <PrimaryButton label="Avbryt" onPress={() => navigation.goBack()} variant="ghost" />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.md },
  field: { gap: spacing.xs },
  label: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.button,
    padding: spacing.md,
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.ink,
    backgroundColor: colors.cardBg,
  },
  tall: { minHeight: 100 },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
