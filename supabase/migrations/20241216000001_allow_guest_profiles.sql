-- ============================================
-- ALLOW GUEST PROFILES MIGRATION
-- Generated: 2024-12-16
-- Purpose: Enable guest checkout by allowing profiles without auth_user_id
-- ============================================

-- 1. Drop the NOT NULL constraint on auth_user_id to allow guest profiles
-- Guest profiles are created during checkout before the user has an auth account
ALTER TABLE public.profiles 
ALTER COLUMN auth_user_id DROP NOT NULL;

-- 2. Add a partial unique index to ensure uniqueness only for authenticated profiles
-- This allows multiple guest profiles with NULL auth_user_id
-- But ensures only one profile per auth user
DROP INDEX IF EXISTS profiles_auth_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_unique 
ON public.profiles(auth_user_id) 
WHERE auth_user_id IS NOT NULL;

-- 3. Add an index to find guest profiles by email efficiently
CREATE INDEX IF NOT EXISTS idx_profiles_guest_email 
ON public.profiles(email) 
WHERE auth_user_id IS NULL;

-- 4. Update RLS policies to handle guest profiles
-- Allow service role to manage guest profiles (handled via service key, not RLS)

-- 5. Add a comment for documentation
COMMENT ON COLUMN public.profiles.auth_user_id IS 
'References auth.users. NULL for guest profiles created during checkout before account creation.';
