-- ============================================
-- ALLOW GUEST PROFILES MIGRATION
-- Generated: 2024-12-16
-- Purpose: Enable guest checkout by allowing profiles without auth_user_id
-- ============================================

-- 1. Add email column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Add onboarding_completed column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 3. Populate email from auth.users for existing profiles
UPDATE public.profiles p 
SET email = u.email 
FROM auth.users u 
WHERE p.auth_user_id = u.id AND p.email IS NULL;

-- 4. Drop the UNIQUE constraint on auth_user_id (required before allowing NULLs)
-- This constraint prevents multiple NULL values which we need for guest profiles
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_user_id_key;

-- 5. Drop any regular index on auth_user_id (cleanup)
DROP INDEX IF EXISTS profiles_auth_user_id_idx;

-- 6. Drop the NOT NULL constraint on auth_user_id to allow guest profiles
ALTER TABLE public.profiles 
ALTER COLUMN auth_user_id DROP NOT NULL;

-- 7. Re-add uniqueness as a partial index (only for non-null values)
-- This allows multiple NULLs while keeping authenticated users unique
CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_unique 
ON public.profiles(auth_user_id) 
WHERE auth_user_id IS NOT NULL;

-- 8. Add index on email for all profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON public.profiles(email);

-- 9. Add an index to find guest profiles by email efficiently
CREATE INDEX IF NOT EXISTS idx_profiles_guest_email 
ON public.profiles(email) 
WHERE auth_user_id IS NULL;
