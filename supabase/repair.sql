-- ============================================================
-- Repair: ta bort alla policies och återskapa från schema.sql
-- Kör detta OM du får "policy already exists"-fel.
-- ============================================================

-- Ta bort samtliga policies
DROP POLICY IF EXISTS "courses: own rows"            ON courses;
DROP POLICY IF EXISTS "documents: own rows"          ON documents;
DROP POLICY IF EXISTS "summaries: own rows"          ON summaries;
DROP POLICY IF EXISTS "flashcards: own rows"         ON flashcards;
DROP POLICY IF EXISTS "mindmaps: own rows"           ON mindmaps;
DROP POLICY IF EXISTS "quiz_questions: own rows"     ON quiz_questions;
DROP POLICY IF EXISTS "user_stats: own row"          ON user_stats;
DROP POLICY IF EXISTS "user_usage: own row"          ON user_usage;
DROP POLICY IF EXISTS "storage documents: own files" ON storage.objects;

-- Återskapa alla policies
CREATE POLICY "courses: own rows" ON courses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "documents: own rows" ON documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "summaries: own rows" ON summaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "flashcards: own rows" ON flashcards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mindmaps: own rows" ON mindmaps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quiz_questions: own rows" ON quiz_questions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_stats: own row" ON user_stats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_usage: own row" ON user_usage
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "storage documents: own files" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
