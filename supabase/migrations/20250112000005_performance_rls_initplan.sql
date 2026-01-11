-- Performance Fix: Optimize RLS policies to use (select auth.uid()) instead of auth.uid()
-- Addresses: auth_rls_initplan warning from Supabase linter
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
--
-- Using (select auth.uid()) ensures the auth function is evaluated once per query
-- rather than once per row, significantly improving performance at scale.

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "profiles_select_own_or_doctor" ON public.profiles;
CREATE POLICY "profiles_select_own_or_doctor" ON public.profiles
  FOR SELECT USING ((auth_user_id = (select auth.uid())) OR is_doctor());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE 
  USING (auth_user_id = (select auth.uid()))
  WITH CHECK (auth_user_id = (select auth.uid()));

-- ============================================================================
-- REQUESTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "patients_select_own_requests" ON public.requests;
CREATE POLICY "patients_select_own_requests" ON public.requests
  FOR SELECT USING (
    patient_id IN (
      SELECT profiles.id FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "patients_update_own_draft_requests" ON public.requests;
CREATE POLICY "patients_update_own_draft_requests" ON public.requests
  FOR UPDATE
  USING (
    (patient_id IN (SELECT profiles.id FROM profiles WHERE profiles.auth_user_id = (select auth.uid())))
    AND (payment_status = 'pending_payment'::text)
  )
  WITH CHECK (
    (patient_id IN (SELECT profiles.id FROM profiles WHERE profiles.auth_user_id = (select auth.uid())))
    AND (patient_id = (SELECT requests_1.patient_id FROM requests requests_1 WHERE requests_1.id = requests_1.id))
  );

DROP POLICY IF EXISTS "patients_update_own_requests" ON public.requests;
CREATE POLICY "patients_update_own_requests" ON public.requests
  FOR UPDATE
  USING (
    patient_id IN (SELECT profiles.id FROM profiles WHERE profiles.auth_user_id = (select auth.uid()))
  )
  WITH CHECK (
    (patient_id IN (SELECT profiles.id FROM profiles WHERE profiles.auth_user_id = (select auth.uid())))
    AND (payment_status = 'pending_payment'::text)
  );

DROP POLICY IF EXISTS "doctors_select_all_requests" ON public.requests;
CREATE POLICY "doctors_select_all_requests" ON public.requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "doctors_update_requests" ON public.requests;
CREATE POLICY "doctors_update_requests" ON public.requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  )
  WITH CHECK (
    patient_id = (SELECT requests_1.patient_id FROM requests requests_1 WHERE requests_1.id = requests_1.id)
  );

-- ============================================================================
-- REQUEST_ANSWERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "patients_insert_own_answers" ON public.request_answers;
CREATE POLICY "patients_insert_own_answers" ON public.request_answers
  FOR INSERT WITH CHECK (
    request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "patients_select_own_answers" ON public.request_answers;
CREATE POLICY "patients_select_own_answers" ON public.request_answers
  FOR SELECT USING (
    request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "patients_update_own_answers" ON public.request_answers;
CREATE POLICY "patients_update_own_answers" ON public.request_answers
  FOR UPDATE
  USING (
    request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = (select auth.uid()) AND r.status = 'needs_follow_up'::text
    )
  );

DROP POLICY IF EXISTS "doctors_select_all_answers" ON public.request_answers;
CREATE POLICY "doctors_select_all_answers" ON public.request_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = 'admin'::text
    )
  );

DROP POLICY IF EXISTS "doctors_view_audit_logs" ON public.audit_logs;
CREATE POLICY "doctors_view_audit_logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

-- ============================================================================
-- FRAUD_FLAGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "doctors_view_fraud_flags" ON public.fraud_flags;
CREATE POLICY "doctors_view_fraud_flags" ON public.fraud_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "doctors_update_fraud_flags" ON public.fraud_flags;
CREATE POLICY "doctors_update_fraud_flags" ON public.fraud_flags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

-- ============================================================================
-- REFERRALS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own" ON public.referrals
  FOR SELECT USING (
    referrer_id = (
      SELECT profiles.id FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- INTAKE_DRAFTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "intake_drafts_staff_select" ON public.intake_drafts;
CREATE POLICY "intake_drafts_staff_select" ON public.intake_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'doctor'::text])
    )
  );

DROP POLICY IF EXISTS "intake_drafts_user_insert" ON public.intake_drafts;
CREATE POLICY "intake_drafts_user_insert" ON public.intake_drafts
  FOR INSERT WITH CHECK (
    (user_id IS NULL) OR (user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "intake_drafts_user_select" ON public.intake_drafts;
CREATE POLICY "intake_drafts_user_select" ON public.intake_drafts
  FOR SELECT USING (
    (user_id = (select auth.uid())) OR (session_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "intake_drafts_user_update" ON public.intake_drafts;
CREATE POLICY "intake_drafts_user_update" ON public.intake_drafts
  FOR UPDATE USING (
    (user_id = (select auth.uid())) OR ((user_id IS NULL) AND (session_id IS NOT NULL))
  );

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Doctors can insert documents" ON public.documents;
CREATE POLICY "Doctors can insert documents" ON public.documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.auth_user_id = (select auth.uid()) 
      AND p.role = 'doctor'::text
    )
  );

DROP POLICY IF EXISTS "Doctors can view all documents" ON public.documents;
CREATE POLICY "Doctors can view all documents" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.auth_user_id = (select auth.uid()) 
      AND p.role = 'doctor'::text
    )
  );

DROP POLICY IF EXISTS "Patients can view own documents" ON public.documents;
CREATE POLICY "Patients can view own documents" ON public.documents
  FOR SELECT USING (
    request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "doctors_create_documents" ON public.documents;
CREATE POLICY "doctors_create_documents" ON public.documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "doctors_view_all_documents" ON public.documents;
CREATE POLICY "doctors_view_all_documents" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "patients_view_own_documents" ON public.documents;
CREATE POLICY "patients_view_own_documents" ON public.documents
  FOR SELECT USING (
    request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- DOCUMENT_DRAFTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "doctors_create_document_drafts" ON public.document_drafts;
CREATE POLICY "doctors_create_document_drafts" ON public.document_drafts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "doctors_delete_document_drafts" ON public.document_drafts;
CREATE POLICY "doctors_delete_document_drafts" ON public.document_drafts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "doctors_update_document_drafts" ON public.document_drafts;
CREATE POLICY "doctors_update_document_drafts" ON public.document_drafts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "doctors_view_document_drafts" ON public.document_drafts;
CREATE POLICY "doctors_view_document_drafts" ON public.document_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "patients_view_own_drafts" ON public.document_drafts;
CREATE POLICY "patients_view_own_drafts" ON public.document_drafts
  FOR SELECT USING (
    request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- DOCUMENT_VERIFICATIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "patients_view_own_verifications" ON public.document_verifications;
CREATE POLICY "patients_view_own_verifications" ON public.document_verifications
  FOR SELECT USING (
    request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- FEATURE_FLAGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "doctors_select_feature_flags" ON public.feature_flags;
CREATE POLICY "doctors_select_feature_flags" ON public.feature_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "doctors_update_feature_flags" ON public.feature_flags;
CREATE POLICY "doctors_update_feature_flags" ON public.feature_flags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

-- ============================================================================
-- MEDICATIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "medications_admin_all" ON public.medications;
CREATE POLICY "medications_admin_all" ON public.medications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = 'admin'::text
    )
  );

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "doctors_select_all_payments" ON public.payments;
CREATE POLICY "doctors_select_all_payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "patients_select_own_payments" ON public.payments;
CREATE POLICY "patients_select_own_payments" ON public.payments
  FOR SELECT USING (
    request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PRIORITY_UPSELL_CONVERSIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "doctors_view_all_conversions" ON public.priority_upsell_conversions;
CREATE POLICY "doctors_view_all_conversions" ON public.priority_upsell_conversions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['doctor'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "patients_view_own_conversions" ON public.priority_upsell_conversions;
CREATE POLICY "patients_view_own_conversions" ON public.priority_upsell_conversions
  FOR SELECT USING (patient_id = (select auth.uid()));

-- ============================================================================
-- COMPLIANCE_AUDIT_LOG TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Clinicians and admins can read compliance audit" ON public.compliance_audit_log;
CREATE POLICY "Clinicians and admins can read compliance audit" ON public.compliance_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.auth_user_id = (select auth.uid()) 
      AND p.role = ANY (ARRAY['clinician'::text, 'doctor'::text, 'admin'::text])
    )
  );

-- ============================================================================
-- SAFETY_AUDIT_LOG TABLE
-- ============================================================================

DROP POLICY IF EXISTS "safety_audit_staff_select" ON public.safety_audit_log;
CREATE POLICY "safety_audit_staff_select" ON public.safety_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'doctor'::text])
    )
  );

-- ============================================================================
-- CREDITS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "credits_select_own" ON public.credits;
CREATE POLICY "credits_select_own" ON public.credits
  FOR SELECT USING (
    profile_id = (
      SELECT profiles.id FROM profiles 
      WHERE profiles.auth_user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- Done
-- ============================================================================

COMMENT ON SCHEMA public IS 'RLS policies optimized with (select auth.uid()) for performance';
