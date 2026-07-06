import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
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
import { canUpload, incrementUploads, getUsage, FREE_UPLOADS_PER_MONTH } from '../../lib/limits';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateCourse'>;

export default function CreateCourseScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<{ uri: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('uploading');
  const [uploadsRemaining, setUploadsRemaining] = useState<number | null>(null);

  useEffect(() => {
    getUsage(user!.id).then((u) => setUploadsRemaining(u.uploadsRemaining));
  }, []);

  const pickPdf = async () => {
    if (pdfFile) {
      // Om fil redan vald — fråga om att byta
      Alert.alert('Byt fil?', `Nuvarande: ${pdfFile.name}`, [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Välj ny fil', onPress: () => doPick() },
      ]);
      return;
    }
    doPick();
  };

  const doPick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPdfFile({ uri: result.assets[0].uri, name: result.assets[0].name });
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Kursnamn saknas', 'Ange ett namn för kursen.');
      return;
    }

    // Kvot-kontroll innan uppladdning
    if (pdfFile) {
      const ok = await canUpload(user!.id);
      if (!ok) {
        Alert.alert(
          'Uppladdningsgräns nådd',
          `Du har använt alla ${FREE_UPLOADS_PER_MONTH} uppladdningar för den här månaden. Uppgradera till Premium för obegränsade uppladdningar.`,
          [
            { text: 'Avbryt', style: 'cancel' },
            { text: 'Se Premium', onPress: () => navigation.navigate('Upgrade') },
          ],
        );
        return;
      }
    }

    setUploading(true);
    setUploadPhase('uploading');

    try {
      // 1. Skapa kurs
      const { data: course, error: courseErr } = await supabase
        .from('courses')
        .insert({ name: name.trim(), description: description.trim() || null, user_id: user!.id })
        .select()
        .single();
      if (courseErr) throw courseErr;

      if (pdfFile) {
        // 2. Ladda upp PDF till Storage
        const base64 = await FileSystem.readAsStringAsync(pdfFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const filePath = `${user!.id}/${course.id}/${pdfFile.name}`;
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(filePath, decodeBase64(base64), { contentType: 'application/pdf' });
        if (uploadErr) throw uploadErr;

        // 3. Spara dokument-rad
        const { data: doc, error: docErr } = await supabase
          .from('documents')
          .insert({ course_id: course.id, user_id: user!.id, name: pdfFile.name, storage_path: filePath, file_type: 'pdf' })
          .select()
          .single();
        if (docErr) throw docErr;

        // 4. Räkna upp kvoten
        await incrementUploads(user!.id);

        // 5. Generera studiematerial via Edge Function
        setUploadPhase('reading');
        const { error: fnErr } = await supabase.functions.invoke('generate-study-material', {
          body: { document_id: doc.id },
        });

        if (fnErr) {
          // Edge Function-fel är inte fatalt — kursen och dokumentet finns
          Alert.alert(
            'Uppladdning klar',
            'PDF:en laddades upp men generering av studiematerial misslyckades. Du kan försöka igen från kursvyn.',
          );
        } else {
          setUploadPhase('summarizing');
          // Kort paus så statusmeddelandet syns
          await new Promise((r) => setTimeout(r, 800));
        }
      }

      navigation.replace('Course', { courseId: course.id, courseName: course.name });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Något gick fel. Försök igen.';
      Alert.alert('Fel', msg);
    } finally {
      setUploading(false);
    }
  };

  if (uploading) {
    return (
      <View style={styles.loadingContainer}>
        <UploadAnimation phase={uploadPhase} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Kursnamn *</Text>
          <TextInput
            style={styles.input}
            placeholder="T.ex. Molntjänster"
            placeholderTextColor={colors.inkMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Beskrivning</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Valfri kursbeskrivning..."
            placeholderTextColor={colors.inkMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            PDF-dokument{' '}
            {uploadsRemaining !== null && (
              <Text style={styles.quota}>
                ({uploadsRemaining} av {FREE_UPLOADS_PER_MONTH} kvar denna månad)
              </Text>
            )}
          </Text>
          <TouchableOpacity style={styles.uploadBox} onPress={pickPdf} activeOpacity={0.7}>
            {pdfFile ? (
              <>
                <Text style={styles.uploadFilename} numberOfLines={1}>{pdfFile.name}</Text>
                <Text style={styles.uploadChange}>Byt fil</Text>
              </>
            ) : (
              <Text style={styles.uploadPlaceholder}>Tryck för att välja en PDF-fil</Text>
            )}
          </TouchableOpacity>
          {uploadsRemaining === 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Upgrade')}>
              <Text style={styles.upgradeHint}>Uppladdningsgräns nådd — se Premium</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Skapa kurs" onPress={handleCreate} />
          <PrimaryButton label="Avbryt" onPress={() => navigation.goBack()} variant="ghost" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing['2xl'] },
  loadingContainer: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },
  field: { gap: spacing.xs },
  label: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.ink },
  quota: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted },
  input: {
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.button,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    fontSize: fontSize.base, fontFamily: fontFamily.body, color: colors.ink,
    backgroundColor: colors.cardBg,
  },
  multiline: { height: 84, textAlignVertical: 'top' },
  uploadBox: {
    borderWidth: 1.5, borderColor: colors.cardBorder, borderStyle: 'dashed',
    borderRadius: radius.button, padding: spacing.lg,
    backgroundColor: colors.cardBg, alignItems: 'center', gap: spacing.xs,
  },
  uploadFilename: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },
  uploadChange: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted },
  uploadPlaceholder: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.inkMuted },
  upgradeHint: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.rust, marginTop: spacing.xs },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
