-- ============================================================
-- Studieassistenten – databasschema (idempotent)
-- Kör i Supabase SQL Editor. Säker att köra flera gånger.
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
  generated_at timestamptz,
  created_at   timestamptz not null default now()
);

-- SUMMARIES
create table if not exists summaries (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references courses(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

-- FLASHCARDS (med SM-2-fält)
create table if not exists flashcards (
  id             uuid primary key default gen_random_uuid(),
  course_id      uuid not null references courses(id) on delete cascade,
  document_id    uuid references documents(id) on delete set null,
  user_id        uuid not null references auth.users(id) on delete cascade,
  question       text not null,
  answer         text not null,
  ease_factor    float not null default 2.5,
  interval_days  int not null default 0,
  repetitions    int not null default 0,
  next_review_at timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

-- MINDMAPS
create table if not exists mindmaps (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- QUIZ QUESTIONS
create table if not exists quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  course_id      uuid not null references courses(id) on delete cascade,
  document_id    uuid references documents(id) on delete set null,
  user_id        uuid not null references auth.users(id) on delete cascade,
  question       text not null,
  options        jsonb not null default '[]',
  correct_answer text not null,
  created_at     timestamptz not null default now()
);

-- USER STATS (streak)
create table if not exists user_stats (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  current_streak   int not null default 0,
  longest_streak   int not null default 0,
  last_review_date date
);

-- USER USAGE (freemium-kvoter)
create table if not exists user_usage (
  user_id           uuid not null references auth.users(id) on delete cascade,
  month             text not null,
  uploads_count     int not null default 0,
  generations_count int not null default 0,
  primary key (user_id, month)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table courses        enable row level security;
alter table documents      enable row level security;
alter table summaries      enable row level security;
alter table flashcards     enable row level security;
alter table mindmaps       enable row level security;
alter table quiz_questions enable row level security;
alter table user_stats     enable row level security;
alter table user_usage     enable row level security;

-- DROP + CREATE för att vara idempotent (CREATE POLICY har ingen IF NOT EXISTS)
drop policy if exists "courses: own rows"        on courses;
drop policy if exists "documents: own rows"      on documents;
drop policy if exists "summaries: own rows"      on summaries;
drop policy if exists "flashcards: own rows"     on flashcards;
drop policy if exists "mindmaps: own rows"       on mindmaps;
drop policy if exists "quiz_questions: own rows" on quiz_questions;
drop policy if exists "user_stats: own row"      on user_stats;
drop policy if exists "user_usage: own row"      on user_usage;
drop policy if exists "storage documents: own files" on storage.objects;

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

create policy "user_stats: own row" on user_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_usage: own row" on user_usage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Storage: bucket för PDF-dokument
-- ============================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

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

-- ============================================================
-- increment_usage-funktion (för freemium-kvoter)
-- ============================================================
create or replace function increment_usage(
  p_user_id uuid,
  p_month   text,
  p_field   text
) returns void language plpgsql security definer as $$
begin
  insert into user_usage (user_id, month, uploads_count, generations_count)
  values (p_user_id, p_month, 0, 0)
  on conflict (user_id, month) do nothing;

  if p_field = 'uploads_count' then
    update user_usage set uploads_count = uploads_count + 1
    where user_id = p_user_id and month = p_month;
  elsif p_field = 'generations_count' then
    update user_usage set generations_count = generations_count + 1
    where user_id = p_user_id and month = p_month;
  end if;
end;
$$;
