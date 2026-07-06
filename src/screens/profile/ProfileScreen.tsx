import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Switch, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { HighlighterText } from '../../components/HighlighterText';
import { getStreak } from '../../lib/streak';
import { requestPermission, scheduleDailyReview, cancelDailyReview } from '../../lib/notifications';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Settings = {
  daily_review_enabled: boolean;
  daily_review_hour: number;
  daily_review_minute: number;
  study_plan_notifs: boolean;
  focus_notifs: boolean;
  focus_work_minutes: number;
  focus_break_minutes: number;
};

const DEFAULT_SETTINGS: Settings = {
  daily_review_enabled: true,
  daily_review_hour: 17,
  daily_review_minute: 0,
  study_plan_notifs: true,
  focus_notifs: true,
  focus_work_minutes: 25,
  focus_break_minutes: 5,
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const [streak, setStreak] = useState(0);
  const [weeklyFocus, setWeeklyFocus] = useState(0);
  const [weeklyPassDone, setWeeklyPassDone] = useState(0);
  const [weeklyPassTotal, setWeeklyPassTotal] = useState(0);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const today = new Date();
    const dbDay = (today.getDay() + 6) % 7;
    const monday = new Date(today.getTime() - dbDay * 86400000);
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString().split('T')[0];

    const [
      streakDays,
      { data: focusSessions },
      { data: settingsData },
      { data: allPlans },
      { data: weekComps },
    ] = await Promise.all([
      getStreak(user!.id),
      supabase.from('focus_sessions').select('minutes')
        .eq('user_id', user!.id).gte('completed_at', weekAgo),
      supabase.from('user_settings').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('study_plans').select('id, weekdays, specific_date, recurring').eq('user_id', user!.id),
      supabase.from('study_plan_completions').select('plan_id').gte('completed_on', mondayStr),
    ]);

    setStreak(streakDays);
    setWeeklyFocus((focusSessions ?? []).reduce((s, r) => s + r.minutes, 0));
    if (settingsData) setSettings({ ...DEFAULT_SETTINGS, ...settingsData });

    // Count this week's plans
    let total = 0;
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(monday.getTime() + d * 86400000);
      const dayStr = dayDate.toISOString().split('T')[0];
      for (const plan of allPlans ?? []) {
        if (plan.specific_date === dayStr) { total++; continue; }
        if (plan.recurring && Array.isArray(plan.weekdays) && plan.weekdays.includes(d)) total++;
      }
    }
    setWeeklyPassTotal(total);
    setWeeklyPassDone((weekComps ?? []).length);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const saveSettings = async (updated: Settings) => {
    setSaving(true);
    try {
      await supabase.from('user_settings').upsert({ user_id: user!.id, ...updated });

      // Re-schedule daily review if enabled
      if (updated.daily_review_enabled) {
        const granted = await requestPermission();
        if (granted) {
          const { count } = await supabase
            .from('flashcards')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user!.id)
            .lte('next_review_at', new Date().toISOString());
          await scheduleDailyReview(
            updated.daily_review_hour,
            updated.daily_review_minute,
            count ?? 0,
          );
        }
      } else {
        await cancelDailyReview();
      }
    } catch {
      Alert.alert('Fel', 'Kunde inte spara inställningar.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Settings) => {
    const updated = { ...settings, [key]: !settings[key] } as Settings;
    setSettings(updated);
    saveSettings(updated);
  };

  const adjustNum = (key: keyof Settings, delta: number, min: number, max: number) => {
    const val = Math.min(max, Math.max(min, (settings[key] as number) + delta));
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    saveSettings(updated);
  };

  const fmtFocus = (mins: number) =>
    mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

  const fmtTime = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.ink} /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <HighlighterText textStyle={s.heading}>Profil</HighlighterText>
        {user?.email && <Text style={s.email}>{user.email}</Text>}
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{streak}</Text>
          <Text style={s.statLabel}>{streak === 1 ? 'dag' : 'dagar'}{'\n'}i rad</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{fmtFocus(weeklyFocus)}</Text>
          <Text style={s.statLabel}>fokustid{'\n'}denna vecka</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{weeklyPassDone}/{weeklyPassTotal}</Text>
          <Text style={s.statLabel}>pass{'\n'}denna vecka</Text>
        </View>
      </View>

      {/* Fokustimer settings */}
      <Text style={s.sectionLbl}>FOKUSTIMER</Text>
      <View style={s.settingsCard}>
        <NumRow
          label="Fokusperiod (min)"
          value={settings.focus_work_minutes}
          onMinus={() => adjustNum('focus_work_minutes', -5, 5, 90)}
          onPlus={() => adjustNum('focus_work_minutes', 5, 5, 90)}
          saving={saving}
        />
        <View style={s.divider} />
        <NumRow
          label="Pauslängd (min)"
          value={settings.focus_break_minutes}
          onMinus={() => adjustNum('focus_break_minutes', -1, 1, 30)}
          onPlus={() => adjustNum('focus_break_minutes', 1, 1, 30)}
          saving={saving}
        />
      </View>

      {/* Notifications */}
      <Text style={s.sectionLbl}>NOTISER</Text>
      <View style={s.settingsCard}>
        <View style={s.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.settingLabel}>Daglig repetitionspåminnelse</Text>
            <Text style={s.settingMeta}>
              {settings.daily_review_enabled
                ? `Kl. ${fmtTime(settings.daily_review_hour, settings.daily_review_minute)}`
                : 'Avaktiverad'}
            </Text>
          </View>
          <Switch
            value={settings.daily_review_enabled}
            onValueChange={() => toggle('daily_review_enabled')}
            trackColor={{ false: colors.cardBorder, true: colors.ink }}
            thumbColor={colors.paper}
            disabled={saving}
          />
        </View>

        {settings.daily_review_enabled && (
          <>
            <View style={s.divider} />
            <View style={s.settingRow}>
              <Text style={s.settingLabel}>Tid för påminnelse</Text>
              <View style={s.timeRow}>
                <TouchableOpacity
                  onPress={() => adjustNum('daily_review_hour', -1, 0, 23)}
                  style={s.adjBtn} disabled={saving}
                >
                  <Text style={s.adjTxt}>−</Text>
                </TouchableOpacity>
                <Text style={s.timeVal}>
                  {fmtTime(settings.daily_review_hour, settings.daily_review_minute)}
                </Text>
                <TouchableOpacity
                  onPress={() => adjustNum('daily_review_hour', 1, 0, 23)}
                  style={s.adjBtn} disabled={saving}
                >
                  <Text style={s.adjTxt}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <View style={s.divider} />
        <View style={s.settingRow}>
          <Text style={s.settingLabel}>Notiser för studiepass</Text>
          <Switch
            value={settings.study_plan_notifs}
            onValueChange={() => toggle('study_plan_notifs')}
            trackColor={{ false: colors.cardBorder, true: colors.ink }}
            thumbColor={colors.paper}
            disabled={saving}
          />
        </View>

        <View style={s.divider} />
        <View style={s.settingRow}>
          <Text style={s.settingLabel}>Notiser för fokustimer</Text>
          <Switch
            value={settings.focus_notifs}
            onValueChange={() => toggle('focus_notifs')}
            trackColor={{ false: colors.cardBorder, true: colors.ink }}
            thumbColor={colors.paper}
            disabled={saving}
          />
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity
        style={s.signOutBtn}
        onPress={() => Alert.alert('Logga ut?', '', [
          { text: 'Avbryt', style: 'cancel' },
          { text: 'Logga ut', style: 'destructive', onPress: signOut },
        ])}
        activeOpacity={0.7}
      >
        <Text style={s.signOutTxt}>Logga ut</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function NumRow({
  label, value, onMinus, onPlus, saving,
}: {
  label: string; value: number;
  onMinus: () => void; onPlus: () => void; saving: boolean;
}) {
  return (
    <View style={s.settingRow}>
      <Text style={s.settingLabel}>{label}</Text>
      <View style={s.timeRow}>
        <TouchableOpacity onPress={onMinus} style={s.adjBtn} disabled={saving}>
          <Text style={s.adjTxt}>−</Text>
        </TouchableOpacity>
        <Text style={s.timeVal}>{value}</Text>
        <TouchableOpacity onPress={onPlus} style={s.adjBtn} disabled={saving}>
          <Text style={s.adjTxt}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing['2xl'] },
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },

  header: { paddingTop: spacing.xl, gap: spacing.xs },
  heading: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },
  email: { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.inkMuted },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.card,
    padding: spacing.md, alignItems: 'center', gap: spacing.xs,
  },
  statValue: { fontFamily: fontFamily.serif, fontSize: fontSize.xl, color: colors.ink },
  statLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, textAlign: 'center', lineHeight: 16 },

  sectionLbl: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },

  settingsCard: {
    backgroundColor: colors.cardBg, borderWidth: 1,
    borderColor: colors.cardBorder, borderRadius: radius.card, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, gap: spacing.sm,
  },
  settingLabel: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },
  settingMeta: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.cardBorder, marginHorizontal: spacing.md },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeVal: { fontFamily: fontFamily.mono, fontSize: fontSize.base, color: colors.ink, minWidth: 40, textAlign: 'center' },
  adjBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  adjTxt: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },

  signOutBtn: {
    marginTop: spacing.sm, padding: spacing.md,
    borderRadius: radius.button, borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  signOutTxt: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.rust },
});
