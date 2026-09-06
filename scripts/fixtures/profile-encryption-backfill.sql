-- Disposable synthetic schema: actual PostgreSQL/PostgREST CAS and row receipts.
-- No production data, project access, or environment files are used.
create role profile_backfill_fixture nologin;
create table public.profiles (
  id uuid primary key, email text, full_name text,
  date_of_birth date, date_of_birth_encrypted text,
  phone text, phone_encrypted text,
  medicare_number text, medicare_number_encrypted text,
  phi_encrypted_at timestamptz
);
create table public.encryption_migration_status (
  id uuid primary key default gen_random_uuid(), table_name text,
  total_records integer, encrypted_records integer default 0,
  error_count integer default 0, last_error text,
  started_at timestamptz default now(), completed_at timestamptz,
  updated_at timestamptz default now()
);
grant usage on schema public to profile_backfill_fixture;
grant all on public.profiles, public.encryption_migration_status to profile_backfill_fixture;
