-- Track patient account closure separately from retained clinical/payment/audit records.
alter table public.profiles
  add column if not exists account_closed_at timestamptz,
  add column if not exists account_closure_reason text;

comment on column public.profiles.account_closed_at is
  'Timestamp when patient sign-in access was closed. Retained clinical, payment, and audit records remain linked by profile id.';

comment on column public.profiles.account_closure_reason is
  'Reason code for profile account closure, for example self_service.';

create index if not exists idx_profiles_account_closed_at
  on public.profiles(account_closed_at)
  where account_closed_at is not null;
