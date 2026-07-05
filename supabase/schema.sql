-- ============================================================
-- Studieassistenten – databasschema
-- Kör detta i Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- COURSES
create table if not exists courses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- DOCUMENTS (uppladdade PDF:er)
create table if not exists documents (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references courses(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  storage_path text not null,
  file_type    text not null default 'pdf',
  created_at   timestamptz not null default now()
);

-- SUMMARIES (AI-genererade sammanfattningar)
create table if not exists summaries (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

-- FLASHCARDS
create table if not exists flashcards (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  question    text not null,
  answer      text not null,
  created_at  timestamptz not null default now()
);

-- MINDMAPS (lagras som JSON)
create table if not exists mindmaps (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- QUIZ QUESTIONS
create table if not exists quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  document_id    uuid not null references documents(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  question       text not null,
  options        jsonb not null default '[]',
  correct_answer text not null,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- Row Level Security – alla tabeller
-- ============================================================

alter table courses        enable row level security;
alter table documents      enable row level security;
alter table summaries      enable row level security;
alter table flashcards     enable row level security;
alter table mindmaps       enable row level security;
alter table quiz_questions enable row level security;

-- Policies: användare ser/ändrar bara sin egen data
create policy "courses: own rows" on courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "documents: own rows" on documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "summaries: own rows" on summaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "flashcards: own rows" on flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "mindmaps: own rows" on mindmaps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "quiz_questions: own rows" on quiz_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Storage: bucket för PDF-dokument
-- ============================================================
-- Skapa bucket via Dashboard: Storage → New bucket → "documents" (private)
-- Eller kör via SQL:
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Storage RLS: användare når bara sina egna filer (sökväg börjar med user_id/)
create policy "storage documents: own files" on storage.objects
  for all
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
