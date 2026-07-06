-- ============================================================
-- Migration v4: user_usage – spåra kvoter per användare och månad
-- Kör i Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS user_usage (
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month            text NOT NULL,  -- 'YYYY-MM'
  uploads_count    int NOT NULL DEFAULT 0,
  generations_count int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_usage: own row" ON user_usage
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Funktion för att öka en counter med upsert (kallas från klient via rpc)
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id uuid,
  p_month   text,
  p_field   text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_usage (user_id, month, uploads_count, generations_count)
  VALUES (p_user_id, p_month, 0, 0)
  ON CONFLICT (user_id, month) DO NOTHING;

  IF p_field = 'uploads_count' THEN
    UPDATE user_usage SET uploads_count = uploads_count + 1
    WHERE user_id = p_user_id AND month = p_month;
  ELSIF p_field = 'generations_count' THEN
    UPDATE user_usage SET generations_count = generations_count + 1
    WHERE user_id = p_user_id AND month = p_month;
  END IF;
END;
$$;
