-- =============================================================================
-- Launch Readiness Migration
-- 2026-02-21
--
-- 1. Drop dead tables (request_documents, phi_encryption_keys, audit_logs_archive)
-- 2. Create repeat_rx_requests + repeat_rx_answers + clinician_decisions + audit_events
-- 3. Add missing indexes for RLS performance
-- 4. Add missing index on intake_documents.intake_id
-- =============================================================================

-- -------------------------------------------------------
-- 1. DROP DEAD TABLES
-- -------------------------------------------------------

-- request_documents: zero code references, superseded by documents table
DROP TABLE IF EXISTS public.request_documents CASCADE;

-- phi_encryption_keys: zero code references, never populated
DROP TABLE IF EXISTS public.phi_encryption_keys CASCADE;

-- audit_logs_archive: zero code references, never populated
DROP TABLE IF EXISTS public.audit_logs_archive CASCADE;


-- -------------------------------------------------------
-- 2a. CREATE repeat_rx_requests
-- Schema inferred from app/api/repeat-rx/submit/route.ts insert (lines 161-182)
-- and app/api/repeat-rx/[id]/decision/route.ts reads
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.repeat_rx_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Patient
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  guest_email TEXT,

  -- Medication details (from AMT search)
  medication_code TEXT NOT NULL,
  medication_display TEXT NOT NULL,
  medication_strength TEXT,
  medication_form TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'declined', 'requires_consult', 'cancelled'
  )),
  reviewed_at TIMESTAMPTZ,

  -- Eligibility
  eligibility_passed BOOLEAN NOT NULL DEFAULT false,
  eligibility_result JSONB,

  -- Clinical
  clinical_summary JSONB,

  -- Consent timestamps
  emergency_consent_at TEXT,
  gp_attestation_at TEXT,
  terms_consent_at TEXT,

  -- Pharmacy details
  pharmacy_name TEXT,
  pharmacy_address TEXT,
  pharmacy_phone TEXT,

  -- Submission metadata
  submission_ip TEXT,
  submission_user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_repeat_rx_requests_patient_id ON public.repeat_rx_requests(patient_id);
CREATE INDEX idx_repeat_rx_requests_status ON public.repeat_rx_requests(status);
CREATE INDEX idx_repeat_rx_requests_medication ON public.repeat_rx_requests(medication_code);
CREATE INDEX idx_repeat_rx_requests_created ON public.repeat_rx_requests(created_at DESC);

-- RLS
ALTER TABLE public.repeat_rx_requests ENABLE ROW LEVEL SECURITY;

-- Patients can read their own requests
CREATE POLICY "Patients can view own repeat-rx requests"
  ON public.repeat_rx_requests
  FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Doctors/admins can view all requests
CREATE POLICY "Doctors and admins can view all repeat-rx requests"
  ON public.repeat_rx_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('doctor', 'admin')
    )
  );

-- Doctors/admins can update requests (status changes)
CREATE POLICY "Doctors and admins can update repeat-rx requests"
  ON public.repeat_rx_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('doctor', 'admin')
    )
  );

-- Service role can do everything (for server-side operations)
CREATE POLICY "Service role full access on repeat_rx_requests"
  ON public.repeat_rx_requests
  FOR ALL
  USING (auth.role() = 'service_role');


-- -------------------------------------------------------
-- 2b. CREATE repeat_rx_answers
-- Schema inferred from app/api/repeat-rx/submit/route.ts insert (lines 193-198)
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.repeat_rx_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.repeat_rx_requests(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  answers JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One set of answers per version per request
  UNIQUE(intake_id, version)
);

CREATE INDEX idx_repeat_rx_answers_intake_id ON public.repeat_rx_answers(intake_id);

-- RLS
ALTER TABLE public.repeat_rx_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own repeat-rx answers"
  ON public.repeat_rx_answers
  FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors and admins can view all repeat-rx answers"
  ON public.repeat_rx_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('doctor', 'admin')
    )
  );

CREATE POLICY "Service role full access on repeat_rx_answers"
  ON public.repeat_rx_answers
  FOR ALL
  USING (auth.role() = 'service_role');


-- -------------------------------------------------------
-- 2c. CREATE clinician_decisions
-- Schema inferred from app/api/repeat-rx/[id]/decision/route.ts insert (lines 120-132)
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.clinician_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.repeat_rx_requests(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES public.profiles(id),

  -- Decision
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'decline', 'needs_call')),
  decision_reason TEXT,

  -- Prescription details (for approvals)
  pbs_schedule TEXT,
  pack_quantity INTEGER,
  dose_instructions TEXT,
  frequency TEXT,
  repeats_granted INTEGER DEFAULT 0,

  -- Clinical
  clinical_notes TEXT,
  red_flag_review JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clinician_decisions_intake_id ON public.clinician_decisions(intake_id);
CREATE INDEX idx_clinician_decisions_clinician_id ON public.clinician_decisions(clinician_id);

-- RLS
ALTER TABLE public.clinician_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors and admins can view all clinician decisions"
  ON public.clinician_decisions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('doctor', 'admin')
    )
  );

CREATE POLICY "Doctors and admins can create clinician decisions"
  ON public.clinician_decisions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('doctor', 'admin')
    )
  );

CREATE POLICY "Service role full access on clinician_decisions"
  ON public.clinician_decisions
  FOR ALL
  USING (auth.role() = 'service_role');


-- -------------------------------------------------------
-- 2d. CREATE audit_events (general purpose)
-- Used by repeat-rx routes for event logging
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID,
  patient_id UUID REFERENCES public.profiles(id),
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_intake_id ON public.audit_events(intake_id);
CREATE INDEX idx_audit_events_patient_id ON public.audit_events(patient_id);
CREATE INDEX idx_audit_events_type ON public.audit_events(event_type);

-- RLS
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors and admins can view audit events"
  ON public.audit_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('doctor', 'admin')
    )
  );

CREATE POLICY "Service role full access on audit_events"
  ON public.audit_events
  FOR ALL
  USING (auth.role() = 'service_role');


-- -------------------------------------------------------
-- 3. ADD MISSING INDEXES FOR RLS PERFORMANCE
-- -------------------------------------------------------

-- intake_documents.intake_id (missing, commonly filtered in RLS joins)
CREATE INDEX IF NOT EXISTS idx_intake_documents_intake_id
  ON public.intake_documents(intake_id);

-- delivery_tracking: commonly queried by intake_id
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_intake_id
  ON public.delivery_tracking(intake_id);

-- issued_certificates: doctor lookup
CREATE INDEX IF NOT EXISTS idx_issued_certificates_doctor
  ON public.issued_certificates(doctor_id);

-- certificate_audit_log: certificate lookup
CREATE INDEX IF NOT EXISTS idx_certificate_audit_log_cert
  ON public.certificate_audit_log(certificate_id);


-- -------------------------------------------------------
-- 4. updated_at TRIGGER for repeat_rx_requests
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_repeat_rx_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_repeat_rx_updated_at
  BEFORE UPDATE ON public.repeat_rx_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repeat_rx_updated_at();
