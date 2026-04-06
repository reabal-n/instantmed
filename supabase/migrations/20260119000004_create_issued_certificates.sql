-- ============================================================================
-- ISSUED CERTIFICATES TABLE
-- Production-grade certificate issuance with idempotency and audit trail
-- ============================================================================

-- Certificate status enum
CREATE TYPE public.certificate_status AS ENUM (
  'valid',
  'revoked',
  'superseded',
  'expired'
);

-- Main issued certificates table
CREATE TABLE public.issued_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core identifiers
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE RESTRICT,
  certificate_number TEXT NOT NULL UNIQUE,
  verification_code TEXT NOT NULL,
  
  -- Idempotency key: hash of intake_id + doctor_id + issue_date
  -- Prevents duplicate certificates for the same intake
  idempotency_key TEXT NOT NULL UNIQUE,
  
  -- Certificate details
  certificate_type TEXT NOT NULL CHECK (certificate_type IN ('work', 'study', 'carer')),
  status public.certificate_status NOT NULL DEFAULT 'valid',
  
  -- Dates
  issue_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Patient snapshot (immutable at time of issue)
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  patient_name TEXT NOT NULL,
  patient_dob DATE,
  
  -- Doctor snapshot (immutable at time of issue)
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  doctor_name TEXT NOT NULL,
  doctor_nominals TEXT,
  doctor_provider_number TEXT NOT NULL,
  doctor_ahpra_number TEXT NOT NULL,
  
  -- Template versioning (for locked rendering)
  template_id UUID REFERENCES public.certificate_templates(id),
  template_version INTEGER,
  template_config_snapshot JSONB NOT NULL,
  clinic_identity_snapshot JSONB NOT NULL,
  
  -- Storage
  storage_path TEXT NOT NULL,
  pdf_hash TEXT, -- SHA-256 for integrity verification
  file_size_bytes INTEGER,
  
  -- Email delivery tracking
  email_sent_at TIMESTAMPTZ,
  email_delivery_id TEXT, -- Resend message ID
  email_failed_at TIMESTAMPTZ,
  email_failure_reason TEXT,
  email_retry_count INTEGER DEFAULT 0,
  
  -- Revocation (if applicable)
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.profiles(id),
  revocation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_revocation CHECK (
    (status != 'revoked') OR 
    (status = 'revoked' AND revoked_at IS NOT NULL AND revocation_reason IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_issued_certificates_intake ON public.issued_certificates(intake_id);
CREATE INDEX idx_issued_certificates_patient ON public.issued_certificates(patient_id);
CREATE INDEX idx_issued_certificates_doctor ON public.issued_certificates(doctor_id);
CREATE INDEX idx_issued_certificates_status ON public.issued_certificates(status) WHERE status = 'valid';
CREATE INDEX idx_issued_certificates_verification ON public.issued_certificates(verification_code);
CREATE INDEX idx_issued_certificates_email_failed ON public.issued_certificates(email_failed_at) 
  WHERE email_failed_at IS NOT NULL AND email_sent_at IS NULL;

-- RLS
ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;

-- Patients can view their own certificates
CREATE POLICY "Patients can view own certificates"
  ON public.issued_certificates FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = (SELECT auth.uid())
    )
  );

-- Doctors can view certificates they issued
CREATE POLICY "Doctors can view issued certificates"
  ON public.issued_certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = (SELECT auth.uid())
      AND p.role IN ('doctor', 'admin')
    )
  );

-- Only service role can insert/update (via server actions)
CREATE POLICY "Service role can manage certificates"
  ON public.issued_certificates FOR ALL
  USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE public.issued_certificates IS 'Immutable record of issued medical certificates with full audit trail';
COMMENT ON COLUMN public.issued_certificates.idempotency_key IS 'Unique key to prevent duplicate issuance: hash(intake_id, doctor_id, issue_date)';
COMMENT ON COLUMN public.issued_certificates.template_config_snapshot IS 'Frozen template config at time of issue for locked rendering';
COMMENT ON COLUMN public.issued_certificates.clinic_identity_snapshot IS 'Frozen clinic identity at time of issue';


-- ============================================================================
-- CERTIFICATE AUDIT LOG
-- Immutable audit trail for certificate lifecycle events
-- ============================================================================

CREATE TYPE public.certificate_event_type AS ENUM (
  'issued',
  'email_sent',
  'email_failed',
  'email_retry',
  'downloaded',
  'verified',
  'revoked',
  'superseded'
);

CREATE TABLE public.certificate_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Certificate reference
  certificate_id UUID NOT NULL REFERENCES public.issued_certificates(id) ON DELETE RESTRICT,
  
  -- Event details
  event_type public.certificate_event_type NOT NULL,
  
  -- Actor (who triggered the event)
  actor_id UUID REFERENCES public.profiles(id),
  actor_role TEXT CHECK (actor_role IN ('patient', 'doctor', 'admin', 'system')),
  
  -- Event metadata
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  
  -- Immutable timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for certificate lookup
CREATE INDEX idx_certificate_audit_log_cert ON public.certificate_audit_log(certificate_id);
CREATE INDEX idx_certificate_audit_log_type ON public.certificate_audit_log(event_type);

-- RLS
ALTER TABLE public.certificate_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.certificate_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = (SELECT auth.uid())
      AND p.role = 'admin'
    )
  );

-- Service role can insert
CREATE POLICY "Service role can insert audit logs"
  ON public.certificate_audit_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Function to log certificate events
CREATE OR REPLACE FUNCTION public.log_certificate_event(
  p_certificate_id UUID,
  p_event_type public.certificate_event_type,
  p_actor_id UUID DEFAULT NULL,
  p_actor_role TEXT DEFAULT 'system',
  p_event_data JSONB DEFAULT '{}'::jsonb,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.certificate_audit_log (
    certificate_id,
    event_type,
    actor_id,
    actor_role,
    event_data,
    ip_address,
    user_agent
  ) VALUES (
    p_certificate_id,
    p_event_type,
    p_actor_id,
    p_actor_role,
    p_event_data,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


-- ============================================================================
-- EMAIL DELIVERY LOG (for retry queue)
-- ============================================================================

CREATE TYPE public.email_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'bounced',
  'retrying'
);

CREATE TABLE public.email_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to certificate (if applicable)
  certificate_id UUID REFERENCES public.issued_certificates(id) ON DELETE SET NULL,
  intake_id UUID REFERENCES public.intakes(id) ON DELETE SET NULL,
  
  -- Recipient
  recipient_id UUID REFERENCES public.profiles(id),
  recipient_email TEXT NOT NULL,
  
  -- Email details
  email_type TEXT NOT NULL, -- 'certificate_issued', 'certificate_ready', etc.
  subject TEXT NOT NULL,
  
  -- Delivery status
  status public.email_status NOT NULL DEFAULT 'pending',
  
  -- External tracking
  resend_message_id TEXT,
  
  -- Failure tracking
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  last_retry_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_email_delivery_log_status ON public.email_delivery_log(status) 
  WHERE status IN ('failed', 'retrying');
CREATE INDEX idx_email_delivery_log_certificate ON public.email_delivery_log(certificate_id);
CREATE INDEX idx_email_delivery_log_retry ON public.email_delivery_log(next_retry_at) 
  WHERE status = 'retrying' AND next_retry_at IS NOT NULL;

-- RLS
ALTER TABLE public.email_delivery_log ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage email logs
CREATE POLICY "Admins can manage email logs"
  ON public.email_delivery_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = (SELECT auth.uid())
      AND p.role = 'admin'
    )
  );

-- Service role full access
CREATE POLICY "Service role can manage email logs"
  ON public.email_delivery_log FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.email_delivery_log IS 'Track email delivery attempts with retry capability';
