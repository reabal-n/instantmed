-- =============================================================
-- Migration: Finalize intakes as sole canonical pathway
--
-- CONTEXT:
--   The platform has fully migrated from the legacy `requests` table
--   to the canonical `intakes` table. No application code inserts into
--   or queries the `requests` table anymore. This migration:
--
-- CHANGES:
--   1. Drop ALL FK constraints from tables pointing to `requests(id)`
--      (documents, document_verifications, audit_logs, payments)
--   2. Make request_id NULLABLE on all tables that had NOT NULL
--   3. Drop orphan RLS policy `patients_view_own_documents` (snake_case)
--      that was never cleaned up and still references `requests`
--   4. Simplify dual-mode RLS policies to only use `intakes` pathway
--   5. Drop stale request_answers RLS policies
--   6. Add performance indexes on intake_id columns
-- =============================================================

-- ============================================================================
-- 1. DROP ALL FK CONSTRAINTS pointing to legacy `requests` table
-- ============================================================================

-- Generic helper: drop any FK on a given table's request_id column
-- This handles cases where constraint names vary across environments

-- documents.request_id FK → requests(id)
DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  FOR _constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.table_name = 'documents'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'request_id'
  LOOP
    EXECUTE 'ALTER TABLE public.documents DROP CONSTRAINT ' || quote_ident(_constraint_name);
  END LOOP;
END $$;

-- document_verifications.request_id FK → requests(id)
DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  FOR _constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.table_name = 'document_verifications'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'request_id'
  LOOP
    EXECUTE 'ALTER TABLE public.document_verifications DROP CONSTRAINT ' || quote_ident(_constraint_name);
  END LOOP;
END $$;

-- audit_logs.request_id FK → requests(id)
DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  FOR _constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.table_name = 'audit_logs'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'request_id'
  LOOP
    EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT ' || quote_ident(_constraint_name);
  END LOOP;
END $$;

-- payments.request_id FK → requests(id) (MISSED in previous pass)
DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  FOR _constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.table_name = 'payments'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'request_id'
  LOOP
    EXECUTE 'ALTER TABLE public.payments DROP CONSTRAINT ' || quote_ident(_constraint_name);
  END LOOP;
END $$;

-- request_answers.request_id FK → requests(id) (if exists)
DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  FOR _constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.table_name = 'request_answers'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'request_id'
  LOOP
    EXECUTE 'ALTER TABLE public.request_answers DROP CONSTRAINT ' || quote_ident(_constraint_name);
  END LOOP;
END $$;

-- fraud_flags.request_id FK (if exists)
DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  FOR _constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.table_name = 'fraud_flags'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'request_id'
  LOOP
    EXECUTE 'ALTER TABLE public.fraud_flags DROP CONSTRAINT ' || quote_ident(_constraint_name);
  END LOOP;
END $$;

-- priority_upsell_conversions.request_id FK (if exists)
DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  FOR _constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.table_name = 'priority_upsell_conversions'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'request_id'
  LOOP
    EXECUTE 'ALTER TABLE public.priority_upsell_conversions DROP CONSTRAINT ' || quote_ident(_constraint_name);
  END LOOP;
END $$;

-- ============================================================================
-- 2. Make request_id NULLABLE on tables that had NOT NULL constraint
--    Allows new records to only use intake_id going forward
-- ============================================================================

-- documents
ALTER TABLE public.documents ALTER COLUMN request_id DROP NOT NULL;

-- document_verifications
ALTER TABLE public.document_verifications ALTER COLUMN request_id DROP NOT NULL;

-- payments (may already be nullable in some environments)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'payments'
    AND column_name = 'request_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.payments ALTER COLUMN request_id DROP NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- 3. DROP ORPHAN RLS POLICIES that still reference `requests` table
--    These are policies that were never dropped by previous migrations
-- ============================================================================

-- CRITICAL: `patients_view_own_documents` (snake_case) on documents was created
-- in 20250112000005 and NEVER dropped. It coexists with the properly named
-- "Patients can view own documents" policy. Both are SELECT policies, so the
-- orphan grants extra access via the old requests table join.
DROP POLICY IF EXISTS "patients_view_own_documents" ON public.documents;

-- Drop any remaining request_answers policies
DROP POLICY IF EXISTS "patients_select_own_answers" ON public.request_answers;
DROP POLICY IF EXISTS "patients_insert_answers" ON public.request_answers;
DROP POLICY IF EXISTS "patients_update_own_answers" ON public.request_answers;
DROP POLICY IF EXISTS "patients_insert_own_answers" ON public.request_answers;

-- ============================================================================
-- 4. CONSOLIDATE dual-mode RLS policies to use ONLY `intakes` pathway
--    For legacy records that only have request_id (no intake_id), the fallback
--    checks request_id against intakes table — because the app has been storing
--    intake IDs in request_id columns for months.
-- ============================================================================

-- 4a. PAYMENTS: patients can view own payments
DROP POLICY IF EXISTS "patients_select_own_payments" ON public.payments;
CREATE POLICY "patients_select_own_payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    -- Primary: intake_id FK to intakes
    (intake_id IS NOT NULL AND intake_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
    OR
    -- Fallback: legacy records where request_id stores an intake ID
    (request_id IS NOT NULL AND intake_id IS NULL AND request_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
  );

-- 4b. DOCUMENTS: patients can view own documents
DROP POLICY IF EXISTS "Patients can view own documents" ON public.documents;
CREATE POLICY "Patients can view own documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    (intake_id IS NOT NULL AND intake_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
    OR
    (request_id IS NOT NULL AND intake_id IS NULL AND request_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
  );

-- 4c. DOCUMENT_DRAFTS: patients can view own drafts
DROP POLICY IF EXISTS "patients_view_own_drafts" ON public.document_drafts;
CREATE POLICY "patients_view_own_drafts"
  ON public.document_drafts FOR SELECT
  TO authenticated
  USING (
    (intake_id IS NOT NULL AND intake_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
    OR
    (request_id IS NOT NULL AND intake_id IS NULL AND request_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
  );

-- 4d. DOCUMENT_VERIFICATIONS: patients can view own verifications
DROP POLICY IF EXISTS "patients_view_own_verifications" ON public.document_verifications;
CREATE POLICY "patients_view_own_verifications"
  ON public.document_verifications FOR SELECT
  TO authenticated
  USING (
    (intake_id IS NOT NULL AND intake_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
    OR
    (request_id IS NOT NULL AND intake_id IS NULL AND request_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
  );

-- ============================================================================
-- 5. PERFORMANCE INDEXES on intake_id columns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_documents_intake_id ON public.documents(intake_id) WHERE intake_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_verifications_intake_id ON public.document_verifications(intake_id) WHERE intake_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_intake_id ON public.payments(intake_id) WHERE intake_id IS NOT NULL;

-- ============================================================================
-- 6. BACKFILL: Copy request_id → intake_id where intake_id is NULL
--    For legacy records that were created before dual-mode columns were added.
--    This makes the intake_id column the single source of truth.
-- ============================================================================

-- documents: backfill intake_id from request_id
UPDATE public.documents
SET intake_id = request_id
WHERE intake_id IS NULL
AND request_id IS NOT NULL;

-- document_verifications: backfill intake_id from request_id
UPDATE public.document_verifications
SET intake_id = request_id
WHERE intake_id IS NULL
AND request_id IS NOT NULL;

-- payments: backfill intake_id from request_id
UPDATE public.payments
SET intake_id = request_id
WHERE intake_id IS NULL
AND request_id IS NOT NULL;

-- fraud_flags: backfill intake_id from request_id (if both columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fraud_flags'
    AND column_name = 'intake_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fraud_flags'
    AND column_name = 'request_id'
  ) THEN
    EXECUTE 'UPDATE public.fraud_flags SET intake_id = request_id WHERE intake_id IS NULL AND request_id IS NOT NULL';
  END IF;
END $$;

-- priority_upsell_conversions: backfill
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'priority_upsell_conversions'
    AND column_name = 'intake_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'priority_upsell_conversions'
    AND column_name = 'request_id'
  ) THEN
    EXECUTE 'UPDATE public.priority_upsell_conversions SET intake_id = request_id WHERE intake_id IS NULL AND request_id IS NOT NULL';
  END IF;
END $$;
