-- ============================================
-- SCHEMA HARDENING MIGRATION
-- Generated: 2024-12-15
-- Purpose: Align database schema with backend code expectations
-- ============================================

-- ============================================
-- 1. PROFILES TABLE FIXES
-- ============================================

-- Add email column for guest checkout support
-- (Guest profiles need email stored before auth account exists)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on email for guest profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================
-- 2. REQUESTS TABLE FIXES
-- ============================================

-- Rename clinical_notes to clinical_note (code expects singular)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'clinical_notes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'clinical_note'
  ) THEN
    ALTER TABLE public.requests RENAME COLUMN clinical_notes TO clinical_note;
  END IF;
END $$;

-- Add doctor_notes for private doctor annotations
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS doctor_notes TEXT;

-- Add escalation tracking fields
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS escalation_level TEXT DEFAULT 'none';

ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS escalated_by UUID REFERENCES public.profiles(id);

-- Add followup tracking
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS flagged_for_followup BOOLEAN DEFAULT FALSE;

ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS followup_reason TEXT;

-- Add audit trail fields (who reviewed and when)
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Add script tracking fields
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS script_sent_at TIMESTAMPTZ;

ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS script_notes TEXT;

-- Add CHECK constraint for escalation_level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'requests_escalation_level_check'
  ) THEN
    ALTER TABLE public.requests
    ADD CONSTRAINT requests_escalation_level_check 
    CHECK (escalation_level IN ('none', 'senior_review', 'phone_consult'));
  END IF;
END $$;

-- Create composite index for doctor queue (hot path)
CREATE INDEX IF NOT EXISTS idx_requests_doctor_queue 
ON public.requests(status, payment_status, created_at DESC)
WHERE payment_status = 'paid';

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_requests_reviewed_by 
ON public.requests(reviewed_by) 
WHERE reviewed_by IS NOT NULL;

-- ============================================
-- 3. DOCUMENT_DRAFTS TABLE FIXES
-- ============================================

-- Rename document_type to type (code expects 'type')
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'document_drafts' AND column_name = 'document_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'document_drafts' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.document_drafts RENAME COLUMN document_type TO type;
  END IF;
END $$;

-- Rename content to data (code expects 'data')
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'document_drafts' AND column_name = 'content'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'document_drafts' AND column_name = 'data'
  ) THEN
    ALTER TABLE public.document_drafts RENAME COLUMN content TO data;
  END IF;
END $$;

-- Add subtype column (for med_cert subtypes: work, uni, carer)
ALTER TABLE public.document_drafts 
ADD COLUMN IF NOT EXISTS subtype TEXT;

-- ============================================
-- 4. CREATE DOCUMENTS TABLE (FOR GENERATED PDFS)
-- ============================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  subtype TEXT,
  pdf_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_request_id 
ON public.documents(request_id);

CREATE INDEX IF NOT EXISTS idx_documents_created_at 
ON public.documents(created_at DESC);

-- RLS for documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Patients can view their own documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Patients can view own documents'
  ) THEN
    CREATE POLICY "Patients can view own documents"
    ON public.documents FOR SELECT
    USING (
      request_id IN (
        SELECT r.id FROM public.requests r
        JOIN public.profiles p ON r.patient_id = p.id
        WHERE p.auth_user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Doctors can view all documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Doctors can view all documents'
  ) THEN
    CREATE POLICY "Doctors can view all documents"
    ON public.documents FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.role = 'doctor'
      )
    );
  END IF;
END $$;

-- Doctors can insert documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Doctors can insert documents'
  ) THEN
    CREATE POLICY "Doctors can insert documents"
    ON public.documents FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.role = 'doctor'
      )
    );
  END IF;
END $$;

-- ============================================
-- 5. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================

-- Index for document_verifications lookup by request
CREATE INDEX IF NOT EXISTS idx_document_verifications_request_id 
ON public.document_verifications(request_id);

-- Index for payments status lookup
CREATE INDEX IF NOT EXISTS idx_payments_status 
ON public.payments(status);

-- ============================================
-- 6. ENSURE stripe_webhook_events HAS UNIQUE CONSTRAINT
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'stripe_webhook_events_event_id_key'
  ) THEN
    ALTER TABLE public.stripe_webhook_events
    ADD CONSTRAINT stripe_webhook_events_event_id_key UNIQUE (event_id);
  END IF;
END $$;

-- ============================================
-- 7. ADD MISSING RLS POLICIES
-- ============================================

-- Ensure doctors can view requests (already checked but adding explicit policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'requests' AND policyname = 'Doctors can view all requests'
  ) THEN
    CREATE POLICY "Doctors can view all requests"
    ON public.requests FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.role = 'doctor'
      )
    );
  END IF;
END $$;

-- Ensure doctors can update requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'requests' AND policyname = 'Doctors can update requests'
  ) THEN
    CREATE POLICY "Doctors can update requests"
    ON public.requests FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.role = 'doctor'
      )
    );
  END IF;
END $$;
