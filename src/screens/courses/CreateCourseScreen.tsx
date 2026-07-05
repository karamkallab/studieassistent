import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateCourse'>;

export default function CreateCourseScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<{ uri: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);

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
      Alert.alert('Fel', 'Kursnamn krävs.');
      return;
    }
    setLoading(true);
    try {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert({ name: name.trim(), description: description.trim() || null, user_id: user!.id })
        .select()
        .single();

      if (courseError) throw courseError;

      if (pdfFile) {
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
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Kursnamn *</Text>
      <TextInput
        style={styles.input}
        placeholder="T.ex. Matematik A"
        value={name}
        onChangeText={setName}
      />
      <Text style={styles.label}>Beskrivning</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Valfri kursbeskrivning"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />
      <Text style={styles.label}>Ladda upp PDF</Text>
      <TouchableOpacity style={styles.uploadButton} onPress={pickPdf}>
        <Text style={styles.uploadText}>
          {pdfFile ? `Vald: ${pdfFile.name}` : 'Välj PDF-fil'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Skapa kurs</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  multiline: { height: 80, textAlignVertical: 'top' },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  uploadText: { color: '#3B82F6', fontSize: 14 },
  button: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
