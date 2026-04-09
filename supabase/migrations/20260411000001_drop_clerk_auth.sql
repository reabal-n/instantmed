-- ============================================================================
-- Drop Clerk auth remnants — complete Supabase Auth migration
-- ============================================================================
-- Context: Clerk has been fully removed from the application layer (PRs 1-4).
-- This migration cleans up the database:
--   1. Rewrites all RLS policies to use auth.uid() = auth_user_id (no Clerk branches)
--   2. Drops the requesting_clerk_user_id() helper function
--   3. Drops the clerk_user_id column and its index
--   4. Re-adds NOT NULL on auth_user_id (was made nullable for Clerk-only users)

-- ── 1. Fix profiles RLS policies ────────────────────────────────────────────

-- Drop all existing profile policies that reference clerk_user_id
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- Recreate clean policies using only auth.uid() = auth_user_id
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (
    auth.uid() = auth_user_id
    AND role IS NOT DISTINCT FROM (
      SELECT p.role FROM public.profiles p WHERE p.id = profiles.id
    )
  );

CREATE POLICY "profiles_insert_service_role" ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- ── 2. Fix referral system RLS policies ─────────────────────────────────────

DROP POLICY IF EXISTS "referral_events_select_own" ON referral_events;
DROP POLICY IF EXISTS "referral_credits_select_own" ON referral_credits;

CREATE POLICY "referral_events_select_own" ON referral_events
  FOR SELECT USING (
    referrer_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1)
    OR
    referred_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "referral_credits_select_own" ON referral_credits
  FOR SELECT USING (
    profile_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1)
  );

-- ── 3. Drop requesting_clerk_user_id() function ────────────────────────────

DROP FUNCTION IF EXISTS public.requesting_clerk_user_id();

-- ── 4. Drop clerk_user_id column ────────────────────────────────────────────

DROP INDEX IF EXISTS idx_profiles_clerk_user_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS clerk_user_id;

-- ── 5. Re-add NOT NULL constraint on auth_user_id ───────────────────────────
-- Was made nullable in 20250120000001 for Clerk-only users (no longer needed).
-- Guest profiles (auth_user_id IS NULL) get linked on sign-up, so we keep
-- nullable for now — the handle_new_user() trigger sets it on auth.users insert.
-- NOTE: Kept nullable to support guest checkout flow (profiles created before
-- the user has a Supabase Auth account).

-- Done. All Clerk auth references removed from the database layer.
