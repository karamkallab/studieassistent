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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { HighlighterText } from '../../components/HighlighterText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fyll i båda fälten');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Inloggningsfel', error.message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <HighlighterText
              textStyle={styles.title}
            >
              Studie
            </HighlighterText>
            <Text style={styles.titleSuffix}>assistenten</Text>
            <Text style={styles.subtitle}>Din personliga studieassistent</Text>
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
                placeholder="••••••••"
                placeholderTextColor={colors.inkMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <PrimaryButton
              label="Logga in"
              onPress={handleLogin}
              loading={loading}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>
                Inget konto?{' '}
                <Text style={styles.linkAccent}>Registrera dig</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['3xl'],
    color: colors.ink,
    lineHeight: 40,
  },
  titleSuffix: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['3xl'],
    color: colors.ink,
    lineHeight: 40,
    marginLeft: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
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
