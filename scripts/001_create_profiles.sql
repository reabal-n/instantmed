-- Create profiles table with RLS
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  full_name text not null,
  date_of_birth date not null,
  role text not null check (role in ('patient', 'doctor')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policy: Users can read their own profile
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = auth_user_id);

-- Policy: Users can insert their own profile
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = auth_user_id);

-- Policy: Users can update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = auth_user_id);

-- Policy: Doctors can read all patient profiles (for viewing requests)
create policy "doctors_select_patients"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'doctor'
    )
  );

-- Create index for faster lookups
create index if not exists profiles_auth_user_id_idx on public.profiles(auth_user_id);
create index if not exists profiles_role_idx on public.profiles(role);
