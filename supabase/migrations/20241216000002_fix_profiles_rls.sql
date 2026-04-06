-- ============================================
-- FIX PROFILES RLS POLICIES
-- Generated: 2024-12-16
-- Purpose: Delete ALL existing policies and create ONLY 3 simple policies
-- ============================================

-- Drop ALL existing profiles policies (comprehensive list)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "doctors_select_patients" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ONLY 3 POLICIES - NO COMPLEXITY
-- ============================================

-- INSERT: authenticated users only, auth_user_id must equal auth.uid()
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- SELECT: authenticated users only, auth_user_id must equal auth.uid()
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- UPDATE: authenticated users only, auth_user_id must equal auth.uid()
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
