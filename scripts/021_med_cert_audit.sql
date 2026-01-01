-- ============================================================================
-- MEDICAL CERTIFICATE AUDIT TABLES
-- Version: 2.0.0
-- Purpose: Stores audit-compliant records for medical certificate requests
-- ============================================================================

-- Enum for certificate types
CREATE TYPE certificate_type AS ENUM ('work', 'study', 'carer');

-- Enum for certificate request status
CREATE TYPE med_cert_status AS ENUM (
  'draft',
  'pending_review',
  'under_review',
  'approved',
  'rejected',
  'cancelled',
  'escalated_to_call'
);

-- ============================================================================
-- MED_CERT_REQUESTS - Main request table
-- ============================================================================
CREATE TABLE med_cert_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Certificate details
  certificate_type certificate_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days >= 1 AND duration_days <= 14),
  
  -- Symptoms (JSONB for flexibility and audit trail)
  symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
  other_symptom_text TEXT,
  
  -- Carer-specific fields
  carer_person_name TEXT,
  carer_relationship TEXT,
  
  -- Request status
  status med_cert_status NOT NULL DEFAULT 'pending_review',
  
  -- Clinician assignment
  assigned_clinician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Safety confirmation (immutable after submission)
  emergency_disclaimer_confirmed BOOLEAN NOT NULL DEFAULT false,
  emergency_disclaimer_timestamp TIMESTAMPTZ,
  patient_confirmed_accurate BOOLEAN NOT NULL DEFAULT false,
  patient_confirmed_timestamp TIMESTAMPTZ,
  
  -- Escalation
  escalated_to_call BOOLEAN NOT NULL DEFAULT false,
  escalation_reason TEXT,
  
  -- Template version for audit
  template_version TEXT NOT NULL DEFAULT '2.0.0',
  
  -- Payment
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  amount_cents INTEGER,
  
  -- Decision
  decision_at TIMESTAMPTZ,
  decision_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  
  -- Generated certificate reference
  certificate_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for patient lookups
CREATE INDEX idx_med_cert_requests_patient ON med_cert_requests(patient_id);
-- Index for clinician queue
CREATE INDEX idx_med_cert_requests_status ON med_cert_requests(status) WHERE status = 'pending_review';
-- Index for assigned clinician
CREATE INDEX idx_med_cert_requests_assigned ON med_cert_requests(assigned_clinician_id) WHERE assigned_clinician_id IS NOT NULL;

-- ============================================================================
-- MED_CERT_AUDIT_EVENTS - Immutable audit log
-- ============================================================================
CREATE TABLE med_cert_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES med_cert_requests(id) ON DELETE CASCADE,
  
  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'request_created',
    'request_submitted',
    'request_viewed',
    'clinician_assigned',
    'clinician_unassigned',
    'decision_approved',
    'decision_rejected',
    'certificate_generated',
    'certificate_downloaded',
    'escalated_to_call',
    'payment_completed',
    'patient_viewed_decision'
  )),
  
  -- Actor who triggered the event
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role TEXT, -- 'patient', 'clinician', 'admin', 'system'
  
  -- Event data (JSONB for flexibility)
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- IP address for security audit
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp (immutable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for request lookups
CREATE INDEX idx_med_cert_audit_request ON med_cert_audit_events(request_id);
-- Index for event type filtering
CREATE INDEX idx_med_cert_audit_type ON med_cert_audit_events(event_type);
-- Index for actor lookups
CREATE INDEX idx_med_cert_audit_actor ON med_cert_audit_events(actor_id);

-- ============================================================================
-- MED_CERT_CERTIFICATES - Generated certificates (immutable)
-- ============================================================================
CREATE TABLE med_cert_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES med_cert_requests(id) ON DELETE CASCADE,
  
  -- Certificate content
  certificate_number TEXT NOT NULL UNIQUE,
  
  -- Patient details (snapshot at time of generation)
  patient_name TEXT NOT NULL,
  patient_dob DATE NOT NULL,
  
  -- Certificate details (snapshot)
  certificate_type certificate_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  symptoms_summary TEXT NOT NULL,
  
  -- Clinician who approved
  approving_clinician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  approving_clinician_name TEXT NOT NULL,
  approving_clinician_registration TEXT NOT NULL, -- AHPRA number
  
  -- PDF storage
  pdf_storage_path TEXT NOT NULL,
  pdf_hash TEXT NOT NULL, -- SHA256 for integrity verification
  pdf_size_bytes INTEGER NOT NULL,
  
  -- Watermark info
  watermark TEXT NOT NULL, -- e.g., "InstantMed • 2024-01-15 14:30:22 UTC • MC-2024-00001"
  
  -- Template version used
  template_version TEXT NOT NULL DEFAULT '2.0.0',
  
  -- Immutable timestamps
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Validity tracking
  is_valid BOOLEAN NOT NULL DEFAULT true,
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT
);

-- Index for request lookups
CREATE INDEX idx_med_cert_certificates_request ON med_cert_certificates(request_id);
-- Index for certificate number lookups
CREATE INDEX idx_med_cert_certificates_number ON med_cert_certificates(certificate_number);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE med_cert_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE med_cert_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE med_cert_certificates ENABLE ROW LEVEL SECURITY;

-- Patients can view their own requests
CREATE POLICY "Patients can view own med cert requests"
  ON med_cert_requests
  FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('clinician', 'admin')
    )
  );

-- Patients can create their own requests
CREATE POLICY "Patients can create med cert requests"
  ON med_cert_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- Only clinicians/admins can update requests
CREATE POLICY "Clinicians can update med cert requests"
  ON med_cert_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('clinician', 'admin')
    )
  );

-- Audit events are insert-only for authenticated users
CREATE POLICY "Insert audit events"
  ON med_cert_audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only clinicians/admins can read all audit events
CREATE POLICY "Read audit events"
  ON med_cert_audit_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM med_cert_requests
      WHERE id = med_cert_audit_events.request_id
      AND (
        patient_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role IN ('clinician', 'admin')
        )
      )
    )
  );

-- Patients can view their own certificates
CREATE POLICY "Patients can view own certificates"
  ON med_cert_certificates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM med_cert_requests
      WHERE id = med_cert_certificates.request_id
      AND (
        patient_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role IN ('clinician', 'admin')
        )
      )
    )
  );

-- Only clinicians can insert certificates
CREATE POLICY "Clinicians can insert certificates"
  ON med_cert_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('clinician', 'admin')
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on med_cert_requests
CREATE TRIGGER update_med_cert_requests_updated_at
  BEFORE UPDATE ON med_cert_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Link certificate back to request
CREATE OR REPLACE FUNCTION link_certificate_to_request()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE med_cert_requests
  SET certificate_id = NEW.id
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER link_certificate_trigger
  AFTER INSERT ON med_cert_certificates
  FOR EACH ROW
  EXECUTE FUNCTION link_certificate_to_request();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate unique certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT;
  sequence_num INTEGER;
  cert_number TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  
  -- Get next sequence number for this year
  SELECT COALESCE(
    (
      SELECT CAST(SPLIT_PART(certificate_number, '-', 3) AS INTEGER) + 1
      FROM med_cert_certificates
      WHERE certificate_number LIKE 'MC-' || year_str || '-%'
      ORDER BY generated_at DESC
      LIMIT 1
    ),
    1
  ) INTO sequence_num;
  
  cert_number := 'MC-' || year_str || '-' || LPAD(sequence_num::TEXT, 5, '0');
  RETURN cert_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE med_cert_requests IS 'Medical certificate requests with full audit trail';
COMMENT ON TABLE med_cert_audit_events IS 'Immutable audit log for medical certificate actions';
COMMENT ON TABLE med_cert_certificates IS 'Generated medical certificates with PDF hashes and watermarks';
COMMENT ON COLUMN med_cert_requests.template_version IS 'Version of the intake form template used - for audit compliance';
COMMENT ON COLUMN med_cert_certificates.pdf_hash IS 'SHA256 hash of PDF for integrity verification';
COMMENT ON COLUMN med_cert_certificates.watermark IS 'Human-readable watermark text embedded in PDF';
