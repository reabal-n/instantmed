-- ============================================================================
-- REPEAT PRESCRIPTION SYSTEM TABLES
-- Migration: 020_repeat_rx_tables.sql
-- Description: Audit-safe repeat prescription request system
-- ============================================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- REPEAT RX REQUESTS
-- Core table for repeat prescription requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS repeat_rx_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Patient linkage (nullable for guest flow)
  patient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Guest info (used when patient_id is null)
  guest_email TEXT,
  guest_name TEXT,
  guest_phone TEXT,
  guest_dob DATE,
  
  -- Request status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',           -- Awaiting clinician review
    'approved',          -- Clinician approved
    'declined',          -- Clinician declined
    'requires_consult',  -- Red flags - needs brief consult
    'expired',           -- Request expired (not reviewed in time)
    'cancelled'          -- User cancelled
  )),
  
  -- Eligibility outcome from rules engine
  eligibility_result JSONB NOT NULL DEFAULT '{}',
  eligibility_passed BOOLEAN NOT NULL DEFAULT false,
  red_flags TEXT[] DEFAULT '{}',
  
  -- Clinical summary (structured JSON for clinician)
  clinical_summary JSONB NOT NULL DEFAULT '{}',
  
  -- Consent & compliance
  emergency_disclaimer_accepted BOOLEAN NOT NULL DEFAULT false,
  emergency_disclaimer_timestamp TIMESTAMPTZ,
  gp_attestation_accepted BOOLEAN NOT NULL DEFAULT false,
  gp_attestation_timestamp TIMESTAMPTZ,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_timestamp TIMESTAMPTZ,
  
  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  
  -- Payment (links to payments table)
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_repeat_rx_requests_patient ON repeat_rx_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_repeat_rx_requests_status ON repeat_rx_requests(status);
CREATE INDEX IF NOT EXISTS idx_repeat_rx_requests_created ON repeat_rx_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repeat_rx_requests_pending ON repeat_rx_requests(status) WHERE status = 'pending';

-- ============================================================================
-- REPEAT RX ANSWERS
-- Individual answers for audit trail (immutable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS repeat_rx_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES repeat_rx_requests(id) ON DELETE CASCADE,
  
  -- Question/answer data
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_value JSONB NOT NULL,
  answer_display TEXT, -- Human-readable answer
  
  -- Audit metadata
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  step_number INTEGER,
  ip_address INET,
  
  -- Immutability flag (soft-delete for corrections)
  is_current BOOLEAN NOT NULL DEFAULT true,
  superseded_by UUID REFERENCES repeat_rx_answers(id),
  
  UNIQUE(request_id, question_key, is_current) -- Only one current answer per question
);

CREATE INDEX IF NOT EXISTS idx_repeat_rx_answers_request ON repeat_rx_answers(request_id);
CREATE INDEX IF NOT EXISTS idx_repeat_rx_answers_current ON repeat_rx_answers(request_id) WHERE is_current = true;

-- ============================================================================
-- AUDIT EVENTS
-- Immutable audit log for compliance
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Event context
  event_type TEXT NOT NULL CHECK (event_type IN (
    'request_created',
    'step_completed',
    'answer_submitted',
    'consent_given',
    'eligibility_checked',
    'request_submitted',
    'clinician_viewed',
    'clinician_decision',
    'prescription_generated',
    'notification_sent',
    'request_expired',
    'request_cancelled'
  )),
  
  -- Related entities
  request_id UUID REFERENCES repeat_rx_requests(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  clinician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Event data
  event_data JSONB NOT NULL DEFAULT '{}',
  
  -- Actor info
  actor_type TEXT NOT NULL CHECK (actor_type IN ('patient', 'guest', 'clinician', 'system')),
  actor_id UUID,
  
  -- Technical metadata
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  
  -- Timestamp (immutable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_events_request ON audit_events(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_patient ON audit_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);

-- ============================================================================
-- CLINICIAN DECISIONS
-- Record of clinician review and decision
-- ============================================================================
CREATE TABLE IF NOT EXISTS clinician_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES repeat_rx_requests(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Decision
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'declined', 'requires_consult')),
  decision_reason TEXT NOT NULL, -- Mandatory reason
  
  -- Prescription details (if approved)
  medication_selected JSONB, -- AMT code, name, etc.
  pbs_schedule TEXT, -- PBS schedule if applicable
  pack_quantity INTEGER,
  dose_instructions TEXT,
  frequency TEXT,
  repeats_granted INTEGER DEFAULT 0 CHECK (repeats_granted >= 0 AND repeats_granted <= 1),
  
  -- Clinical notes
  clinical_notes TEXT,
  red_flag_review TEXT, -- How red flags were addressed
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prescription_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_clinician_decisions_request ON clinician_decisions(request_id);
CREATE INDEX IF NOT EXISTS idx_clinician_decisions_clinician ON clinician_decisions(clinician_id);

-- ============================================================================
-- PATIENT PREFERRED PHARMACY
-- Store patient's preferred pharmacy for prefill
-- ============================================================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_pharmacy_name TEXT,
ADD COLUMN IF NOT EXISTS preferred_pharmacy_address TEXT,
ADD COLUMN IF NOT EXISTS preferred_pharmacy_phone TEXT;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE repeat_rx_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE repeat_rx_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinician_decisions ENABLE ROW LEVEL SECURITY;

-- Patients can view their own requests
CREATE POLICY "Patients can view own requests" ON repeat_rx_requests
  FOR SELECT USING (auth.uid() = patient_id);

-- Patients can insert their own requests
CREATE POLICY "Patients can create requests" ON repeat_rx_requests
  FOR INSERT WITH CHECK (auth.uid() = patient_id OR patient_id IS NULL);

-- Clinicians can view pending requests (role check via profiles)
CREATE POLICY "Clinicians can view requests" ON repeat_rx_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('doctor', 'admin')
    )
  );

-- Clinicians can update request status
CREATE POLICY "Clinicians can update requests" ON repeat_rx_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('doctor', 'admin')
    )
  );

-- Answers policies
CREATE POLICY "Users can view own answers" ON repeat_rx_answers
  FOR SELECT USING (
    request_id IN (SELECT id FROM repeat_rx_requests WHERE patient_id = auth.uid())
  );

CREATE POLICY "Users can insert answers" ON repeat_rx_answers
  FOR INSERT WITH CHECK (
    request_id IN (SELECT id FROM repeat_rx_requests WHERE patient_id = auth.uid() OR patient_id IS NULL)
  );

-- Audit events - read only for admins
CREATE POLICY "Admins can view audit events" ON audit_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Clinician decisions
CREATE POLICY "Clinicians can manage decisions" ON clinician_decisions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('doctor', 'admin')
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_repeat_rx_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_repeat_rx_updated_at
  BEFORE UPDATE ON repeat_rx_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_repeat_rx_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE repeat_rx_requests IS 'Repeat prescription requests with full audit trail';
COMMENT ON TABLE repeat_rx_answers IS 'Individual question answers for audit (immutable)';
COMMENT ON TABLE audit_events IS 'Immutable audit log for compliance and legal requirements';
COMMENT ON TABLE clinician_decisions IS 'Clinician review decisions with mandatory reasoning';
