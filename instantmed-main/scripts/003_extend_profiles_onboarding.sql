-- Extend profiles table with Medicare + address fields for patient onboarding

-- Add contact & address fields
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists address_line1 text;
alter table public.profiles add column if not exists suburb text;
alter table public.profiles add column if not exists state text check (state is null or state in ('ACT','NSW','NT','QLD','SA','TAS','VIC','WA'));
alter table public.profiles add column if not exists postcode text;

-- Add Medicare fields
alter table public.profiles add column if not exists medicare_number text;
alter table public.profiles add column if not exists medicare_irn smallint check (medicare_irn is null or medicare_irn between 1 and 5);
alter table public.profiles add column if not exists medicare_expiry date;

-- Add consent and onboarding status
alter table public.profiles add column if not exists consent_myhr boolean default false;
alter table public.profiles add column if not exists onboarding_completed boolean default false;

-- Create indexes for faster lookups
create index if not exists profiles_onboarding_idx on public.profiles(onboarding_completed) where role = 'patient';
