-- ============================================
-- ALLOW GUEST PROFILES MIGRATION
-- Generated: 2024-12-16
-- Purpose: Enable guest checkout by allowing profiles without auth_user_id
-- ============================================

-- 1. Drop the UNIQUE constraint first (it owns the index)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_user_id_key;

-- 2. Drop the NOT NULL constraint on auth_user_id to allow guest profiles
ALTER TABLE public.profiles 
ALTER COLUMN auth_user_id DROP NOT NULL;

-- 3. Re-add uniqueness as a partial index (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_unique 
ON public.profiles(auth_user_id) 
WHERE auth_user_id IS NOT NULL;

-- 4. Add an index to find guest profiles by email efficiently
CREATE INDEX IF NOT EXISTS idx_profiles_guest_email 
ON public.profiles(email) 
WHERE auth_user_id IS NULL;
