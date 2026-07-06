-- ============================================================
-- Migration v5: fullständig schemafix för AI-integrationen
-- Kör i Supabase SQL Editor
-- ============================================================

-- 1. Lägg till course_id och gör document_id nullable på mindmaps
DROP TABLE IF EXISTS mindmaps CASCADE;
CREATE TABLE mindmaps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mindmaps: own rows" ON mindmaps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Lägg till course_id och gör document_id nullable på summaries
DROP TABLE IF EXISTS summaries CASCADE;
CREATE TABLE summaries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "summaries: own rows" ON summaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Lägg till generated_at på documents (för att veta om studiematerial är klart)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS generated_at timestamptz;
