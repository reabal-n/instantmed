-- ============================================================================
-- Drop Clerk auth remnants — complete Supabase Auth migration
-- ============================================================================
-- Context: Clerk has been fully removed from the application layer (PRs 1-4).
-- This migration cleans up the database:
--   1. Rewrites all RLS policies to use auth.uid() = auth_user_id (no Clerk branches)
--   2. Drops the requesting_clerk_user_id() helper function
--   3. Drops the clerk_user_id column and its index
--   4. Keeps auth_user_id nullable for guest checkout flow

-- ── 1. Fix profiles RLS policies ────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

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

-- ── 3. Fix delivery_tracking RLS policy ─────────────────────────────────────
-- This policy referenced requesting_clerk_user_id() — must drop before the function

DROP POLICY IF EXISTS "Doctors can view delivery tracking" ON delivery_tracking;

CREATE POLICY "Doctors can view delivery tracking" ON delivery_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role = 'doctor'
    )
  );

-- ── 4. Drop requesting_clerk_user_id() function ────────────────────────────

DROP FUNCTION IF EXISTS public.requesting_clerk_user_id();

-- ── 5. Drop clerk_user_id column ────────────────────────────────────────────

DROP INDEX IF EXISTS idx_profiles_clerk_user_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS clerk_user_id;

-- ── 6. Keep auth_user_id nullable for guest checkout flow ───────────────────
-- Guest profiles (auth_user_id IS NULL) get linked on sign-up via
-- handle_new_user() trigger.

-- Done. All Clerk auth references removed from the database layer.
