import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fontFamily, fontSize, spacing, radius } from '../theme/tokens';
import { localDateStr } from '../lib/dates';

const MONTH_NAMES_FULL = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
];
const DAY_LETTERS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

type Props = {
  visible: boolean;
  onClose: () => void;
  initialMonth: Date;
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

export function MonthCalendarModal({ visible, onClose, initialMonth, onSelectDate, hasPlansOn }: Props) {
  const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth.getMonth());

  React.useEffect(() => {
    if (visible) {
      setViewYear(initialMonth.getFullYear());
      setViewMonth(initialMonth.getMonth());
    }
  }, [visible, initialMonth]);

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const todayStr = localDateStr(new Date());
  const numDays = daysInMonth(viewYear, viewMonth);
  const offset = firstDayOffset(viewYear, viewMonth);
  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: numDays }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.overlay} onPress={onClose}>
        <Pressable style={st.card} onPress={() => {}}>
          <View style={st.navRow}>
            <Pressable onPress={() => changeMonth(-1)} style={st.navBtn}>
              <Text style={st.navTxt}>‹</Text>
            </Pressable>
            <Text style={st.monthLabel}>{MONTH_NAMES_FULL[viewMonth]} {viewYear}</Text>
            <Pressable onPress={() => changeMonth(1)} style={st.navBtn}>
              <Text style={st.navTxt}>›</Text>
            </Pressable>
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
                    onPress={() => { onSelectDate(date); onClose(); }}
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(29,42,56,0.4)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.lg,
  },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: colors.paper,
    borderRadius: radius.card, borderWidth: 1, borderColor: colors.cardBorder,
    padding: spacing.md, gap: spacing.sm,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.xs },
  navBtn: { padding: spacing.xs, minWidth: 32, alignItems: 'center' },
  navTxt: { fontFamily: fontFamily.body, fontSize: fontSize.xl, color: colors.inkMuted },
  monthLabel: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink, textTransform: 'capitalize' },

  dayLettersRow: { flexDirection: 'row' },
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
  cellToday: { backgroundColor: colors.ink },
  cellTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.ink },
  cellTxtToday: { color: colors.paper, fontFamily: fontFamily.bodySemiBold },
  dot: {
    position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.inkMuted,
  },
});
