import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Switch, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ScreenContainer } from '../../components/ScreenContainer';
import { getStreakStats } from '../../lib/streak';
import { requestPermission, scheduleDailyReview, cancelDailyReview } from '../../lib/notifications';
import { BoltIcon } from '../../components/icons/BoltIcon';
import { HelpCircleIcon } from '../../components/icons/HelpCircleIcon';
import { ShieldIcon } from '../../components/icons/ShieldIcon';
import { LogoutIcon } from '../../components/icons/LogoutIcon';
import { ChevronRightIcon } from '../../components/icons/ChevronRightIcon';
import { colors, fontFamily, fontSize, spacing, radius } from '../../theme/tokens';

type Settings = {
  daily_review_enabled: boolean;
  daily_review_hour: number;
  daily_review_minute: number;
  study_plan_notifs: boolean;
  focus_notifs: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  daily_review_enabled: true,
  daily_review_hour: 17,
  daily_review_minute: 0,
  study_plan_notifs: true,
  focus_notifs: true,
};

const APP_VERSION = '1.0.0';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    const [{ current, longest }, { data: settingsData }] = await Promise.all([
      getStreakStats(user!.id),
      supabase.from('user_settings').select('*').eq('user_id', user!.id).maybeSingle(),
    ]);

    setStreak(current);
    setLongestStreak(longest);
    if (settingsData) setSettings({ ...DEFAULT_SETTINGS, ...settingsData });
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

  const adjustHour = (delta: number) => {
    const val = Math.min(23, Math.max(0, settings.daily_review_hour + delta));
    const updated = { ...settings, daily_review_hour: val };
    setSettings(updated);
    saveSettings(updated);
  };

  const fmtTime = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const emailLocalPart = user?.email?.split('@')[0] ?? '';
  const initials = emailLocalPart.slice(0, 2).toUpperCase() || '?';

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.ink} /></View>;
  }

  return (
    <ScreenContainer contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.caption}>KONTO</Text>
        <Text style={s.heading}>Profil</Text>
      </View>

      {/* Account card */}
      <View style={s.accountCard}>
        <View style={s.avatar}>
          <Text style={s.avatarTxt}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.accountName} numberOfLines={1}>{emailLocalPart}</Text>
          <Text style={s.accountEmail} numberOfLines={1}>{user?.email}</Text>
        </View>
      </View>

      {/* Streak card */}
      <View style={s.streakCard}>
        <View style={s.streakIconBox}>
          <BoltIcon size={20} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.streakLabel}>NUVARANDE STREAK</Text>
          <Text style={s.streakValue}>{streak} {streak === 1 ? 'dag' : 'dagar'}</Text>
          <Text style={s.streakBest}>Bäst: {longestStreak} {longestStreak === 1 ? 'dag' : 'dagar'}</Text>
        </View>
      </View>

      {/* Language */}
      <Text style={s.sectionLbl}>SPRÅK</Text>
      <View style={s.settingsCard}>
        <View style={s.settingRow}>
          <Text style={s.settingLabel}>Appspråk</Text>
          <View style={s.langToggle}>
            <View style={[s.langOption, s.langOptionActive]}>
              <Text style={[s.langTxt, s.langTxtActive]}>Svenska</Text>
            </View>
            <View style={s.langOption}>
              <Text style={s.langTxt}>English</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Notifications */}
      <Text style={s.sectionLbl}>NOTISER</Text>
      <View style={s.settingsCard}>
        <View style={s.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.settingLabel}>
              Daglig repetition {settings.daily_review_enabled ? `(${fmtTime(settings.daily_review_hour, settings.daily_review_minute)})` : ''}
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
                <TouchableOpacity onPress={() => adjustHour(-1)} style={s.adjBtn} disabled={saving}>
                  <Text style={s.adjTxt}>−</Text>
                </TouchableOpacity>
                <Text style={s.timeVal}>
                  {fmtTime(settings.daily_review_hour, settings.daily_review_minute)}
                </Text>
                <TouchableOpacity onPress={() => adjustHour(1)} style={s.adjBtn} disabled={saving}>
                  <Text style={s.adjTxt}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <View style={s.divider} />
        <View style={s.settingRow}>
          <Text style={s.settingLabel}>Påminnelser för studiepass</Text>
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
          <Text style={s.settingLabel}>Fokuspass slutfört</Text>
          <Switch
            value={settings.focus_notifs}
            onValueChange={() => toggle('focus_notifs')}
            trackColor={{ false: colors.cardBorder, true: colors.ink }}
            thumbColor={colors.paper}
            disabled={saving}
          />
        </View>
      </View>

      {/* App */}
      <Text style={s.sectionLbl}>APP</Text>
      <View style={s.settingsCard}>
        <TouchableOpacity
          style={s.linkRow}
          onPress={() => Alert.alert('Hjälp & Support', 'Behöver du hjälp? Mejla oss på support@studieassistenten.se')}
        >
          <HelpCircleIcon size={18} color={colors.ink} />
          <Text style={s.linkTxt}>Hjälp & Support</Text>
          <ChevronRightIcon size={16} color={colors.inkMuted} />
        </TouchableOpacity>
        <View style={s.divider} />
        <TouchableOpacity
          style={s.linkRow}
          onPress={() => Alert.alert('Integritetspolicy', 'Din data används endast för att driva appens funktioner och delas inte med tredje part.')}
        >
          <ShieldIcon size={18} color={colors.ink} />
          <Text style={s.linkTxt}>Integritetspolicy</Text>
          <ChevronRightIcon size={16} color={colors.inkMuted} />
        </TouchableOpacity>
        <View style={s.divider} />
        <TouchableOpacity
          style={s.linkRow}
          onPress={() => Alert.alert('Logga ut?', '', [
            { text: 'Avbryt', style: 'cancel' },
            { text: 'Logga ut', style: 'destructive', onPress: signOut },
          ])}
        >
          <LogoutIcon size={18} color={colors.rust} />
          <Text style={[s.linkTxt, { color: colors.rust }]}>Logga ut</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.version}>Studieassistenten · v{APP_VERSION}</Text>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },

  header: { paddingTop: spacing.xl, gap: spacing.xs, marginBottom: spacing.xs },
  caption: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5 },
  heading: { fontFamily: fontFamily.serif, fontSize: fontSize['2xl'], color: colors.ink },

  accountCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.card, padding: spacing.md,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontFamily: fontFamily.serif, fontSize: fontSize.base, color: colors.paper },
  accountName: { fontFamily: fontFamily.serif, fontSize: fontSize.lg, color: colors.ink, textTransform: 'capitalize' },
  accountEmail: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, marginTop: 2 },

  streakCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.card, padding: spacing.md,
  },
  streakIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.highlight, alignItems: 'center', justifyContent: 'center',
  },
  streakLabel: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1 },
  streakValue: { fontFamily: fontFamily.serif, fontSize: fontSize.xl, color: colors.ink, marginTop: 2 },
  streakBest: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted, marginTop: 2 },

  sectionLbl: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, letterSpacing: 1.5, marginTop: spacing.xs },

  settingsCard: {
    backgroundColor: colors.cardBg, borderWidth: 1,
    borderColor: colors.cardBorder, borderRadius: radius.card, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, gap: spacing.sm,
  },
  settingLabel: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.cardBorder, marginHorizontal: spacing.md },

  langToggle: {
    flexDirection: 'row', backgroundColor: colors.paper, borderRadius: 20,
    borderWidth: 1, borderColor: colors.cardBorder, padding: 3,
  },
  langOption: { paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: 16 },
  langOptionActive: { backgroundColor: colors.ink },
  langTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.inkMuted },
  langTxtActive: { color: colors.paper, fontFamily: fontFamily.bodySemiBold },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeVal: { fontFamily: fontFamily.mono, fontSize: fontSize.base, color: colors.ink, minWidth: 40, textAlign: 'center' },
  adjBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  adjTxt: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.ink },

  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md,
  },
  linkTxt: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.ink },

  version: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.sm },
});
