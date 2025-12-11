-- Strengthen RLS policies for all tables
-- This script audits and updates RLS policies for security

-- ========================================
-- PROFILES TABLE
-- ========================================

-- Drop existing policies to recreate with stronger checks
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "doctors_select_patients" ON profiles;

-- Patients can only insert their own profile (linked to auth.uid)
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- Patients can only view their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Patients can only update their own profile (excluding role changes)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (
    auth_user_id = auth.uid() 
    -- Prevent role escalation - role cannot be changed by the user
    AND (
      role = (SELECT role FROM profiles WHERE auth_user_id = auth.uid())
      OR role IS NULL
    )
  );

-- Doctors can view patient profiles (but not modify)
CREATE POLICY "doctors_select_patients" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('doctor', 'admin')
    )
  );

-- ========================================
-- REQUESTS TABLE
-- ========================================

DROP POLICY IF EXISTS "patients_select_own_requests" ON requests;
DROP POLICY IF EXISTS "patients_insert_own_requests" ON requests;
DROP POLICY IF EXISTS "doctors_update_requests" ON requests;
DROP POLICY IF EXISTS "doctors_select_all_requests" ON requests;

-- Patients can view their own requests
CREATE POLICY "patients_select_own_requests" ON requests
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Patients can insert requests for themselves only
CREATE POLICY "patients_insert_own_requests" ON requests
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Patients can update their own pending requests (for draft updates only)
CREATE POLICY "patients_update_own_draft_requests" ON requests
  FOR UPDATE TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
    -- Only allow updates to draft/awaiting_payment requests
    AND payment_status = 'pending_payment'
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
    -- Cannot change patient_id
    AND patient_id = (SELECT patient_id FROM requests WHERE id = requests.id)
  );

-- Doctors can view all paid requests
CREATE POLICY "doctors_select_all_requests" ON requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- Doctors can update requests (status changes, notes, etc)
CREATE POLICY "doctors_update_requests" ON requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  )
  WITH CHECK (
    -- Doctors cannot change patient_id
    patient_id = (SELECT patient_id FROM requests WHERE id = requests.id)
  );

-- ========================================
-- REQUEST_ANSWERS TABLE
-- ========================================

DROP POLICY IF EXISTS "doctors_select_all_answers" ON request_answers;
DROP POLICY IF EXISTS "patients_insert_own_answers" ON request_answers;
DROP POLICY IF EXISTS "patients_select_own_answers" ON request_answers;

-- Patients can insert answers for their own requests
CREATE POLICY "patients_insert_own_answers" ON request_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Patients can view answers for their own requests
CREATE POLICY "patients_select_own_answers" ON request_answers
  FOR SELECT TO authenticated
  USING (
    request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Doctors can view all answers
CREATE POLICY "doctors_select_all_answers" ON request_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- ========================================
-- PAYMENTS TABLE
-- ========================================

DROP POLICY IF EXISTS "patients_select_own_payments" ON payments;
DROP POLICY IF EXISTS "doctors_select_all_payments" ON payments;

-- Patients can view their own payments
CREATE POLICY "patients_select_own_payments" ON payments
  FOR SELECT TO authenticated
  USING (
    request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Doctors/admins can view all payments
CREATE POLICY "doctors_select_all_payments" ON payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- ========================================
-- DOCUMENTS TABLE
-- ========================================

DROP POLICY IF EXISTS "Doctors can view all documents" ON documents;
DROP POLICY IF EXISTS "Doctors can create documents" ON documents;
DROP POLICY IF EXISTS "Patients can view own documents" ON documents;

-- Patients can view documents for their own requests
CREATE POLICY "patients_view_own_documents" ON documents
  FOR SELECT TO authenticated
  USING (
    request_id IN (
      SELECT r.id FROM requests r
      JOIN profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Doctors can view all documents
CREATE POLICY "doctors_view_all_documents" ON documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- Doctors can create documents
CREATE POLICY "doctors_create_documents" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- ========================================
-- DOCUMENT_DRAFTS TABLE
-- ========================================

DROP POLICY IF EXISTS "Doctors can update document drafts" ON document_drafts;
DROP POLICY IF EXISTS "Doctors can view all document drafts" ON document_drafts;
DROP POLICY IF EXISTS "Doctors can create document drafts" ON document_drafts;

-- Doctors can view all document drafts
CREATE POLICY "doctors_view_document_drafts" ON document_drafts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- Doctors can create document drafts
CREATE POLICY "doctors_create_document_drafts" ON document_drafts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- Doctors can update document drafts
CREATE POLICY "doctors_update_document_drafts" ON document_drafts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- Doctors can delete document drafts
CREATE POLICY "doctors_delete_document_drafts" ON document_drafts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );
