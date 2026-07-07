-- ============================================================
-- Migration v7: undantag för enskilda tillfällen av återkommande studiepass
-- Kör i Supabase SQL Editor
-- ============================================================

ALTER TABLE study_plans
  ADD COLUMN IF NOT EXISTS excluded_dates jsonb NOT NULL DEFAULT '[]'::jsonb;

-- RLS: study_plans har redan policyn "study_plans: own rows" med FOR ALL
-- (auth.uid() = user_id), som täcker SELECT/INSERT/UPDATE/DELETE. Ingen
-- ny policy behövs för excluded_dates-kolumnen eller för DELETE.
