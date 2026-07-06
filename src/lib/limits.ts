import { supabase } from './supabase';

// ─── Free-tier quotas ────────────────────────────────────────────────────────
// Ändra dessa konstanter när freemium-nivåerna ändras.

export const FREE_UPLOADS_PER_MONTH = 3;
export const FREE_GENERATIONS_PER_MONTH = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

export interface UsageData {
  uploadsCount: number;
  generationsCount: number;
  uploadsRemaining: number;
  generationsRemaining: number;
}

export async function getUsage(userId: string): Promise<UsageData> {
  const month = currentMonth();
  const { data } = await supabase
    .from('user_usage')
    .select('uploads_count, generations_count')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle();

  const uploadsCount = data?.uploads_count ?? 0;
  const generationsCount = data?.generations_count ?? 0;
  return {
    uploadsCount,
    generationsCount,
    uploadsRemaining: Math.max(0, FREE_UPLOADS_PER_MONTH - uploadsCount),
    generationsRemaining: Math.max(0, FREE_GENERATIONS_PER_MONTH - generationsCount),
  };
}

export async function canUpload(userId: string): Promise<boolean> {
  const { uploadsRemaining } = await getUsage(userId);
  return uploadsRemaining > 0;
}

export async function incrementUploads(userId: string): Promise<void> {
  const month = currentMonth();
  await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_month: month,
    p_field: 'uploads_count',
  });
}

export async function incrementGenerations(userId: string): Promise<void> {
  const month = currentMonth();
  await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_month: month,
    p_field: 'generations_count',
  });
}
