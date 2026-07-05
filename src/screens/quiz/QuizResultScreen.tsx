import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { HighlighterText } from '../../components/HighlighterText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, fontFamily, fontSize, spacing } from '../../theme/tokens';

type Props = NativeStackScreenProps<AppStackParamList, 'QuizResult'>;

export default function QuizResultScreen({ route, navigation }: Props) {
  const { score, total, courseId, courseName } = route.params;
  const pct = Math.round((score / total) * 100);

  const headline =
    pct === 100 ? 'Perfekt!' :
    pct >= 80  ? 'Bra jobbat!' :
    pct >= 60  ? 'Nästan där!' :
    'Öva mer!';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <HighlighterText textStyle={styles.headline}>{headline}</HighlighterText>

        <View style={styles.scoreRow}>
          <Text style={styles.scoreNum}>{score}</Text>
          <Text style={styles.scoreOf}> av </Text>
          <Text style={styles.scoreNum}>{total}</Text>
          <Text style={styles.scoreOf}> rätt</Text>
        </View>

        <View style={styles.pctBadge}>
          <Text style={styles.pctText}>{pct}%</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Kör om"
          onPress={() =>
            navigation.replace('Quiz', { courseId, courseName })
          }
        />
        <PrimaryButton
          label="Tillbaka till kursen"
          onPress={() =>
            navigation.navigate('Course', { courseId, courseName })
          }
          variant="ghost"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.paper,
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
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  scoreNum: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },
  scoreOf: { fontFamily: fontFamily.body, fontSize: fontSize.lg, color: colors.inkMuted },
  pctBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: spacing['2xl'],
  },
  pctText: { fontFamily: fontFamily.mono, fontSize: fontSize.base, color: colors.inkMuted },
  actions: { gap: spacing.sm, paddingBottom: spacing.lg },
});
