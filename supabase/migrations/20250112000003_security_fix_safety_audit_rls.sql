-- Security Fix: Restrict safety_audit_log INSERT policy
-- Addresses: rls_policy_always_true warning from Supabase linter
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy
--
-- The previous policy allowed unrestricted INSERT (WITH CHECK true).
-- This fix restricts inserts to authenticated users only, with the service role
-- still able to bypass RLS for system-level logging.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "safety_audit_insert" ON public.safety_audit_log;

-- Create a more restrictive policy
-- Only authenticated users can insert, and we track their session
CREATE POLICY "safety_audit_authenticated_insert" ON public.safety_audit_log
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    -- Must have a valid session_id (prevents orphaned logs)
    session_id IS NOT NULL
  );

-- Allow service role to insert (for system-level logging)
-- Service role bypasses RLS by default, but we make it explicit
CREATE POLICY "safety_audit_service_insert" ON public.safety_audit_log
  FOR INSERT 
  TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "safety_audit_authenticated_insert" ON public.safety_audit_log IS
  'Authenticated users can insert safety audit logs only with a valid session_id';

COMMENT ON POLICY "safety_audit_service_insert" ON public.safety_audit_log IS
  'Service role can insert safety audit logs for system-level operations';
