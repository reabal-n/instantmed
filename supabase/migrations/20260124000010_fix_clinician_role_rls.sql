-- ============================================================================
-- FIX: Replace 'clinician' role with 'doctor' in RLS policies
-- The profiles.role enum only contains: 'patient' | 'doctor' | 'admin'
-- 'clinician' role doesn't exist and causes RLS policies to fail silently
-- ============================================================================

-- Drop and recreate the compliance_audit_log RLS policy
DROP POLICY IF EXISTS "Clinicians can view audit logs" ON public.compliance_audit_log;

CREATE POLICY "Doctors and admins can view audit logs"
  ON public.compliance_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('doctor', 'admin')
    )
  );

-- Fix the compliance_audit_summary view if it exists
-- (The view uses security_invoker = true, so it relies on RLS policies)

-- Note: If there are other policies using 'clinician', add DROP/CREATE statements here
-- Check for any functions that reference 'clinician' role
