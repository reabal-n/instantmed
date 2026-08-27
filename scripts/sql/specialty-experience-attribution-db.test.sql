\set ON_ERROR_STOP on

begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partial_intakes'
      and column_name = 'growth_experience_version'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'intakes'
      and column_name = 'growth_experience_version'
  ) then
    raise exception 'specialty attribution migration has not been applied locally';
  end if;

  if (
    select count(*)
    from pg_trigger
    where tgrelid = 'public.partial_intakes'::regclass
      and not tgisinternal
      and tgname in (
        'trg_partial_intakes_set_updated_at',
        'trg_partial_intakes_preserve_flow_identity',
        'trg_partial_intakes_preserve_growth_experience'
      )
  ) <> 3 then
    raise exception 'partial intake lifecycle triggers do not coexist';
  end if;
end;
$$;

insert into public.partial_intakes (
  session_id,
  service_type,
  growth_experience_version
) values (
  '41000000-0000-4000-8000-000000000001',
  'consult',
  null
);

update public.partial_intakes
set growth_experience_version = 'spx_h1_20260828'
where session_id = '41000000-0000-4000-8000-000000000001';

do $$
declare actual text;
begin
  select growth_experience_version into actual
  from public.partial_intakes
  where session_id = '41000000-0000-4000-8000-000000000001';
  if actual is distinct from 'spx_h1_20260828' then
    raise exception 'null to value did not persist';
  end if;
end;
$$;

update public.partial_intakes
set growth_experience_version = 'spx_h3_20260828'
where session_id = '41000000-0000-4000-8000-000000000001';
update public.partial_intakes
set growth_experience_version = null
where session_id = '41000000-0000-4000-8000-000000000001';

do $$
declare actual text;
begin
  select growth_experience_version into actual
  from public.partial_intakes
  where session_id = '41000000-0000-4000-8000-000000000001';
  if actual is distinct from 'spx_h1_20260828' then
    raise exception 'stored partial intake cohort was replaced or cleared';
  end if;

  begin
    update public.partial_intakes
    set service_type = 'prescription'
    where session_id = '41000000-0000-4000-8000-000000000001';
    raise exception 'service identity update unexpectedly succeeded';
  exception when check_violation then
    if sqlerrm <> 'draft_session_service_mismatch' then
      raise;
    end if;
  end;
end;
$$;

insert into public.partial_intakes (
  session_id,
  service_type,
  flow_instance_id,
  growth_experience_version
) values (
  '41000000-0000-4000-8000-000000000002',
  'consult',
  null,
  'spx_h1_20260828'
);

select * from public.claim_partial_intake_draft_for_checkout(
  '41000000-0000-4000-8000-000000000002',
  '42000000-0000-4000-8000-000000000001',
  'consult'
);

do $$
declare actual_flow uuid;
declare actual_growth text;
begin
  select flow_instance_id, growth_experience_version
  into actual_flow, actual_growth
  from public.partial_intakes
  where session_id = '41000000-0000-4000-8000-000000000002';
  if actual_flow is distinct from '42000000-0000-4000-8000-000000000001'::uuid
    or actual_growth is distinct from 'spx_h1_20260828' then
    raise exception 'checkout claim RPC did not preserve cohort while claiming flow';
  end if;

  begin
    perform * from public.claim_partial_intake_draft_for_checkout(
      '41000000-0000-4000-8000-000000000002',
      '42000000-0000-4000-8000-000000000002',
      'consult'
    );
    raise exception 'second flow claim unexpectedly succeeded';
  exception when check_violation then
    if sqlerrm <> 'draft_session_flow_mismatch' then
      raise;
    end if;
  end;
end;
$$;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '43000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'specialty-db-contract@example.test',
  '',
  now(),
  '{}',
  '{"full_name":"Specialty DB Contract"}',
  now(),
  now()
);

insert into public.intakes (
  patient_id,
  service_id,
  category,
  subtype,
  growth_experience_version
)
select
  profile.id,
  service.id,
  'consult',
  'hair_loss',
  'spx_h1_20260828'
from public.profiles as profile
cross join lateral (
  select id from public.services where slug = 'mens-health-hair' limit 1
) as service
where profile.auth_user_id = '43000000-0000-4000-8000-000000000001';

do $$
declare test_intake_id uuid;
begin
  select intake.id into test_intake_id
  from public.intakes as intake
  join public.profiles as profile on profile.id = intake.patient_id
  where profile.auth_user_id = '43000000-0000-4000-8000-000000000001';

  if test_intake_id is null then
    raise exception 'test intake was not created';
  end if;

  begin
    update public.intakes
    set growth_experience_version = 'spx_h3_20260828'
    where id = test_intake_id;
    raise exception 'realised intake cohort replacement unexpectedly succeeded';
  exception when check_violation then
    if sqlerrm <> 'intake_growth_experience_immutable' then
      raise;
    end if;
  end;

  begin
    update public.intakes
    set growth_experience_version = null
    where id = test_intake_id;
    raise exception 'realised intake cohort clear unexpectedly succeeded';
  exception when check_violation then
    if sqlerrm <> 'intake_growth_experience_immutable' then
      raise;
    end if;
  end;
end;
$$;

rollback;
