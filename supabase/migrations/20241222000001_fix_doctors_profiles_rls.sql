-- ============================================
-- FIX DOCTORS PROFILES RLS POLICY
-- Generated: 2024-12-22
-- Purpose: Re-add the doctors_select_patients policy that was removed
-- in 20241216000002_fix_profiles_rls.sql
-- 
-- Without this policy, doctors cannot see patient profiles when
-- fetching requests with patient data, causing the admin dashboard
-- to show no requests.
-- ============================================

-- Ensure the is_doctor() helper function exists
CREATE OR REPLACE FUNCTION public.is_doctor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('doctor', 'admin')
  );
$$;

-- Ensure permissions
REVOKE ALL ON FUNCTION public.is_doctor() FROM public;
GRANT EXECUTE ON FUNCTION public.is_doctor() TO authenticated;

-- Drop the existing select policy and recreate with doctor access
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "doctors_select_patients" ON public.profiles;

-- Combined SELECT policy: users can see own profile OR doctors can see all
CREATE POLICY "profiles_select_own_or_doctor"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()  -- Users can always see their own profile
    OR is_doctor()              -- Doctors/admins can see all profiles
  );
