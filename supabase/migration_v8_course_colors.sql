-- ============================================================
-- Migration v8: färgkodning per kurs
-- Kör i Supabase SQL Editor
-- ============================================================

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#5B6ABF';

-- Backfill: tilldela distinkta palettfärger round-robin per användare,
-- ordnat efter created_at. Rör bara rader som fortfarande har
-- standardvärdet, så en omkörning aldrig skriver över en färg någon
-- redan valt manuellt.
DO $$
DECLARE
  palette text[] := ARRAY['#5B6ABF','#6B8F71','#C08552','#8E5B7A','#4A7A8C','#C1666B'];
BEGIN
  UPDATE courses c
  SET color = palette[((sub.rn - 1) % array_length(palette,1)) + 1]
  FROM (
    SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
    FROM courses
    WHERE color = '#5B6ABF'
  ) sub
  WHERE c.id = sub.id;
END $$;
