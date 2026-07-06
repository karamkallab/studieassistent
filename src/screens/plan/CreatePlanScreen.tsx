import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { requestPermission, scheduleStudyPlan, cancelStudyPlan } from '../../lib/notifications';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Course = { id: string; name: string };
type Props = NativeStackScreenProps<AppStackParamList, 'CreatePlan'>;

const DAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

export default function CreatePlanScreen({ route, navigation }: Props) {
  const planId = route.params?.planId;
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [recurring, setRecurring] = useState(true);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [specificDate, setSpecificDate] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('17:00');
  const [durationMins, setDurationMins] = useState('45');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!planId);
  const [notify, setNotify] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('courses').select('id, name').order('created_at');
      setCourses(data ?? []);

      if (planId) {
        const { data: plan } = await supabase
          .from('study_plans')
          .select('*')
          .eq('id', planId)
          .single();
        if (plan) {
          setTitle(plan.title);
          setCourseId(plan.course_id);
          setRecurring(plan.recurring);
          setWeekdays(plan.weekdays ?? []);
          setSpecificDate(plan.specific_date ?? '');
          setTimeOfDay(plan.time_of_day?.slice(0, 5) ?? '17:00');
          setDurationMins(String(plan.duration_minutes));
        }
        setLoadingData(false);
      }
    })();
  }, [planId]);

  const toggleDay = (idx: number) => {
    setWeekdays(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx].sort(),
    );
  };

  const validate = (): string | null => {
    if (!title.trim()) return 'Ange en titel.';
    if (recurring && weekdays.length === 0) return 'Välj minst en veckodag.';
    if (!recurring && !specificDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return 'Ange datum i formatet ÅÅÅÅ-MM-DD.';
    }
    if (!timeOfDay.match(/^\d{2}:\d{2}$/)) return 'Ange tid i formatet TT:MM.';
    if (!durationMins || isNaN(Number(durationMins)) || Number(durationMins) < 1) {
      return 'Ange en giltig längd i minuter.';
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { Alert.alert('Fel', err); return; }

    setLoading(true);
    try {
      const payload = {
        user_id: user!.id,
        title: title.trim(),
        course_id: courseId,
        recurring,
        weekdays: recurring ? weekdays : [],
        specific_date: recurring ? null : specificDate,
        time_of_day: timeOfDay,
        duration_minutes: Number(durationMins),
      };

      let savedId = planId;
      if (planId) {
        const { error } = await supabase.from('study_plans').update(payload).eq('id', planId);
        if (error) throw error;
        await cancelStudyPlan(planId);
      } else {
        const { data, error } = await supabase.from('study_plans').insert(payload).select('id').single();
        if (error) throw error;
        savedId = data.id;
      }

      if (savedId && notify && !recurring) {
        const granted = await requestPermission();
        if (granted) {
          const [h, m] = timeOfDay.split(':').map(Number);
          const date = new Date(specificDate);
          date.setHours(h, m, 0, 0);
          if (date > new Date()) {
            const courseName = courses.find(c => c.id === courseId)?.name ?? '';
            const body = `${title.trim()}${courseName ? ` – ${courseName}` : ''} · ${durationMins} min`;
            await scheduleStudyPlan(savedId, body, date);
          }
        }
      }

      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert('Fel', e instanceof Error ? e.message : 'Kunde inte spara.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <View style={s.center}><ActivityIndicator color={colors.ink} /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {/* Title */}
      <Text style={s.label}>TITEL</Text>
      <TextInput
        style={s.input}
        placeholder="t.ex. Plugga statistik"
        placeholderTextColor={colors.inkMuted}
        value={title}
        onChangeText={setTitle}
      />

      {/* Course picker */}
      <Text style={s.label}>KURS (valfritt)</Text>
      <View style={s.chipRow}>
        <TouchableOpacity
          style={[s.chip, !courseId && s.chipActive]}
          onPress={() => setCourseId(null)}
        >
          <Text style={[s.chipTxt, !courseId && s.chipTxtActive]}>Ingen</Text>
        </TouchableOpacity>
        {courses.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[s.chip, courseId === c.id && s.chipActive]}
            onPress={() => setCourseId(c.id)}
          >
            <Text style={[s.chipTxt, courseId === c.id && s.chipTxtActive]} numberOfLines={1}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recurring toggle */}
      <View style={s.switchRow}>
        <Text style={s.switchLabel}>Återkommande</Text>
        <Switch
          value={recurring}
          onValueChange={setRecurring}
          trackColor={{ false: colors.cardBorder, true: colors.ink }}
          thumbColor={colors.paper}
        />
      </View>

      {/* Weekdays */}
      {recurring && (
        <>
          <Text style={s.label}>VECKODAGAR</Text>
          <View style={s.dayRow}>
            {DAYS.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[s.dayBtn, weekdays.includes(i) && s.dayBtnActive]}
                onPress={() => toggleDay(i)}
              >
                <Text style={[s.dayTxt, weekdays.includes(i) && s.dayTxtActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Specific date */}
      {!recurring && (
        <>
          <Text style={s.label}>DATUM (ÅÅÅÅ-MM-DD)</Text>
          <TextInput
            style={s.input}
            placeholder="2026-07-15"
            placeholderTextColor={colors.inkMuted}
            value={specificDate}
            onChangeText={setSpecificDate}
            keyboardType="numeric"
          />
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Påminnelsenotis</Text>
            <Switch
              value={notify}
              onValueChange={setNotify}
              trackColor={{ false: colors.cardBorder, true: colors.ink }}
              thumbColor={colors.paper}
            />
          </View>
        </>
      )}

      {/* Time */}
      <Text style={s.label}>TID (TT:MM)</Text>
      <TextInput
        style={s.input}
        placeholder="17:00"
        placeholderTextColor={colors.inkMuted}
        value={timeOfDay}
        onChangeText={setTimeOfDay}
        keyboardType="numeric"
      />

      {/* Duration */}
      <Text style={s.label}>LÄNGD (MINUTER)</Text>
      <TextInput
        style={s.input}
        placeholder="45"
        placeholderTextColor={colors.inkMuted}
        value={durationMins}
        onChangeText={setDurationMins}
        keyboardType="numeric"
      />

      {/* Save */}
      <TouchableOpacity
        style={[s.saveBtn, loading && s.saveBtnDisabled]}
        onPress={handleSave}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Text style={s.saveBtnTxt}>{loading ? 'Sparar...' : 'Spara pass'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing['2xl'] },
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },

  label: {
    fontFamily: fontFamily.mono, fontSize: fontSize.xs,
    color: colors.inkMuted, letterSpacing: 1.5, marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.button, padding: spacing.md,
    fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.ink,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder,
    backgroundColor: colors.cardBg,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted },
  chipTxtActive: { color: colors.paper },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  switchLabel: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },

  dayRow: { flexDirection: 'row', gap: spacing.xs },
  dayBtn: {
    flex: 1, paddingVertical: spacing.sm, alignItems: 'center',
    borderRadius: radius.button, borderWidth: 1, borderColor: colors.cardBorder,
    backgroundColor: colors.cardBg,
  },
  dayBtnActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  dayTxt: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted },
  dayTxtActive: { color: colors.paper },

  saveBtn: {
    marginTop: spacing.md, backgroundColor: colors.ink,
    padding: spacing.md, borderRadius: radius.button, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnTxt: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.paper },
});
