import React, { useState } from 'react';
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
import { AppStackParamList } from '../../navigation/AppNavigator';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ColorSwatchPicker } from '../../components/ColorSwatchPicker';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Props = NativeStackScreenProps<AppStackParamList, 'EditCourse'>;

export default function EditCourseScreen({ route, navigation }: Props) {
  const { courseId, courseName, description: initialDesc, color: initialColor } = route.params;
  const [name, setName] = useState(courseName);
  const [description, setDescription] = useState(initialDesc);
  const [color, setColor] = useState(initialColor);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Kursnamn saknas', 'Ange ett namn för kursen.');
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('courses')
      .update({ name: name.trim(), description: description.trim() || null, color })
      .eq('id', courseId);
    setLoading(false);
    if (error) {
      Alert.alert('Fel', 'Kunde inte spara ändringarna. Försök igen.');
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.label}>Kursnamn *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            autoFocus
            selectTextOnFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Färg</Text>
          <ColorSwatchPicker value={color} onChange={setColor} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Beskrivning</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholder="Valfri beskrivning..."
            placeholderTextColor={colors.inkMuted}
          />
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Spara" onPress={handleSave} loading={loading} />
          <PrimaryButton label="Avbryt" onPress={() => navigation.goBack()} variant="ghost" />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg },
  field: { gap: spacing.xs },
  label: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.ink },
  input: {
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.button,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    fontSize: fontSize.base, fontFamily: fontFamily.body, color: colors.ink,
    backgroundColor: colors.cardBg,
  },
  multiline: { height: 84, textAlignVertical: 'top' },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
