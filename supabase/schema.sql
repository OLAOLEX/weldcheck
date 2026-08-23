-- Run once in the Supabase SQL editor. Safe to run again.
create extension if not exists pgcrypto;

create table if not exists public.jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sample_no text not null,
  job_name text,
  material text not null default 'Mild steel',
  joint_type text not null,
  plate_thickness_mm numeric not null check (plate_thickness_mm > 0),
  electrode_classification text not null,
  electrode_size_mm numeric not null check (electrode_size_mm > 0),
  welding_position text not null,
  current_amp numeric not null check (current_amp > 0),
  operator_name text,
  job_date date,
  note text,
  checklist_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','checklist_complete','inspected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspections (
  id uuid primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text,
  status text not null check (status in ('acceptable','visible_issues','retake')),
  confidence_level text not null check (confidence_level in ('low','medium','high')),
  confidence_reason text not null,
  image_quality_status text not null,
  image_quality_issues jsonb not null default '[]'::jsonb,
  summary text not null,
  conditions jsonb not null default '[]'::jsonb,
  observations jsonb not null default '[]'::jsonb,
  assessment_reason text not null,
  possible_causes jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  metrics_json jsonb not null default '{}'::jsonb,
  engine text not null default 'ai',
  response_time_ms integer not null default 0,
  human_verdict text check (human_verdict is null or human_verdict in ('matches','corrected','not_sure')),
  corrected_conditions jsonb not null default '[]'::jsonb,
  reference_conditions jsonb not null default '[]'::jsonb,
  comparison_result text check (comparison_result is null or comparison_result in ('exact','partial','no_match')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  checks integer not null default 0,
  primary key (user_id, usage_date)
);

alter table public.jobs enable row level security;
alter table public.inspections enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists "Users own jobs" on public.jobs;
create policy "Users own jobs" on public.jobs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users own inspections" on public.inspections;
create policy "Users own inspections" on public.inspections for all to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (select 1 from public.jobs where jobs.id = job_id and jobs.user_id = auth.uid())
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('weld-images', 'weld-images', false, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users own weld images" on storage.objects;
create policy "Users own weld images" on storage.objects for all to authenticated
using (bucket_id = 'weld-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'weld-images' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.claim_ai_check(p_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_checks integer;
begin
  if auth.uid() is null then return false; end if;
  insert into public.ai_usage(user_id, usage_date, checks) values (auth.uid(), current_date, 1)
  on conflict (user_id, usage_date) do update set checks = public.ai_usage.checks + 1
  returning checks into current_checks;
  return current_checks <= greatest(1, p_limit);
end;
$$;
revoke all on function public.claim_ai_check(integer) from public;
grant execute on function public.claim_ai_check(integer) to authenticated;

create index if not exists jobs_user_created_idx on public.jobs(user_id, created_at desc);
create index if not exists inspections_job_created_idx on public.inspections(job_id, created_at desc);
create index if not exists inspections_user_created_idx on public.inspections(user_id, created_at desc);
