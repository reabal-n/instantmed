-- Service waitlist for coming-soon services
create table if not exists public.service_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  service_id text not null,
  created_at timestamptz not null default now(),
  constraint service_waitlist_email_service_unique unique (email, service_id)
);

-- RLS: insert only, no read for anon
alter table public.service_waitlist enable row level security;

create policy "Anyone can join waitlist"
  on public.service_waitlist
  for insert
  to anon, authenticated
  with check (true);

-- Index for admin queries
create index idx_service_waitlist_service on public.service_waitlist (service_id, created_at desc);
