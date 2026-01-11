-- ============================================================================
-- COMPLIANCE AUDIT LOGGING
-- Version: 1.0.0
-- Purpose: Implements AUDIT_LOGGING_REQUIREMENTS.md for regulatory compliance
-- ============================================================================

-- ============================================================================
-- COMPLIANCE AUDIT EVENT TYPES
-- Maps to requirements: Request Lifecycle, Clinician Involvement, Triage Outcome,
-- Synchronous Contact Indicators, Prescribing Boundary Evidence
-- ============================================================================

CREATE TYPE public.compliance_event_type AS ENUM (
  -- Request Lifecycle (Section 1)
  'request_created',
  'request_reviewed',
  'outcome_assigned',
  
  -- Clinician Involvement (Section 2)
  'clinician_opened_request',
  'clinician_reviewed_request',
  'clinician_selected_outcome',
  
  -- Triage Outcome (Section 3)
  'triage_approved',
  'triage_needs_call',
  'triage_declined',
  'triage_outcome_changed',
  
  -- Synchronous Contact Indicators (Section 4)
  'call_required_flagged',
  'call_initiated',
  'call_completed',
  'decision_after_call',
  
  -- Prescribing Boundary Evidence (Section 5)
  'no_prescribing_in_platform',
  'external_prescribing_indicated'
);

-- ============================================================================
-- COMPLIANCE_AUDIT_LOG - Immutable append-only log for regulatory compliance
-- ============================================================================

CREATE TABLE public.compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event classification
  event_type public.compliance_event_type NOT NULL,
  
  -- Request reference (supports med_cert, repeat_rx, or generic intakes)
  request_id UUID NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('med_cert', 'repeat_rx', 'intake')),
  
  -- Actor attribution (who performed the action)
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('patient', 'clinician', 'admin', 'system')),
  
  -- Human-in-the-loop proof
  is_human_action BOOLEAN NOT NULL DEFAULT true,
  
  -- Outcome tracking
  outcome TEXT, -- 'approved', 'needs_call', 'declined'
  previous_outcome TEXT, -- For triage_outcome_changed events
  
  -- Call tracking (Section 4)
  call_required BOOLEAN,
  call_occurred BOOLEAN,
  call_completed_before_decision BOOLEAN,
  
  -- Prescribing boundary (Section 5)
  prescribing_occurred_in_platform BOOLEAN DEFAULT false,
  external_prescribing_reference TEXT, -- e.g., "Parchment", "External PBS"
  
  -- Event details (flexible JSONB for additional context)
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Audit metadata
  ip_address INET,
  user_agent TEXT,
  
  -- Immutable timestamp (cannot be modified after creation)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_outcome CHECK (
    outcome IS NULL OR outcome IN ('approved', 'needs_call', 'declined')
  ),
  CONSTRAINT valid_previous_outcome CHECK (
    previous_outcome IS NULL OR previous_outcome IN ('approved', 'needs_call', 'declined')
  )
);

-- Indexes for audit queries
CREATE INDEX idx_compliance_audit_request ON public.compliance_audit_log(request_id);
CREATE INDEX idx_compliance_audit_type ON public.compliance_audit_log(event_type);
CREATE INDEX idx_compliance_audit_actor ON public.compliance_audit_log(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_compliance_audit_created ON public.compliance_audit_log(created_at DESC);
CREATE INDEX idx_compliance_audit_request_type ON public.compliance_audit_log(request_type);

-- Composite index for request timeline reconstruction
CREATE INDEX idx_compliance_audit_request_timeline 
  ON public.compliance_audit_log(request_id, created_at ASC);

-- ============================================================================
-- RLS POLICIES - Append-only, no updates or deletes
-- ============================================================================

ALTER TABLE public.compliance_audit_log ENABLE ROW LEVEL SECURITY;

-- Only clinicians and admins can read compliance audit logs
CREATE POLICY "Clinicians and admins can read compliance audit"
  ON public.compliance_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('clinician', 'doctor', 'admin')
    )
  );

-- Insert allowed via security definer function only (no direct INSERT policy)
-- This ensures all inserts go through the controlled function

-- No UPDATE or DELETE policies - logs are immutable

-- ============================================================================
-- LOGGING FUNCTION (Security Definer)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_compliance_event(
  p_event_type public.compliance_event_type,
  p_request_id UUID,
  p_request_type TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_actor_role TEXT DEFAULT 'system',
  p_is_human_action BOOLEAN DEFAULT true,
  p_outcome TEXT DEFAULT NULL,
  p_previous_outcome TEXT DEFAULT NULL,
  p_call_required BOOLEAN DEFAULT NULL,
  p_call_occurred BOOLEAN DEFAULT NULL,
  p_call_completed_before_decision BOOLEAN DEFAULT NULL,
  p_prescribing_occurred_in_platform BOOLEAN DEFAULT false,
  p_external_prescribing_reference TEXT DEFAULT NULL,
  p_event_data JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.compliance_audit_log (
    event_type,
    request_id,
    request_type,
    actor_id,
    actor_role,
    is_human_action,
    outcome,
    previous_outcome,
    call_required,
    call_occurred,
    call_completed_before_decision,
    prescribing_occurred_in_platform,
    external_prescribing_reference,
    event_data,
    ip_address,
    user_agent
  ) VALUES (
    p_event_type,
    p_request_id,
    p_request_type,
    p_actor_id,
    p_actor_role,
    p_is_human_action,
    p_outcome,
    p_previous_outcome,
    p_call_required,
    p_call_occurred,
    p_call_completed_before_decision,
    p_prescribing_occurred_in_platform,
    p_external_prescribing_reference,
    p_event_data,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- ============================================================================
-- AUDIT READINESS VIEW
-- Answers the 5 audit questions from AUDIT_LOGGING_REQUIREMENTS.md
-- ============================================================================

CREATE OR REPLACE VIEW public.compliance_audit_summary AS
SELECT
  cal.request_id,
  cal.request_type,
  
  -- Q1: Who reviewed this request?
  (
    SELECT p.full_name 
    FROM public.compliance_audit_log c
    JOIN public.profiles p ON p.id = c.actor_id
    WHERE c.request_id = cal.request_id
    AND c.event_type IN ('clinician_reviewed_request', 'clinician_selected_outcome')
    ORDER BY c.created_at DESC
    LIMIT 1
  ) AS reviewed_by,
  
  -- Q2: When was the decision made?
  (
    SELECT c.created_at 
    FROM public.compliance_audit_log c
    WHERE c.request_id = cal.request_id
    AND c.event_type = 'outcome_assigned'
    ORDER BY c.created_at DESC
    LIMIT 1
  ) AS decision_at,
  
  -- Q3: What was the outcome?
  (
    SELECT c.outcome 
    FROM public.compliance_audit_log c
    WHERE c.request_id = cal.request_id
    AND c.event_type = 'outcome_assigned'
    ORDER BY c.created_at DESC
    LIMIT 1
  ) AS final_outcome,
  
  -- Q4: Was a call required?
  (
    SELECT c.call_required 
    FROM public.compliance_audit_log c
    WHERE c.request_id = cal.request_id
    AND c.call_required IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT 1
  ) AS call_required,
  
  -- Q4b: Did a call occur before decision?
  (
    SELECT c.call_completed_before_decision 
    FROM public.compliance_audit_log c
    WHERE c.request_id = cal.request_id
    AND c.call_completed_before_decision IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT 1
  ) AS call_completed_before_decision,
  
  -- Q5: Where did prescribing occur?
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.compliance_audit_log c
      WHERE c.request_id = cal.request_id
      AND c.prescribing_occurred_in_platform = true
    ) THEN 'IN_PLATFORM_ERROR'
    WHEN EXISTS (
      SELECT 1 FROM public.compliance_audit_log c
      WHERE c.request_id = cal.request_id
      AND c.external_prescribing_reference IS NOT NULL
    ) THEN (
      SELECT c.external_prescribing_reference 
      FROM public.compliance_audit_log c
      WHERE c.request_id = cal.request_id
      AND c.external_prescribing_reference IS NOT NULL
      ORDER BY c.created_at DESC
      LIMIT 1
    )
    ELSE 'NO_PRESCRIBING'
  END AS prescribing_location,
  
  -- Human-in-the-loop verification
  EXISTS (
    SELECT 1 FROM public.compliance_audit_log c
    WHERE c.request_id = cal.request_id
    AND c.is_human_action = true
    AND c.actor_role = 'clinician'
    AND c.event_type IN ('clinician_reviewed_request', 'clinician_selected_outcome')
  ) AS has_human_review,
  
  -- Timeline completeness check
  (
    SELECT COUNT(DISTINCT c.event_type) 
    FROM public.compliance_audit_log c
    WHERE c.request_id = cal.request_id
    AND c.event_type IN ('request_created', 'request_reviewed', 'outcome_assigned')
  ) AS lifecycle_events_count

FROM public.compliance_audit_log cal
GROUP BY cal.request_id, cal.request_type;

-- ============================================================================
-- ADD CALL TRACKING COLUMNS TO EXISTING REQUEST TABLES
-- ============================================================================

-- Add call tracking to med_cert_requests if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'med_cert_requests') THEN
    ALTER TABLE public.med_cert_requests 
      ADD COLUMN IF NOT EXISTS call_required BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS call_occurred BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS call_occurred_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS call_completed_before_decision BOOLEAN;
  END IF;
END $$;

-- Add call tracking to intakes if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intakes') THEN
    ALTER TABLE public.intakes 
      ADD COLUMN IF NOT EXISTS call_required BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS call_occurred BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS call_occurred_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS call_completed_before_decision BOOLEAN;
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.compliance_audit_log IS 
  'Immutable audit log for regulatory compliance per AUDIT_LOGGING_REQUIREMENTS.md';
COMMENT ON COLUMN public.compliance_audit_log.is_human_action IS 
  'Proves human-in-the-loop review, not automation';
COMMENT ON COLUMN public.compliance_audit_log.prescribing_occurred_in_platform IS 
  'Must always be false - platform does not prescribe';
COMMENT ON COLUMN public.compliance_audit_log.external_prescribing_reference IS 
  'Reference to external prescribing system (e.g., Parchment)';
COMMENT ON VIEW public.compliance_audit_summary IS 
  'Answers the 5 audit readiness questions from AUDIT_LOGGING_REQUIREMENTS.md';
