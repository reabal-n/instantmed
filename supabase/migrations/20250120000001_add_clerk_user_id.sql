-- ============================================
-- Add Clerk user ID to profiles for hybrid auth
-- ============================================

-- Add clerk_user_id column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- Create index for clerk_user_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id 
ON public.profiles(clerk_user_id) 
WHERE clerk_user_id IS NOT NULL;

-- Make auth_user_id nullable for Clerk-only users
ALTER TABLE public.profiles 
ALTER COLUMN auth_user_id DROP NOT NULL;

-- Drop the foreign key constraint temporarily for Clerk users
-- (Clerk users won't have auth.users entries)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_user_id_fkey;

-- Re-add constraint but allow NULL
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_auth_user_id_fkey 
FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- Update RLS policies to support Clerk auth
-- ============================================

-- Helper function to get current user's clerk_user_id from JWT
CREATE OR REPLACE FUNCTION public.requesting_clerk_user_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    NULL
  );
$$ LANGUAGE sql STABLE;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policies that support both Supabase and Clerk auth
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = auth_user_id 
    OR clerk_user_id = public.requesting_clerk_user_id()
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = auth_user_id 
    OR clerk_user_id = public.requesting_clerk_user_id()
  )
  WITH CHECK (
    (auth.uid() = auth_user_id OR clerk_user_id = public.requesting_clerk_user_id())
    AND role = (
      SELECT role FROM public.profiles 
      WHERE auth_user_id = auth.uid() OR clerk_user_id = public.requesting_clerk_user_id()
      LIMIT 1
    )
  );

-- Allow insert for service role (webhook creates profiles)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

COMMENT ON COLUMN public.profiles.clerk_user_id IS 'Clerk user ID for hybrid auth - synced via webhook';
