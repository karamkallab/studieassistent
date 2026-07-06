import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { PrimaryButton } from '../../components/PrimaryButton';
import { UploadAnimation, type UploadPhase } from '../../components/UploadAnimation';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';
import { canUpload, incrementUploads, FREE_UPLOADS_PER_MONTH, getUsage } from '../../lib/limits';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateCourse'>;

export default function CreateCourseScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<{ uri: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('uploading');
  const [uploadsRemaining, setUploadsRemaining] = useState<number | null>(null);

  React.useEffect(() => {
    getUsage(user!.id).then((u) => setUploadsRemaining(u.uploadsRemaining));
  }, []);

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPdfFile({ uri: asset.uri, name: asset.name });
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Kursnamn krävs');
      return;
    }
    setUploading(true);
    setUploadPhase('uploading');
    try {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert({ name: name.trim(), description: description.trim() || null, user_id: user!.id })
        .select()
        .single();

      if (courseError) throw courseError;

      if (pdfFile) {
        setUploadPhase('reading');
        const fileContent = await FileSystem.readAsStringAsync(pdfFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const filePath = `${user!.id}/${course.id}/${pdfFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, decodeBase64(fileContent), { contentType: 'application/pdf' });

        if (uploadError) throw uploadError;

        await supabase.from('documents').insert({
          course_id: course.id,
          user_id: user!.id,
          name: pdfFile.name,
          storage_path: filePath,
          file_type: 'pdf',
        });
      }

      navigation.goBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Något gick fel.';
      Alert.alert('Fel', message);
    } finally {
      setUploading(false);
    }
  };

  if (uploading) {
    return (
      <View style={styles.uploadingContainer}>
        <UploadAnimation phase={uploadPhase} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.field}>
        <Text style={styles.label}>Kursnamn *</Text>
        <TextInput
          style={styles.input}
          placeholder="T.ex. Matematik A"
          placeholderTextColor={colors.inkMuted}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Beskrivning</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Valfri kursbeskrivning"
          placeholderTextColor={colors.inkMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>PDF-dokument</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickPdf} activeOpacity={0.7}>
          <Text style={styles.uploadIcon}>{pdfFile ? '📄' : '+'}</Text>
          <Text style={styles.uploadText}>
            {pdfFile ? pdfFile.name : 'Välj PDF-fil'}
          </Text>
          {pdfFile && (
            <Text style={styles.uploadChange}>Byt fil</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Skapa kurs"
          onPress={handleCreate}
          loading={uploading}
        />
        <PrimaryButton
          label="Avbryt"
          onPress={() => navigation.goBack()}
          variant="ghost"
        />
      </View>
    </ScrollView>
  );
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.xl, gap: spacing.md },
  uploadingContainer: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    fontFamily: fontFamily.body,
    color: colors.ink,
    backgroundColor: colors.cardBg,
  },
  multiline: {
    height: 84,
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.button,
    padding: spacing.md,
    backgroundColor: colors.cardBg,
    gap: spacing.sm,
  },
  uploadIcon: {
    fontSize: fontSize.lg,
  },
  uploadText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  uploadChange: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    textDecorationLine: 'underline',
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
