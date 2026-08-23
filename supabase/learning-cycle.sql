-- WeldCheck learning-cycle migration.
-- Run once in the Supabase SQL editor after the original schema.sql.
-- Safe to run again. It preserves existing jobs and inspections.

create table if not exists public.exercise_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  material text not null default 'Mild steel',
  joint_type text not null,
  plate_thickness_min_mm numeric not null check (plate_thickness_min_mm > 0),
  plate_thickness_max_mm numeric not null check (plate_thickness_max_mm >= plate_thickness_min_mm),
  electrode_classification text not null,
  electrode_size_mm numeric not null check (electrode_size_mm > 0),
  current_min_amp numeric not null check (current_min_amp > 0),
  current_max_amp numeric not null check (current_max_amp >= current_min_amp),
  welding_position text not null,
  preparation_checks jsonb not null default '[]'::jsonb,
  expected_appearance jsonb not null default '[]'::jsonb,
  source_reference text not null,
  version integer not null default 1 check (version > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs add column if not exists exercise_template_id uuid references public.exercise_templates(id);
alter table public.jobs add column if not exists exercise_snapshot jsonb;

create table if not exists public.attempts (
  id uuid primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_no integer not null check (attempt_no > 0),
  previous_attempt_id uuid references public.attempts(id) on delete set null,
  plate_thickness_mm numeric not null check (plate_thickness_mm > 0),
  electrode_classification text not null,
  electrode_size_mm numeric not null check (electrode_size_mm > 0),
  welding_position text not null,
  current_amp numeric check (current_amp is null or current_amp > 0),
  checklist_json jsonb not null default '{}'::jsonb,
  readiness_status text not null default 'draft' check (readiness_status in ('draft','check_setup','ready')),
  readiness_issues jsonb not null default '[]'::jsonb,
  setup_issues_seen jsonb not null default '[]'::jsonb,
  correction_plan jsonb not null default '[]'::jsonb,
  correction_note text,
  supervisor_status text not null default 'unreviewed' check (supervisor_status in ('unreviewed','accepted','needs_attempt','incomplete')),
  reviewer_name text,
  supervisor_comment text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, attempt_no)
);

-- Keep drafts honest: the actual current remains blank until the learner records it.
alter table public.attempts alter column current_amp drop not null;
alter table public.attempts alter column current_amp drop default;
alter table public.attempts add column if not exists setup_issues_seen jsonb not null default '[]'::jsonb;

alter table public.inspections add column if not exists attempt_id uuid references public.attempts(id) on delete cascade;

alter table public.exercise_templates enable row level security;
alter table public.attempts enable row level security;

drop policy if exists "Authenticated users read active exercises" on public.exercise_templates;
create policy "Authenticated users read active exercises" on public.exercise_templates
for select to authenticated using (active = true);

drop policy if exists "Users own attempts" on public.attempts;
create policy "Users own attempts" on public.attempts for all to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (select 1 from public.jobs where jobs.id = job_id and jobs.user_id = auth.uid())
);

-- Preserve cloud records created by the earlier workflow as Attempt 1.
insert into public.attempts (
  id, job_id, user_id, attempt_no, plate_thickness_mm, electrode_classification,
  electrode_size_mm, welding_position, current_amp, checklist_json,
  readiness_status, created_at, updated_at
)
select
  gen_random_uuid(), j.id, j.user_id, 1, j.plate_thickness_mm,
  j.electrode_classification, j.electrode_size_mm, j.welding_position,
  j.current_amp, j.checklist_json,
  case when j.status in ('checklist_complete','inspected') then 'ready' else 'draft' end,
  j.created_at, j.updated_at
from public.jobs j
where not exists (select 1 from public.attempts a where a.job_id = j.id);

update public.inspections i
set attempt_id = a.id
from public.attempts a
where i.attempt_id is null and a.job_id = i.job_id and a.attempt_no = 1;

create index if not exists exercise_templates_active_idx on public.exercise_templates(active, name);
create index if not exists attempts_job_number_idx on public.attempts(job_id, attempt_no desc);
create index if not exists attempts_user_created_idx on public.attempts(user_id, created_at desc);
create index if not exists inspections_attempt_created_idx on public.inspections(attempt_id, created_at desc);

-- Add at least one supervisor-approved exercise before using the new workflow.
-- Do not copy example welding limits from documentation. Insert only values approved
-- for the actual workshop exercise and record their source in source_reference.
-- preparation_checks accepts either strings or objects such as:
-- [{"key":"surface_clean","text":"Weld area is clean","why":"Contamination has been removed before welding."}]
-- expected_appearance is a short JSON array of visible learning targets.
