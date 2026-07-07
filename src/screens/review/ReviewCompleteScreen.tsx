import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, fontFamily, fontSize, spacing } from '../../theme/tokens';

type Props = NativeStackScreenProps<AppStackParamList, 'ReviewComplete'>;

export default function ReviewCompleteScreen({ route, navigation }: Props) {
  const { count, streakDays } = route.params;

  return (
    <ScreenContainer scroll={false} contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <Text style={styles.headline}>Klart!</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{count}</Text>
            <Text style={styles.statLabel}>kort repeterade</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{streakDays}</Text>
            <Text style={styles.statLabel}>
              {streakDays === 1 ? 'dag i rad' : 'dagar i rad'}
            </Text>
          </View>
        </View>

        {streakDays >= 3 && (
          <Text style={styles.streakMsg}>
            {streakDays} dagar i rad — håll i det!
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Tillbaka till kurser"
          onPress={() => navigation.navigate('Main')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
    padding: spacing.xl,
    paddingTop: spacing['2xl'] * 1.5,
  },
  content: { gap: spacing.xl, alignItems: 'flex-start' },
  headline: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['3xl'],
    color: colors.ink,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  stat: { alignItems: 'center', gap: spacing.xs },
  statValue: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl'],
    color: colors.ink,
  },
  statLabel: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: colors.cardBorder,
  },
  streakMsg: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.sage,
    marginTop: spacing.sm,
  },
  actions: { paddingBottom: spacing.lg },
});
