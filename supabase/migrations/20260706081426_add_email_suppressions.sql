-- Email-keyed marketing suppression list.
--
-- Why: partial-intake draft recovery emails go to recipients who may have no
-- profile row, so email_preferences (keyed on profile_id) cannot hold their
-- opt-out. Spam Act s18 requires a functional unsubscribe on every commercial
-- email — this table is where an account-less unsubscribe lands (written by
-- /api/unsubscribe when the token is email-keyed; read by marketing senders
-- before dispatch).
--
-- Additive and service-role only. Stores the lowercased address, nothing else.

create table if not exists public.email_suppressions (
  email_lower text primary key,
  reason text not null default 'unsubscribe_link',
  created_at timestamptz not null default now()
);

alter table public.email_suppressions enable row level security;

-- No policies on purpose: only the service role (which bypasses RLS) may
-- read or write. Mirrors the lockdown posture of other PHI-adjacent surfaces.
revoke all on table public.email_suppressions from anon, authenticated;
