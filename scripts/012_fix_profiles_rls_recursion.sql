-- Fix infinite recursion in profiles RLS policies
-- The issue is that doctors_select_patients policy likely checks profiles table
-- which triggers the same policy again, causing infinite recursion.

-- Drop existing problematic policies
DROP POLICY IF EXISTS "doctors_select_patients" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Recreate policies using auth.uid() directly without subqueries to profiles table

-- Policy: Users can select their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Policy: Users can insert their own profile
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- Policy: Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Policy: Doctors can view all patient profiles
-- Use a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_doctor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid()
    AND role = 'doctor'
  );
$$;

-- Now create the doctor policy using the function
CREATE POLICY "doctors_select_patients" ON profiles
  FOR SELECT
  USING (
    auth.uid() = auth_user_id  -- Users can always see their own profile
    OR public.is_doctor()       -- Doctors can see all profiles
  );

-- Note: The security definer function runs with the privileges of the function owner
-- (typically the database owner), bypassing RLS, which breaks the recursion cycle.
