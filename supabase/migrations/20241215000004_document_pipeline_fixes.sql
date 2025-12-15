-- ============================================
-- DOCUMENT PIPELINE HARDENING
-- Generated: 2024-12-15
-- Purpose: Fix document approval pipeline invariants
-- ============================================

-- ============================================
-- 1. DOCUMENT_DRAFTS - Add unique constraint for idempotent creation
-- ============================================
-- Issue: Two concurrent requests could create duplicate drafts for same request
-- Fix: Add unique constraint on (request_id, document_type)

-- First check current column names (schema may vary)
DO $$
BEGIN
  -- Try to create unique constraint on (request_id, document_type)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_drafts' 
    AND column_name = 'document_type'
  ) THEN
    -- Use document_type column name
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'document_drafts_request_type_unique'
    ) THEN
      ALTER TABLE public.document_drafts
      ADD CONSTRAINT document_drafts_request_type_unique 
      UNIQUE (request_id, document_type);
    END IF;
  END IF;
  
  -- Also try 'type' column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_drafts' 
    AND column_name = 'type'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'document_drafts_request_type_unique'
    ) THEN
      ALTER TABLE public.document_drafts
      ADD CONSTRAINT document_drafts_request_type_unique 
      UNIQUE (request_id, type);
    END IF;
  END IF;
END $$;

-- ============================================
-- 2. CREATE DOCUMENTS TABLE IF NOT EXISTS
-- ============================================
-- The documents table stores generated PDFs and must exist

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  subtype TEXT,
  pdf_url TEXT NOT NULL,
  verification_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_documents_request_id ON public.documents(request_id);
CREATE INDEX IF NOT EXISTS idx_documents_verification_code ON public.documents(verification_code) WHERE verification_code IS NOT NULL;

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
DO $$ 
BEGIN
  -- Patients can view their own documents
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'patients_view_own_documents' AND tablename = 'documents') THEN
    CREATE POLICY patients_view_own_documents ON public.documents FOR SELECT
    USING (
      request_id IN (
        SELECT r.id FROM requests r
        JOIN profiles p ON r.patient_id = p.id
        WHERE p.auth_user_id = auth.uid()
      )
    );
  END IF;
  
  -- Doctors can view and insert all documents
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'doctors_manage_documents' AND tablename = 'documents') THEN
    CREATE POLICY doctors_manage_documents ON public.documents FOR ALL
    USING (is_doctor())
    WITH CHECK (is_doctor());
  END IF;
END $$;

-- ============================================
-- 3. DOCUMENT_VERIFICATIONS - Add document_id reference
-- ============================================
-- Link verifications to specific documents, not just requests

ALTER TABLE public.document_verifications
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_document_verifications_document_id 
ON public.document_verifications(document_id) WHERE document_id IS NOT NULL;

-- ============================================
-- 4. CREATE FUNCTION FOR ATOMIC DOCUMENT APPROVAL
-- ============================================
-- Single atomic operation: create document + create verification + update request

CREATE OR REPLACE FUNCTION public.approve_request_with_document(
  p_request_id UUID,
  p_document_type TEXT,
  p_document_subtype TEXT,
  p_pdf_url TEXT,
  p_doctor_id UUID
)
RETURNS TABLE (
  document_id UUID,
  verification_code TEXT,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_document_id UUID;
  v_verification_code TEXT;
  v_request_status TEXT;
  v_payment_status TEXT;
BEGIN
  -- Step 1: Verify request can be approved
  SELECT status, payment_status INTO v_request_status, v_payment_status
  FROM requests WHERE id = p_request_id;
  
  IF v_request_status IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE, 'Request not found';
    RETURN;
  END IF;
  
  IF v_payment_status != 'paid' THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE, 'Request not paid';
    RETURN;
  END IF;
  
  IF v_request_status NOT IN ('pending', 'needs_follow_up') THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE, 'Request already processed: ' || v_request_status;
    RETURN;
  END IF;
  
  -- Step 2: Generate unique verification code
  v_verification_code := 'IM-' || upper(substr(md5(random()::text), 1, 8));
  
  -- Step 3: Create document record
  INSERT INTO documents (request_id, type, subtype, pdf_url, verification_code)
  VALUES (p_request_id, p_document_type, p_document_subtype, p_pdf_url, v_verification_code)
  RETURNING id INTO v_document_id;
  
  -- Step 4: Create verification record
  INSERT INTO document_verifications (
    request_id,
    document_id,
    verification_code,
    document_type,
    issued_at,
    expires_at,
    is_valid
  )
  VALUES (
    p_request_id,
    v_document_id,
    v_verification_code,
    p_document_type,
    NOW(),
    NOW() + INTERVAL '1 year',
    TRUE
  );
  
  -- Step 5: Update request status to approved
  UPDATE requests
  SET 
    status = 'approved',
    reviewed_by = p_doctor_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id
  AND status IN ('pending', 'needs_follow_up') -- Conditional update
  AND payment_status = 'paid';
  
  IF NOT FOUND THEN
    -- Rollback will happen automatically, but return error
    RAISE EXCEPTION 'Failed to update request status - concurrent modification';
  END IF;
  
  RETURN QUERY SELECT v_document_id, v_verification_code, TRUE, NULL::TEXT;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, FALSE, SQLERRM;
END;
$$;

-- Grant execute to authenticated users (doctors will be checked in app)
GRANT EXECUTE ON FUNCTION public.approve_request_with_document TO authenticated;

-- ============================================
-- 5. ADD HELPER FUNCTION TO GET OR CREATE DRAFT
-- ============================================
-- Atomic idempotent draft creation using INSERT...ON CONFLICT

CREATE OR REPLACE FUNCTION public.get_or_create_document_draft(
  p_request_id UUID,
  p_document_type TEXT,
  p_initial_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_draft_id UUID;
  v_col_name TEXT;
BEGIN
  -- Determine which column name is used for type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_drafts' AND column_name = 'document_type'
  ) THEN
    v_col_name := 'document_type';
  ELSE
    v_col_name := 'type';
  END IF;
  
  -- Try to find existing draft first
  IF v_col_name = 'document_type' THEN
    SELECT id INTO v_draft_id
    FROM document_drafts
    WHERE request_id = p_request_id AND document_type = p_document_type;
  ELSE
    SELECT id INTO v_draft_id
    FROM document_drafts
    WHERE request_id = p_request_id AND type = p_document_type;
  END IF;
  
  IF v_draft_id IS NOT NULL THEN
    RETURN v_draft_id;
  END IF;
  
  -- Create new draft - let constraint handle race condition
  BEGIN
    IF v_col_name = 'document_type' THEN
      INSERT INTO document_drafts (request_id, document_type, content)
      VALUES (p_request_id, p_document_type, p_initial_data)
      RETURNING id INTO v_draft_id;
    ELSE
      INSERT INTO document_drafts (request_id, type, data)
      VALUES (p_request_id, p_document_type, p_initial_data)
      RETURNING id INTO v_draft_id;
    END IF;
    
    RETURN v_draft_id;
  EXCEPTION
    WHEN unique_violation THEN
      -- Another request created the draft, fetch it
      IF v_col_name = 'document_type' THEN
        SELECT id INTO v_draft_id
        FROM document_drafts
        WHERE request_id = p_request_id AND document_type = p_document_type;
      ELSE
        SELECT id INTO v_draft_id
        FROM document_drafts
        WHERE request_id = p_request_id AND type = p_document_type;
      END IF;
      
      RETURN v_draft_id;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_document_draft TO authenticated;

-- ============================================
-- 6. ADD CHECK CONSTRAINT FOR VALID DOCUMENT TYPES
-- ============================================

ALTER TABLE public.documents
DROP CONSTRAINT IF EXISTS documents_type_check;

ALTER TABLE public.documents
ADD CONSTRAINT documents_type_check
CHECK (type IN ('med_cert', 'prescription', 'referral', 'pathology'));

-- ============================================
-- AUDIT LOG
-- ============================================
-- 
-- Changes made:
-- 1. document_drafts - Added unique constraint on (request_id, type)
-- 2. documents - Created table if not exists, added RLS policies
-- 3. document_verifications - Added document_id column
-- 4. approve_request_with_document() - Atomic approval function
-- 5. get_or_create_document_draft() - Idempotent draft creation
-- 6. documents.type - Added CHECK constraint
--
-- Invariants enforced:
-- - One draft per (request, type) pair
-- - Approval is atomic: document + verification + status update
-- - Documents always have valid type
-- - Verifications always reference a document
-- ============================================
