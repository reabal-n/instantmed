-- ============================================================================
-- RLS INITPLAN PERFORMANCE FIXES
-- Migration: 20250115000003
-- Purpose: Fix auth.uid() calls to use (select auth.uid()) for better query planning
-- ============================================================================

-- ============================================================================
-- INTAKES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Patients can view own intakes" ON public.intakes;
CREATE POLICY "Patients can view own intakes" ON public.intakes
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Patients can create intakes" ON public.intakes;
CREATE POLICY "Patients can create intakes" ON public.intakes
  FOR INSERT WITH CHECK (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Patients can update draft intakes" ON public.intakes;
CREATE POLICY "Patients can update draft intakes" ON public.intakes
  FOR UPDATE USING (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
    )
    AND status = 'draft'
  );

DROP POLICY IF EXISTS "Doctors can view all intakes" ON public.intakes;
CREATE POLICY "Doctors can view all intakes" ON public.intakes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Doctors can update intakes" ON public.intakes;
CREATE POLICY "Doctors can update intakes" ON public.intakes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

-- ============================================================================
-- INTAKE_DOCUMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Patients can view own intake documents" ON public.intake_documents;
CREATE POLICY "Patients can view own intake documents" ON public.intake_documents
  FOR SELECT USING (
    intake_id IN (
      SELECT id FROM intakes WHERE patient_id IN (
        SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Doctors can view all intake documents" ON public.intake_documents;
CREATE POLICY "Doctors can view all intake documents" ON public.intake_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Doctors can create intake documents" ON public.intake_documents;
CREATE POLICY "Doctors can create intake documents" ON public.intake_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

-- ============================================================================
-- SERVICES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all services" ON public.services;
CREATE POLICY "Admins can view all services" ON public.services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Admins can manage services" ON public.services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================================================
-- STRIPE_WEBHOOK_DEAD_LETTER TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can update dead letter queue" ON public.stripe_webhook_dead_letter;
CREATE POLICY "Admins can update dead letter queue" ON public.stripe_webhook_dead_letter
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================================================
-- PAYMENT_RECONCILIATION TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view reconciliation" ON public.payment_reconciliation;
CREATE POLICY "Admins can view reconciliation" ON public.payment_reconciliation
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage reconciliation" ON public.payment_reconciliation;
CREATE POLICY "Admins can manage reconciliation" ON public.payment_reconciliation
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================================================
-- INTAKE_DRAFTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "intake_drafts_user_select" ON public.intake_drafts;
CREATE POLICY "intake_drafts_user_select" ON public.intake_drafts
  FOR SELECT USING (
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "intake_drafts_user_update" ON public.intake_drafts;
CREATE POLICY "intake_drafts_user_update" ON public.intake_drafts
  FOR UPDATE USING (
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "intake_drafts_user_insert" ON public.intake_drafts;
CREATE POLICY "intake_drafts_user_insert" ON public.intake_drafts
  FOR INSERT WITH CHECK (
    user_id IS NULL OR user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "intake_drafts_user_delete" ON public.intake_drafts;
CREATE POLICY "intake_drafts_user_delete" ON public.intake_drafts
  FOR DELETE USING (
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "intake_drafts_staff_select" ON public.intake_drafts;
CREATE POLICY "intake_drafts_staff_select" ON public.intake_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

-- ============================================================================
-- DOCUMENT_DRAFTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "document_drafts_doctor_select" ON public.document_drafts;
CREATE POLICY "document_drafts_doctor_select" ON public.document_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

DROP POLICY IF EXISTS "document_drafts_doctor_insert" ON public.document_drafts;
CREATE POLICY "document_drafts_doctor_insert" ON public.document_drafts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

DROP POLICY IF EXISTS "document_drafts_doctor_update" ON public.document_drafts;
CREATE POLICY "document_drafts_doctor_update" ON public.document_drafts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

-- ============================================================================
-- REQUESTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "patients_select_own_requests" ON public.requests;
CREATE POLICY "patients_select_own_requests" ON public.requests
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "doctors_select_all_requests" ON public.requests;
CREATE POLICY "doctors_select_all_requests" ON public.requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

DROP POLICY IF EXISTS "patients_insert_requests" ON public.requests;
CREATE POLICY "patients_insert_requests" ON public.requests
  FOR INSERT WITH CHECK (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "patients_update_own_requests" ON public.requests;
CREATE POLICY "patients_update_own_requests" ON public.requests
  FOR UPDATE USING (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "patients_update_own_draft_requests" ON public.requests;
CREATE POLICY "patients_update_own_draft_requests" ON public.requests
  FOR UPDATE USING (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
    )
    AND status = 'draft'
  );

DROP POLICY IF EXISTS "doctors_update_requests" ON public.requests;
CREATE POLICY "doctors_update_requests" ON public.requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

-- ============================================================================
-- REQUEST_ANSWERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "patients_select_own_answers" ON public.request_answers;
CREATE POLICY "patients_select_own_answers" ON public.request_answers
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM requests WHERE patient_id IN (
        SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "doctors_select_all_answers" ON public.request_answers;
CREATE POLICY "doctors_select_all_answers" ON public.request_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

DROP POLICY IF EXISTS "patients_insert_answers" ON public.request_answers;
CREATE POLICY "patients_insert_answers" ON public.request_answers
  FOR INSERT WITH CHECK (
    request_id IN (
      SELECT id FROM requests WHERE patient_id IN (
        SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "patients_update_own_answers" ON public.request_answers;
CREATE POLICY "patients_update_own_answers" ON public.request_answers
  FOR UPDATE USING (
    request_id IN (
      SELECT id FROM requests WHERE patient_id IN (
        SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
      )
    )
  );

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "patients_select_own_payments" ON public.payments;
CREATE POLICY "patients_select_own_payments" ON public.payments
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM requests WHERE patient_id IN (
        SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "doctors_select_all_payments" ON public.payments;
CREATE POLICY "doctors_select_all_payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (
    auth_user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (
    auth_user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "doctors_select_all_profiles" ON public.profiles;
CREATE POLICY "doctors_select_all_profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = (select auth.uid())
      AND p.role IN ('doctor', 'admin')
    )
  );

-- ============================================================================
-- PRIORITY_UPSELL_CONVERSIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "patients_view_own_conversions" ON public.priority_upsell_conversions;
CREATE POLICY "patients_view_own_conversions" ON public.priority_upsell_conversions
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "doctors_view_all_conversions" ON public.priority_upsell_conversions;
CREATE POLICY "doctors_view_all_conversions" ON public.priority_upsell_conversions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

-- ============================================================================
-- AI_AUDIT_LOG TABLE
-- ============================================================================

DROP POLICY IF EXISTS "ai_audit_log_doctor_select" ON public.ai_audit_log;
CREATE POLICY "ai_audit_log_doctor_select" ON public.ai_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

-- ============================================================================
-- DONE
-- ============================================================================

COMMENT ON SCHEMA public IS 'RLS initplan fixes applied - 2025-01-15';
