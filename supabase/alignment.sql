-- Academic traceability fields for existing WeldCheck projects.
-- Run after schema.sql and learning-cycle.sql. Safe to run again.

alter table public.inspections add column if not exists model_name text;
alter table public.inspections add column if not exists schema_version text;
alter table public.inspections add column if not exists prompt_version text;
alter table public.inspections add column if not exists app_version text;
alter table public.inspections add column if not exists reference_basis text;
alter table public.inspections add column if not exists reference_source text;
alter table public.inspections add column if not exists reference_assessed_at date;
alter table public.inspections add column if not exists reference_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inspections_reference_basis_check'
      and conrelid = 'public.inspections'::regclass
  ) then
    alter table public.inspections
      add constraint inspections_reference_basis_check
      check (reference_basis is null or reference_basis in ('supervisor_visual','prepared_sample','other'));
  end if;
end
$$;
