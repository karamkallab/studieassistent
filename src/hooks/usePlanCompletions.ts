import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { localDateStr, dbDayIndex } from '../lib/dates';

export type StudyPlan = {
  id: string;
  title: string;
  time_of_day: string;
  duration_minutes: number;
  course_id: string | null;
  weekdays: number[];
  specific_date: string | null;
  recurring: boolean;
  excluded_dates: string[];
  courses: { name: string; color: string } | null;
};

// Whether `plan` has an occurrence on `date`, honoring per-occurrence
// exclusions of recurring plans. This is the ONE place this check happens —
// every screen that needs to know "is this plan scheduled on this day"
// must go through here so they can't drift apart.
export function occurrenceOn(plan: StudyPlan, date: Date): boolean {
  const dateStr = localDateStr(date);
  if (plan.specific_date === dateStr) return true;
  if (plan.recurring && plan.weekdays.includes(dbDayIndex(date)) && !plan.excluded_dates?.includes(dateStr)) {
    return true;
  }
  return false;
}

const PLAN_SELECT = 'id, title, time_of_day, duration_minutes, course_id, weekdays, specific_date, recurring, excluded_dates, courses(name, color)';

export function usePlanCompletions(userId: string | undefined) {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // `rangeStart`/`rangeEnd` only bound which completions are fetched —
  // `plans` itself always holds every plan the user owns, since occurrence
  // matching (recurring/specific_date/excluded_dates) needs no date range.
  const fetchRange = useCallback(async (rangeStart: Date, rangeEnd: Date) => {
    if (!userId) return;
    const startStr = localDateStr(rangeStart);
    const endStr = localDateStr(rangeEnd);

    const [{ data: planData }, { data: compData }] = await Promise.all([
      supabase.from('study_plans').select(PLAN_SELECT).eq('user_id', userId),
      supabase.from('study_plan_completions')
        .select('plan_id, completed_on')
        .gte('completed_on', startStr)
        .lte('completed_on', endStr),
    ]);

    setPlans((planData ?? []) as unknown as StudyPlan[]);
    setCompletions(new Set((compData ?? []).map(c => `${c.plan_id}|${c.completed_on}`)));
    setLoading(false);
  }, [userId]);

  const occurrencesOn = useCallback(
    (date: Date) => plans.filter(p => occurrenceOn(p, date)),
    [plans],
  );

  const isDone = useCallback(
    (planId: string, date: Date) => completions.has(`${planId}|${localDateStr(date)}`),
    [completions],
  );

  const toggleDone = useCallback(async (planId: string, date: Date) => {
    const dateStr = localDateStr(date);
    const key = `${planId}|${dateStr}`;
    const wasDone = completions.has(key);

    setCompletions(prev => {
      const s = new Set(prev);
      if (wasDone) s.delete(key); else s.add(key);
      return s;
    });

    if (wasDone) {
      await supabase.from('study_plan_completions')
        .delete().eq('plan_id', planId).eq('completed_on', dateStr);
    } else {
      await supabase.from('study_plan_completions')
        .insert({ plan_id: planId, completed_on: dateStr });
    }
  }, [completions]);

  return { plans, setPlans, loading, fetchRange, occurrencesOn, isDone, toggleDone };
}
