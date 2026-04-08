-- ============================================================================
-- LAUNCH BLOCKER FIX: Lock down intake_drafts + safety_audit_log + RPCs
-- ============================================================================
--
-- Background:
--   The original intake_drafts and safety_audit_log RLS policies allowed any
--   client (anon or authenticated) to read PHI drafts and write fabricated
--   safety evaluations directly via the Supabase API. The PHI policy used
--   `OR session_id IS NOT NULL` which is always true, and the audit log used
--   `WITH CHECK true` for INSERT, with `log_safety_evaluation` granted to
--   `anon`. Combined, this enabled a PHI exfiltration + audit-forgery chain.
--
-- Fix strategy:
--   1. Force ALL access to these tables through service-role API routes.
--      The live `/request` flow uses localStorage and doesn't touch these
--      tables. The legacy `/flow` system was the only direct-client writer
--      and it's slated for removal in the 2-week list.
--   2. Tighten policies so authenticated users can only see their OWN drafts
--      (defense in depth in case anything ever does authenticated-direct
--      reads in the future).
--   3. REVOKE the SECURITY DEFINER `log_safety_evaluation` from anon and
--      authenticated. The function is only ever called from server-side
--      code via the service role, which bypasses RLS and grants anyway.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- intake_drafts: drop the always-true SELECT/UPDATE policies AND the
--   draft-hijacking claim_guest policy
-- ----------------------------------------------------------------------------
--
-- Live state at time of migration (verified 2026-04-08 via mcp tool):
--   - intake_drafts_user_select   ✅ already owner-only (was previously fixed
--                                   out-of-band; the buggy `OR session_id IS
--                                   NOT NULL` clause is gone)
--   - intake_drafts_user_update   ✅ already owner-only
--   - intake_drafts_user_insert   ⚠️  allows user_id IS NULL (anonymous insert)
--   - intake_drafts_user_delete   ✅ owner-only (kept as-is)
--   - intake_drafts_claim_guest   🚨 vulnerability: any authenticated user can
--                                   UPDATE any anonymous draft (user_id IS
--                                   NULL → user_id = auth.uid()), then read
--                                   its PHI via the user_select policy.
--                                   Different exploit path, same outcome as
--                                   the original PHI leak.
--   - intake_drafts_staff_select  ✅ doctor/admin select (kept as-is)
--
-- This migration drops claim_guest entirely. The legitimate guest→signup
-- claim flow goes through lib/data/intakes.ts which uses createServiceRoleClient()
-- and bypasses RLS. The deprecated lib/flow/auth.ts:claimDraft() path is
-- unused by the live /request flow.

-- Drop the draft-hijacking policy. Authenticated users can no longer claim
-- arbitrary anonymous drafts via the Supabase client.
DROP POLICY IF EXISTS "intake_drafts_claim_guest" ON public.intake_drafts;

-- Recreate the owner-policies with explicit role binding so they're
-- defensively scoped to authenticated even if a future migration loosens them.
DROP POLICY IF EXISTS "intake_drafts_user_select" ON public.intake_drafts;
DROP POLICY IF EXISTS "intake_drafts_user_update" ON public.intake_drafts;
DROP POLICY IF EXISTS "intake_drafts_user_insert" ON public.intake_drafts;

-- Authenticated users can only read their OWN drafts (no session_id fallback).
-- Anonymous (anon) clients have no SELECT policy and therefore cannot read.
CREATE POLICY "intake_drafts_owner_select" ON public.intake_drafts
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Authenticated users can only update their OWN drafts.
CREATE POLICY "intake_drafts_owner_update" ON public.intake_drafts
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Authenticated users can insert drafts they own (user_id must match caller).
-- No more `user_id IS NULL` escape hatch — anonymous draft creation goes
-- through the service-role API at /api/flow/drafts.
CREATE POLICY "intake_drafts_owner_insert" ON public.intake_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

COMMENT ON TABLE public.intake_drafts IS
  'PHI draft store. RLS denies direct client access; service-role API only. See migration 20260408000001.';

-- The staff_select and user_delete policies remain in place (unchanged) so
-- doctors/admins can review drafts for support and users can delete their own.

-- ----------------------------------------------------------------------------
-- safety_audit_log: lock INSERT to service_role only
-- ----------------------------------------------------------------------------

-- The "safety_audit_authenticated_insert" policy from migration
-- 20250112000003 only required `session_id IS NOT NULL`, which any
-- authenticated user can trivially supply. Replace it with service-role-only.
DROP POLICY IF EXISTS "safety_audit_authenticated_insert" ON public.safety_audit_log;
DROP POLICY IF EXISTS "safety_audit_insert" ON public.safety_audit_log;
DROP POLICY IF EXISTS "safety_audit_service_insert" ON public.safety_audit_log;

-- Only the service role can write safety audit rows. Application code goes
-- through /api/flow/drafts (or future server actions) which already use the
-- service-role client, so this is transparent.
CREATE POLICY "safety_audit_service_insert_only" ON public.safety_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "safety_audit_service_insert_only" ON public.safety_audit_log IS
  'Service role only. Authenticated and anon clients cannot write safety audit rows; this prevents audit forgery (e.g. flipping safety_outcome from DECLINE to ALLOW).';

-- The staff_select policy from migration 20250112000005 remains in place so
-- doctors/admins can still read audit rows.

-- ----------------------------------------------------------------------------
-- log_safety_evaluation RPCs: revoke EXECUTE from PUBLIC (and anon/authenticated)
-- ----------------------------------------------------------------------------
--
-- The function is SECURITY DEFINER, meaning whoever can EXECUTE it can write
-- to safety_audit_log AND mutate intake_drafts.safety_outcome. Live state has
-- TWO overloads, both granted to PUBLIC (= everyone including anon). This is
-- the smoking gun for the audit-forgery exploit chain.
--
-- Revoking from PUBLIC is the strongest fix — it implicitly denies anon and
-- authenticated. Service role still has EXECUTE because SECURITY DEFINER
-- functions can always be invoked by the role that owns them (postgres).

-- 5-arg overload: (uuid, text, jsonb, text, text)
REVOKE EXECUTE ON FUNCTION public.log_safety_evaluation(
  uuid, text, jsonb, text, text
) FROM PUBLIC, anon, authenticated;

-- 11-arg overload: (uuid, text, text, text, text, text[], jsonb, jsonb, integer, boolean, uuid)
REVOKE EXECUTE ON FUNCTION public.log_safety_evaluation(
  uuid, text, text, text, text, text[], jsonb, jsonb, integer, boolean, uuid
) FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- cleanup_old_drafts: same treatment (SECURITY DEFINER cron-only function)
-- ----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.cleanup_old_drafts() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- Done. Verification queries (for manual smoke test post-deploy):
--
--   -- Should return 0 rows when run with the anon JWT:
--   set local role anon;
--   select count(*) from public.intake_drafts;
--
--   -- Should fail with permission denied:
--   set local role anon;
--   select public.log_safety_evaluation(null, 'x', 'y', 'ALLOW', 'low', '{}', '{}'::jsonb);
-- ============================================================================
