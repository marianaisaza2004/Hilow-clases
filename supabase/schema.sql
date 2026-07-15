-- HiLow Planner schema.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).
--
-- There's no per-coach Supabase Auth session — the app gates access with a
-- single shared password at the Next.js layer (see lib/auth.ts). Because of
-- that, RLS is enabled on every table with NO anon-role policies: the anon/
-- public key can't read or write anything. All access goes through Next.js
-- API routes / server components using the service role key, which bypasses
-- RLS entirely.

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name_es text not null,
  name_en text,
  muscle_group_section text not null,
  muscle_group_primary text[] not null default '{}',
  muscle_group_secondary text[] not null default '{}',
  level_springs jsonb not null default '{}'::jsonb, -- { basico, intermedio, avanzado }
  duration_min_seconds integer,
  muscular_action text,
  starting_position text,
  movement text,
  cues_considerations text,
  modifications text,
  amplifications text,
  variations text,
  related_exercises text[] not null default '{}',
  common_errors text,
  focus_notes text,
  source_page_range int4range,
  is_minimal_entry boolean not null default false, -- true for brief "ADICIONALES"-style stubs
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exercises_muscle_group_section_idx on exercises (muscle_group_section);

create table if not exists monthly_plans (
  id uuid primary key default gen_random_uuid(),
  plan_month date not null, -- first day of the month, e.g. 2026-08-01
  day_number integer not null,
  lower_focus text not null,
  upper_focus text not null,
  blocks jsonb not null, -- { core: [...], lower: [...], upper: [...], finisher: [...] }
  generated_at timestamptz not null default now(),
  last_edited_by text,
  last_edited_at timestamptz,
  unique (plan_month, day_number)
);

create index if not exists monthly_plans_month_idx on monthly_plans (plan_month);

create table if not exists document_uploads (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null,
  status text not null default 'pending_review' check (status in ('pending_review', 'merged', 'rejected')),
  parsed_candidates jsonb not null default '[]'::jsonb,
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table exercises enable row level security;
alter table monthly_plans enable row level security;
alter table document_uploads enable row level security;

-- Intentionally no policies for the anon/authenticated roles: only the
-- service role (used server-side) can read or write these tables.
