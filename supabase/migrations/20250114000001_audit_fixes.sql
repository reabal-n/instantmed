-- ============================================
-- AUDIT FIXES MIGRATION
-- Addresses P0-P2 issues from Stripe/Doctor Portal audit
-- ============================================

-- ============================================
-- 0. STORAGE BUCKET FOR DOCUMENTS
-- ============================================
-- Note: Storage bucket creation is done via Supabase dashboard or CLI
-- This is documented here for reference:
-- Bucket name: documents
-- Public: false
-- File size limit: 10MB
-- Allowed MIME types: application/pdf, image/png, image/jpeg

-- Storage policies are managed separately but should allow:
-- - Authenticated users to upload to their own folders
-- - Service role to upload anywhere
-- - Users to download their own documents

-- ============================================
-- 1. AHPRA Number for Doctors (P1)
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ahpra_number TEXT;

-- Index for lookup
CREATE INDEX IF NOT EXISTS idx_profiles_ahpra ON public.profiles(ahpra_number) 
WHERE ahpra_number IS NOT NULL;

COMMENT ON COLUMN public.profiles.ahpra_number IS 'AHPRA registration number for doctors (e.g., MED0002576546)';

-- ============================================
-- 2. Category on Requests (P1 - Fix retry price inference)
-- Note: requests table already has category/subtype columns
-- ============================================

-- ============================================
-- 3. Concurrent Review Lock (P1)
-- ============================================
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.requests.claimed_by IS 'Doctor who has claimed this request for review (prevents concurrent edits)';
COMMENT ON COLUMN public.requests.claimed_at IS 'When the request was claimed for review';

-- Index for finding unclaimed requests
CREATE INDEX IF NOT EXISTS idx_requests_claimed ON public.requests(claimed_by) 
WHERE claimed_by IS NOT NULL;

-- ============================================
-- 4. Documents Table for PDF Storage (P0)
-- ============================================
CREATE TABLE IF NOT EXISTS public.request_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'med_cert', 'referral', 'prescription', etc.
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size_bytes INTEGER,
  certificate_number TEXT, -- For med certs
  verification_code TEXT, -- For document verification
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_request_documents_request ON public.request_documents(request_id);
CREATE INDEX IF NOT EXISTS idx_request_documents_type ON public.request_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_request_documents_cert_number ON public.request_documents(certificate_number) 
WHERE certificate_number IS NOT NULL;

-- RLS
ALTER TABLE public.request_documents ENABLE ROW LEVEL SECURITY;

-- Patients can view their own documents
CREATE POLICY "Patients can view own documents"
  ON public.request_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      JOIN public.profiles p ON r.patient_id = p.id
      WHERE r.id = request_documents.request_id
      AND p.auth_user_id = auth.uid()
    )
  );

-- Doctors can view and create documents
CREATE POLICY "Doctors can view all documents"
  ON public.request_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('doctor', 'admin')
    )
  );

CREATE POLICY "Doctors can create documents"
  ON public.request_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('doctor', 'admin')
    )
  );

-- ============================================
-- 5. Decline Reason Templates (P0/P2)
-- ============================================
CREATE TABLE IF NOT EXISTS public.decline_reason_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  email_template TEXT, -- HTML template for decline email
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  requires_note BOOLEAN DEFAULT FALSE, -- Whether doctor must add custom note
  service_types TEXT[] DEFAULT '{}', -- Empty = all services
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default decline reasons
INSERT INTO public.decline_reason_templates (code, label, description, requires_note, display_order) VALUES
  ('requires_examination', 'Requires In-Person Examination', 'This condition requires a physical examination that cannot be done via telehealth.', false, 1),
  ('not_telehealth_suitable', 'Not Suitable for Telehealth', 'This type of request is not appropriate for telehealth consultation.', false, 2),
  ('prescribing_guidelines', 'Against Prescribing Guidelines', 'This request does not meet current prescribing guidelines.', true, 3),
  ('controlled_substance', 'Controlled Substance', 'Requests for controlled or Schedule 8 substances cannot be processed online.', false, 4),
  ('urgent_care_needed', 'Urgent Care Required', 'Your symptoms indicate you need urgent in-person medical attention.', true, 5),
  ('insufficient_info', 'Insufficient Information', 'We need more information to process your request safely.', true, 6),
  ('patient_not_eligible', 'Patient Not Eligible', 'You do not meet the eligibility criteria for this service.', true, 7),
  ('duplicate_request', 'Duplicate Request', 'This appears to be a duplicate of an existing request.', false, 8),
  ('outside_scope', 'Outside Scope of Practice', 'This request is outside the scope of our telehealth practice.', true, 9),
  ('other', 'Other', 'See doctor''s note for details.', true, 10)
ON CONFLICT (code) DO NOTHING;

-- RLS for templates
ALTER TABLE public.decline_reason_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates"
  ON public.decline_reason_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.decline_reason_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- 6. Dead Letter Queue for Webhook Failures (P0)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stripe_webhook_dead_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  session_id TEXT,
  request_id UUID,
  error_message TEXT NOT NULL,
  error_code TEXT,
  payload JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  last_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dead_letter_unresolved ON public.stripe_webhook_dead_letter(created_at) 
WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dead_letter_request ON public.stripe_webhook_dead_letter(request_id);
CREATE INDEX IF NOT EXISTS idx_dead_letter_event ON public.stripe_webhook_dead_letter(event_id);

-- RLS
ALTER TABLE public.stripe_webhook_dead_letter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dead letter queue"
  ON public.stripe_webhook_dead_letter FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can update dead letter queue"
  ON public.stripe_webhook_dead_letter FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- 7. Payment Reconciliation Table (P0)
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id),
  stripe_session_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  expected_status TEXT NOT NULL, -- What we expect the intake status to be
  actual_status TEXT, -- What the intake status actually is
  discrepancy_type TEXT, -- 'missing_payment', 'status_mismatch', 'orphan_payment'
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_action TEXT, -- 'marked_paid', 'refunded', 'manual_review'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_unresolved ON public.payment_reconciliation(created_at)
WHERE resolved = FALSE;

-- RLS
ALTER TABLE public.payment_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reconciliation"
  ON public.payment_reconciliation FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- 8. AI Draft Retry Tracking (P1)
-- ============================================
ALTER TABLE public.document_drafts 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

ALTER TABLE public.document_drafts 
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;

ALTER TABLE public.document_drafts 
ADD COLUMN IF NOT EXISTS alert_sent BOOLEAN DEFAULT FALSE;

-- ============================================
-- 9. Function to Claim Request for Review
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_request_for_review(
  p_request_id UUID,
  p_doctor_id UUID,
  p_force BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(success BOOLEAN, error_message TEXT, current_claimant TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_claimant_name TEXT;
BEGIN
  -- Get current request state
  SELECT r.*, p.full_name as claimant_name
  INTO v_request
  FROM public.requests r
  LEFT JOIN public.profiles p ON r.claimed_by = p.id
  WHERE r.id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Request not found'::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if already claimed by someone else
  IF v_request.claimed_by IS NOT NULL AND v_request.claimed_by != p_doctor_id THEN
    -- Check if claim is stale (older than 30 minutes)
    IF v_request.claimed_at < NOW() - INTERVAL '30 minutes' OR p_force THEN
      -- Allow takeover
      UPDATE public.requests
      SET claimed_by = p_doctor_id,
          claimed_at = NOW(),
          updated_at = NOW()
      WHERE id = p_request_id;
      
      RETURN QUERY SELECT TRUE, NULL::TEXT, v_request.claimant_name;
      RETURN;
    ELSE
      RETURN QUERY SELECT FALSE, 
        format('Already claimed by %s', v_request.claimant_name)::TEXT,
        v_request.claimant_name;
      RETURN;
    END IF;
  END IF;
  
  -- Claim the request
  UPDATE public.requests
  SET claimed_by = p_doctor_id,
      claimed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT;
END;
$$;

-- ============================================
-- 10. Function to Release Request Claim
-- ============================================
CREATE OR REPLACE FUNCTION public.release_request_claim(
  p_request_id UUID,
  p_doctor_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.requests
  SET claimed_by = NULL,
      claimed_at = NULL,
      updated_at = NOW()
  WHERE id = p_request_id
  AND (claimed_by = p_doctor_id OR claimed_by IS NULL);
  
  RETURN FOUND;
END;
$$;

-- ============================================
-- 11. Function to Add to Dead Letter Queue
-- ============================================
CREATE OR REPLACE FUNCTION public.add_to_webhook_dead_letter(
  p_event_id TEXT,
  p_event_type TEXT,
  p_session_id TEXT,
  p_request_id UUID,
  p_error_message TEXT,
  p_error_code TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.stripe_webhook_dead_letter (
    event_id, event_type, session_id, request_id, 
    error_message, error_code, payload
  )
  VALUES (
    p_event_id, p_event_type, p_session_id, p_request_id,
    p_error_message, p_error_code, p_payload
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- ============================================
-- 12. Trigger to Update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to new tables
DROP TRIGGER IF EXISTS set_request_documents_updated_at ON public.request_documents;
CREATE TRIGGER set_request_documents_updated_at
  BEFORE UPDATE ON public.request_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_decline_templates_updated_at ON public.decline_reason_templates;
CREATE TRIGGER set_decline_templates_updated_at
  BEFORE UPDATE ON public.decline_reason_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_reconciliation_updated_at ON public.payment_reconciliation;
CREATE TRIGGER set_reconciliation_updated_at
  BEFORE UPDATE ON public.payment_reconciliation
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
