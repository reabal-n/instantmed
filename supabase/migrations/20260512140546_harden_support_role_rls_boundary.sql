-- Phase 7 support-role RLS boundary (2026-05-12).
--
-- Support is an application profile role, not a Postgres role. The app now
-- permits support users through a small masked ops cockpit only. Direct
-- Supabase RLS must remain stricter than the app surface: support must not be
-- added to PHI-heavy table policies unless a future migration deliberately
-- designs narrow support-safe views/RPCs.

BEGIN;

DO $$
DECLARE
  unsafe_policy text;
BEGIN
  SELECT format('%I.%I policy %I', schemaname, tablename, policyname)
  INTO unsafe_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = ANY (ARRAY[
      'profiles',
      'intakes',
      'intake_answers',
      'patient_health_profiles',
      'prescriptions',
      'email_outbox',
      'audit_logs',
      'safety_audit_log',
      'issued_certificates',
      'payments'
    ])
    AND (
      COALESCE(qual, '') ILIKE '%support%'
      OR COALESCE(with_check, '') ILIKE '%support%'
    )
  LIMIT 1;

  IF unsafe_policy IS NOT NULL THEN
    RAISE EXCEPTION
      'Unsafe support RLS policy found on %. Support access must stay behind masked application routes or narrow support-safe views/RPCs.',
      unsafe_policy;
  END IF;
END
$$;

COMMIT;
