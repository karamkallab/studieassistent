import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fontFamily, fontSize, spacing, radius } from '../theme/tokens';
import { localDateStr } from '../lib/dates';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

const MONTH_NAMES_FULL = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
];
const DAY_LETTERS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

type Props = {
  year: number;
  month: number; // 0-indexed
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: Date) => void;
  hasPlansOn: (dateStr: string) => boolean;
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Monday-first index of the 1st of the month (0=Mon..6=Sun)
function firstDayOffset(year: number, month: number): number {
  const jsDay = new Date(year, month, 1).getDay();
  return (jsDay + 6) % 7;
}

export function MonthCalendarGrid({ year, month, onPrevMonth, onNextMonth, onSelectDate, hasPlansOn }: Props) {
  const todayStr = localDateStr(new Date());
  const numDays = daysInMonth(year, month);
  const offset = firstDayOffset(year, month);
  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: numDays }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={st.card}>
      <View style={st.navRow}>
        <Text style={st.monthLabel}>{MONTH_NAMES_FULL[month].toUpperCase()} {year}</Text>
        <View style={st.navBtns}>
          <Pressable onPress={onPrevMonth} style={st.navBtn} hitSlop={8}>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <ChevronRightIcon size={16} color={colors.inkMuted} strokeWidth={2} />
            </View>
          </Pressable>
          <Pressable onPress={onNextMonth} style={st.navBtn} hitSlop={8}>
            <ChevronRightIcon size={16} color={colors.inkMuted} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <View style={st.dayLettersRow}>
        {DAY_LETTERS.map((l, i) => (
          <Text key={i} style={st.dayLetter}>{l}</Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={st.weekRow}>
          {week.map((date, di) => {
            if (!date) return <View key={di} style={st.cell} />;
            const dateStr = localDateStr(date);
            const isToday = dateStr === todayStr;
            const hasPlans = hasPlansOn(dateStr);
            return (
              <Pressable
                key={di}
                style={st.cell}
                onPress={() => onSelectDate(date)}
              >
                <View style={[st.cellInner, isToday && st.cellToday]}>
                  <Text style={[st.cellTxt, isToday && st.cellTxtToday]}>{date.getDate()}</Text>
                </View>
                {hasPlans && <View style={st.dot} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    width: '100%', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.card, padding: spacing.md, gap: spacing.xs,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtns: { flexDirection: 'row', gap: spacing.sm },
  navBtn: { padding: spacing.xs },
  monthLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },

  dayLettersRow: { flexDirection: 'row', marginTop: spacing.xs },
  dayLetter: {
    flex: 1, textAlign: 'center',
    fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted,
  },

  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellInner: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  cellToday: { backgroundColor: colors.highlight },
  cellTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  cellTxtToday: { color: colors.ink, fontFamily: fontFamily.bodySemiBold },
  dot: {
    position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.rust,
  },
});
