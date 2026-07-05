-- ============================================================
-- Migration v3: quiz_questions – lägg till course_id, gör document_id nullable
-- Kör i Supabase SQL Editor
-- ============================================================

DROP TABLE IF EXISTS quiz_questions CASCADE;

CREATE TABLE quiz_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  document_id    uuid REFERENCES documents(id) ON DELETE SET NULL,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question       text NOT NULL,
  options        jsonb NOT NULL DEFAULT '[]',
  correct_answer text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_questions: own rows" ON quiz_questions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
