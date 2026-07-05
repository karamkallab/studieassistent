-- ============================================================
-- Migration v2: flashcard SM-2 fields + course_id + user_stats
-- Kör i Supabase SQL Editor efter schema.sql
-- ============================================================

-- Drop och återskapa flashcards med SM-2-fält och course_id
-- (Om tabellen redan har data, använd ALTER TABLE istället)
DROP TABLE IF EXISTS flashcards CASCADE;

CREATE TABLE flashcards (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  document_id    uuid REFERENCES documents(id) ON DELETE SET NULL, -- nullable: manuella kort
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question       text NOT NULL,
  answer         text NOT NULL,
  ease_factor    float NOT NULL DEFAULT 2.5,
  interval_days  int NOT NULL DEFAULT 0,
  repetitions    int NOT NULL DEFAULT 0,
  next_review_at timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flashcards: own rows" ON flashcards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User stats (streak m.m.)
CREATE TABLE IF NOT EXISTS user_stats (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak   int NOT NULL DEFAULT 0,
  longest_streak   int NOT NULL DEFAULT 0,
  last_review_date date
);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_stats: own row" ON user_stats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
