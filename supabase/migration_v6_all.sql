-- ============================================================
-- Migration v6: match_scores, study_plans, user_settings, focus_sessions
-- Kör i Supabase SQL Editor
-- ============================================================

-- Etapp A: Bästa matcha-tider per kurs
CREATE TABLE IF NOT EXISTS match_scores (
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id         uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  best_time_seconds int  NOT NULL,
  achieved_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "match_scores: own rows" ON match_scores
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Etapp B: Studiepass
CREATE TABLE IF NOT EXISTS study_plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id        uuid REFERENCES courses(id) ON DELETE SET NULL,
  title            text NOT NULL,
  weekdays         int[] NOT NULL DEFAULT '{}',  -- 0=Mån .. 6=Sön
  specific_date    date,
  time_of_day      time NOT NULL DEFAULT '09:00',
  duration_minutes int NOT NULL DEFAULT 25,
  recurring        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "study_plans: own rows" ON study_plans
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

CREATE TABLE IF NOT EXISTS study_plan_completions (
  plan_id      uuid NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  completed_on date NOT NULL,
  PRIMARY KEY (plan_id, completed_on)
);
ALTER TABLE study_plan_completions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "study_plan_completions: via plan" ON study_plan_completions
    FOR ALL USING (
      EXISTS (SELECT 1 FROM study_plans WHERE id = plan_id AND user_id = auth.uid())
    );
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Etapp C & D: Användarisnställningar
CREATE TABLE IF NOT EXISTS user_settings (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_review_enabled boolean NOT NULL DEFAULT true,
  daily_review_hour    int NOT NULL DEFAULT 17,
  daily_review_minute  int NOT NULL DEFAULT 0,
  study_plan_notifs    boolean NOT NULL DEFAULT true,
  focus_notifs         boolean NOT NULL DEFAULT true,
  focus_work_minutes   int NOT NULL DEFAULT 25,
  focus_break_minutes  int NOT NULL DEFAULT 5
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "user_settings: own row" ON user_settings
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Etapp D: Fokussessioner
CREATE TABLE IF NOT EXISTS focus_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id    uuid REFERENCES courses(id) ON DELETE SET NULL,
  minutes      int NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN CREATE POLICY "focus_sessions: own rows" ON focus_sessions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
