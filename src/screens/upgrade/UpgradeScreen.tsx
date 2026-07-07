import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';
import { FREE_UPLOADS_PER_MONTH } from '../../lib/limits';

type Props = NativeStackScreenProps<AppStackParamList, 'Upgrade'>;

const FEATURES = [
  { free: `${FREE_UPLOADS_PER_MONTH} uppladdningar/månad`, premium: 'Obegränsade uppladdningar' },
  { free: 'Manuella flashkort', premium: 'AI-genererade flashkort' },
  { free: '—', premium: 'AI-genererade quiz' },
  { free: '—', premium: 'AI-genererade tankekartor' },
  { free: '—', premium: 'AI-sammanfattningar' },
];

export default function UpgradeScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Studieassistenten Premium</Text>
      <Text style={styles.subtitle}>
        Lås upp AI-funktionerna och lär dig snabbare med automatiskt genererat
        studiematerial från dina dokument.
      </Text>

      {/* Feature comparison */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.col, styles.colLabel]} />
          <Text style={[styles.col, styles.colHead]}>Gratis</Text>
          <Text style={[styles.col, styles.colHead, styles.colPremium]}>Premium</Text>
        </View>
        {FEATURES.map((f, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
            <View style={styles.col} />
            <Text style={[styles.col, styles.cellText]}>{f.free}</Text>
            <Text style={[styles.col, styles.cellText, styles.cellPremium]}>{f.premium}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Kom igång med Premium  (kommer snart)"
          onPress={() => {}}
          disabled
        />
        <PrimaryButton
          label="Tillbaka"
          onPress={() => navigation.goBack()}
          variant="ghost"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.paper },
  container: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing['2xl'] },
  title: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },
  subtitle: {
    fontFamily: fontFamily.body, fontSize: fontSize.base,
    color: colors.inkMuted, lineHeight: 24,
  },
  table: {
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.card, overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: colors.ink,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    backgroundColor: colors.cardBg,
  },
  tableRowAlt: { backgroundColor: colors.paper },
  col: { flex: 1 },
  colLabel: { flex: 0.1 },
  colHead: {
    fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.paper,
  },
  colPremium: { color: colors.highlight },
  cellText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted },
  cellPremium: { color: colors.ink, fontFamily: fontFamily.bodySemiBold },
  actions: { gap: spacing.sm },
});
