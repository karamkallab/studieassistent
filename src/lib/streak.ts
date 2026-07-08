import { supabase } from './supabase';

/** Updates streak after a review session. Returns the new current streak. */
export async function updateStreak(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

  const { data: stats } = await supabase
    .from('user_stats')
    .select('current_streak, longest_streak, last_review_date')
    .eq('user_id', userId)
    .maybeSingle();

  if (stats?.last_review_date === today) {
    return stats.current_streak; // already counted today
  }

  let newStreak: number;
  if (!stats) {
    newStreak = 1;
  } else if (stats.last_review_date === yesterday) {
    newStreak = stats.current_streak + 1;
  } else {
    newStreak = 1;
  }

  const newLongest = Math.max(stats?.longest_streak ?? 0, newStreak);

  await supabase.from('user_stats').upsert({
    user_id: userId,
    current_streak: newStreak,
    longest_streak: newLongest,
    last_review_date: today,
  });

  return newStreak;
}

/** Fetches the current streak for display. Returns 0 if no stats yet. */
export async function getStreak(userId: string): Promise<number> {
  const { current } = await getStreakStats(userId);
  return current;
}

/** Fetches current + longest streak for display. Returns zeros if no stats yet. */
export async function getStreakStats(userId: string): Promise<{ current: number; longest: number }> {
  const { data } = await supabase
    .from('user_stats')
    .select('current_streak, longest_streak, last_review_date')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return { current: 0, longest: 0 };

  // Streak expires if last review was more than 1 day ago
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const current = (data.last_review_date < yesterday && data.last_review_date !== today) ? 0 : data.current_streak;

  return { current, longest: data.longest_streak ?? 0 };
}
