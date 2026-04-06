-- =============================================================
-- Migration: Fix RLS policies that JOIN on legacy 'requests' table
-- Each policy now supports BOTH request_id (legacy) and intake_id (new)
-- =============================================================

-- 1. PAYMENTS: patients_select_own_payments
DROP POLICY IF EXISTS "patients_select_own_payments" ON public.payments;
CREATE POLICY "patients_select_own_payments" ON public.payments
  FOR SELECT USING (
    (intake_id IS NOT NULL AND intake_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
    OR
    (request_id IS NOT NULL AND intake_id IS NULL AND request_id IN (
      SELECT r.id FROM requests r
      WHERE r.patient_id IN (
        SELECT p.id FROM profiles p WHERE p.auth_user_id = (SELECT auth.uid())
      )
    ))
  );

-- 2. DOCUMENTS: Patients can view own documents
DROP POLICY IF EXISTS "Patients can view own documents" ON public.documents;
CREATE POLICY "Patients can view own documents" ON public.documents
  FOR SELECT USING (
    (intake_id IS NOT NULL AND intake_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
    OR
    (request_id IS NOT NULL AND intake_id IS NULL AND request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
  );

-- 3. DOCUMENT_DRAFTS: patients_view_own_drafts
DROP POLICY IF EXISTS "patients_view_own_drafts" ON public.document_drafts;
CREATE POLICY "patients_view_own_drafts" ON public.document_drafts
  FOR SELECT USING (
    (intake_id IS NOT NULL AND intake_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
    OR
    (request_id IS NOT NULL AND intake_id IS NULL AND request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
  );

-- 4. DOCUMENT_VERIFICATIONS: patients_view_own_verifications
DROP POLICY IF EXISTS "patients_view_own_verifications" ON public.document_verifications;
CREATE POLICY "patients_view_own_verifications" ON public.document_verifications
  FOR SELECT USING (
    (intake_id IS NOT NULL AND intake_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
    OR
    (request_id IS NOT NULL AND intake_id IS NULL AND request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    ))
  );

-- 5. REQUEST_ANSWERS: Keep legacy policies (table still has FK to requests)
DROP POLICY IF EXISTS "patients_select_own_answers" ON public.request_answers;
CREATE POLICY "patients_select_own_answers" ON public.request_answers
  FOR SELECT USING (
    request_id IN (
      SELECT r.id FROM requests r
      WHERE r.patient_id IN (
        SELECT p.id FROM profiles p WHERE p.auth_user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "patients_insert_answers" ON public.request_answers;
CREATE POLICY "patients_insert_answers" ON public.request_answers
  FOR INSERT WITH CHECK (
    request_id IN (
      SELECT r.id FROM requests r
      WHERE r.patient_id IN (
        SELECT p.id FROM profiles p WHERE p.auth_user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "patients_update_own_answers" ON public.request_answers;
CREATE POLICY "patients_update_own_answers" ON public.request_answers
  FOR UPDATE USING (
    request_id IN (
      SELECT r.id FROM requests r
      WHERE r.patient_id IN (
        SELECT p.id FROM profiles p WHERE p.auth_user_id = (SELECT auth.uid())
      )
    )
  );
