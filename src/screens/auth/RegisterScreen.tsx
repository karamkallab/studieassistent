import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Fyll i båda fälten');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Registreringsfel', error.message);
    } else {
      Alert.alert('Konto skapat!', 'Kontrollera din e-post för att bekräfta kontot.');
      navigation.navigate('Login');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Skapa konto</Text>
          <Text style={styles.subtitle}>
            Kom igång med Studieassistenten
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>E-postadress</Text>
            <TextInput
              style={styles.input}
              placeholder="namn@exempel.se"
              placeholderTextColor={colors.inkMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Lösenord</Text>
            <TextInput
              style={styles.input}
              placeholder="Minst 6 tecken"
              placeholderTextColor={colors.inkMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <PrimaryButton
            label="Skapa konto"
            onPress={handleRegister}
            loading={loading}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.linkRow}
          >
            <Text style={styles.linkText}>
              Har du redan ett konto?{' '}
              <Text style={styles.linkAccent}>Logga in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
    gap: spacing.xl,
  },
  header: { gap: spacing.sm },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl'],
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.inkMuted,
  },
  form: { gap: spacing.md },
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
  linkRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  linkText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
  },
  linkAccent: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
});
