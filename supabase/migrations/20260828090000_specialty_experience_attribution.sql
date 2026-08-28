-- Privacy-safe product-experience cohort carried beside, never inside,
-- clinical intake answers. Application code owns the exact version registry;
-- the database owns bounded shape and write-once lifecycle semantics.

alter table public.partial_intakes
  add column if not exists growth_experience_version text;

alter table public.partial_intakes
  drop constraint if exists partial_intakes_growth_experience_version_check;
alter table public.partial_intakes
  add constraint partial_intakes_growth_experience_version_check
  check (
    growth_experience_version is null
    or (
      char_length(growth_experience_version) <= 64
      and growth_experience_version ~ '^spx_[a-z0-9_]+$'
    )
  );

comment on column public.partial_intakes.growth_experience_version is
  'Nullable opaque non-clinical product-experience version; contains no patient, acquisition-click, or clinical-answer data.';

alter table public.intakes
  add column if not exists growth_experience_version text;

alter table public.intakes
  drop constraint if exists intakes_growth_experience_version_check;
alter table public.intakes
  add constraint intakes_growth_experience_version_check
  check (
    growth_experience_version is null
    or (
      char_length(growth_experience_version) <= 64
      and growth_experience_version ~ '^spx_[a-z0-9_]+$'
    )
  );

comment on column public.intakes.growth_experience_version is
  'Nullable opaque non-clinical product-experience version fixed when the intake is realised; contains no patient, acquisition-click, or clinical-answer data.';

create or replace function public.preserve_partial_intake_growth_experience()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- First non-null wins. A delayed/null/later-version upsert cannot erase or
  -- replace the cohort already owned by this bearer session.
  new.growth_experience_version := coalesce(
    old.growth_experience_version,
    new.growth_experience_version
  );
  return new;
end;
$$;

revoke all on function public.preserve_partial_intake_growth_experience()
  from public, anon, authenticated;

drop trigger if exists trg_partial_intakes_preserve_growth_experience
  on public.partial_intakes;
create trigger trg_partial_intakes_preserve_growth_experience
  before update of growth_experience_version on public.partial_intakes
  for each row execute function public.preserve_partial_intake_growth_experience();

create or replace function public.enforce_intake_growth_experience_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.growth_experience_version is distinct from old.growth_experience_version then
    raise exception 'intake_growth_experience_immutable'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_intake_growth_experience_immutable()
  from public, anon, authenticated;

drop trigger if exists trg_intakes_growth_experience_immutable
  on public.intakes;
create trigger trg_intakes_growth_experience_immutable
  before update of growth_experience_version on public.intakes
  for each row execute function public.enforce_intake_growth_experience_immutable();
