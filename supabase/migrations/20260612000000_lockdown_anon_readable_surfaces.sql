-- Lock down anonymous/authenticated PostgREST surfaces that leak data or allow junk writes.
-- Discovered by the 2026-06-10 comprehensive security audit
-- (docs/audits/2026-06-10-comprehensive-audit.md).
--
-- All affected app readers/writers use the SERVICE ROLE client (which bypasses
-- grants + RLS) or a SECURITY DEFINER trigger, so these revokes are non-breaking:
--   - v_stuck_intakes      -> read server-side via lib/data/system-health.ts + lib/data/intake-ops.ts (service role)
--   - document_verifications-> read via lib/verify/public-verification.ts + scripts/smoke-backend.ts (service role)
--   - profiles INSERT       -> written by handle_new_user() (SECURITY DEFINER trigger) + guest checkout (service role)
--
-- Idempotent: safe to re-run / re-push.

BEGIN;

-- 1. P0 — v_stuck_intakes leaked patient name + email to the anon key over PostgREST.
--    It was a SECURITY DEFINER view (ran as owner, bypassing RLS on intakes/profiles).
REVOKE ALL ON public.v_stuck_intakes FROM anon, authenticated;
ALTER VIEW public.v_stuck_intakes SET (security_invoker = on);

-- 2. P2 — document_verifications allowed anon to enumerate verification codes + intake ids
--    ("Public verification by code" policy had qual = true). The live /verify path reads
--    this via the service role, not the anon client, so revoke the public surface entirely.
REVOKE ALL ON public.document_verifications FROM anon, authenticated;

-- 3. Hygiene — compliance_audit_summary is already security_invoker (RLS gates rows to zero
--    for anon), but anon has no reason to hold the grant.
REVOKE ALL ON public.compliance_audit_summary FROM anon;

-- 4. P2 — profiles INSERT policy was scoped to role `public` with WITH CHECK (true),
--    letting anon insert junk profile rows. Real writers bypass RLS, so scope the policy
--    to service_role only.
DROP POLICY IF EXISTS profiles_insert_service_role ON public.profiles;
CREATE POLICY profiles_insert_service_role ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMIT;
