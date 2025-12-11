-- Create requests table with RLS
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('script', 'med_cert', 'referral', 'hair_loss', 'acne', 'ed', 'hsv', 'bv_partner')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'needs_follow_up')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create request_answers table with RLS
create table if not exists public.request_answers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz default now()
);

-- Enable RLS on both tables
alter table public.requests enable row level security;
alter table public.request_answers enable row level security;

-- RLS Policies for requests table

-- Patients can select their own requests
create policy "patients_select_own_requests"
  on public.requests for select
  using (
    patient_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  );

-- Doctors can select all requests
create policy "doctors_select_all_requests"
  on public.requests for select
  using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'doctor'
    )
  );

-- Patients can insert their own requests
create policy "patients_insert_own_requests"
  on public.requests for insert
  with check (
    patient_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  );

-- Doctors can update any request (to change status)
create policy "doctors_update_requests"
  on public.requests for update
  using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'doctor'
    )
  );

-- RLS Policies for request_answers table

-- Patients can select their own request answers
create policy "patients_select_own_answers"
  on public.request_answers for select
  using (
    request_id in (
      select r.id from public.requests r
      join public.profiles p on r.patient_id = p.id
      where p.auth_user_id = auth.uid()
    )
  );

-- Doctors can select all request answers
create policy "doctors_select_all_answers"
  on public.request_answers for select
  using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'doctor'
    )
  );

-- Patients can insert answers for their own requests
create policy "patients_insert_own_answers"
  on public.request_answers for insert
  with check (
    request_id in (
      select r.id from public.requests r
      join public.profiles p on r.patient_id = p.id
      where p.auth_user_id = auth.uid()
    )
  );

-- Create indexes for faster lookups
create index if not exists requests_patient_id_idx on public.requests(patient_id);
create index if not exists requests_status_idx on public.requests(status);
create index if not exists requests_created_at_idx on public.requests(created_at desc);
create index if not exists request_answers_request_id_idx on public.request_answers(request_id);
