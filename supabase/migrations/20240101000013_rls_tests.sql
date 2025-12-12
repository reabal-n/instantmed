-- ============================================
-- RLS TESTS: Verify policies work correctly
-- Run these manually to validate RLS policies
-- ============================================

-- Test 1: Verify patients can only see their own intakes
-- Expected: Should only return intakes for the authenticated user
DO $$
DECLARE
  test_patient_id UUID;
  other_patient_id UUID;
  intake_count INT;
BEGIN
  -- This test would be run with a specific user's JWT
  RAISE NOTICE 'RLS Test 1: Patient can only see own intakes';
  
  -- Actual test would involve:
  -- 1. Setting auth.uid() to test_patient_id
  -- 2. Querying intakes
  -- 3. Verifying only intakes with patient_id = test_patient_id are returned
END $$;

-- Test 2: Verify patients cannot update others' intakes
-- Expected: Update should affect 0 rows
DO $$
BEGIN
  RAISE NOTICE 'RLS Test 2: Patient cannot update others intakes';
  
  -- Actual test would involve:
  -- 1. Setting auth.uid() to patient A
  -- 2. Attempting to update intake owned by patient B
  -- 3. Verifying 0 rows affected
END $$;

-- Test 3: Verify admins can see all intakes
-- Expected: Admin should see intakes from all patients
DO $$
BEGIN
  RAISE NOTICE 'RLS Test 3: Admin can see all intakes';
  
  -- Actual test would involve:
  -- 1. Setting auth.uid() to an admin user
  -- 2. Querying intakes
  -- 3. Verifying intakes from multiple patients are returned
END $$;

-- Test 4: Verify patients cannot see internal messages
-- Expected: is_internal = true messages should not be visible to patients
DO $$
BEGIN
  RAISE NOTICE 'RLS Test 4: Patient cannot see internal messages';
  
  -- Actual test would involve:
  -- 1. Creating an internal message on an intake
  -- 2. Querying as the patient
  -- 3. Verifying internal message is not returned
END $$;

-- Test 5: Verify audit log is immutable
-- Expected: Updates and deletes should fail
DO $$
BEGIN
  RAISE NOTICE 'RLS Test 5: Audit log is immutable';
  
  -- Actual test would involve:
  -- 1. Attempting to UPDATE audit_log
  -- 2. Attempting to DELETE from audit_log
  -- 3. Both should fail
END $$;

-- ============================================
-- Add immutability trigger for audit_log
-- ============================================

CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_audit_log_update ON public.audit_log;
CREATE TRIGGER prevent_audit_log_update
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- ============================================
-- Add data retention fields to profiles
-- ============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ;

-- ============================================
-- Policy to prevent modification of deleted data
-- ============================================

CREATE OR REPLACE FUNCTION public.check_not_scheduled_for_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.deletion_scheduled_for IS NOT NULL THEN
    RAISE EXCEPTION 'This account is scheduled for deletion and cannot be modified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_profile_deletion ON public.profiles;
CREATE TRIGGER check_profile_deletion
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.deletion_requested_at IS NULL) -- Allow updating deletion fields
  EXECUTE FUNCTION public.check_not_scheduled_for_deletion();
