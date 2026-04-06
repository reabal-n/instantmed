-- ============================================
-- INTAKE EVENTS: Status transition audit log
-- ============================================
-- 
-- Tracks all intake status transitions for:
-- 1. Audit trail / compliance
-- 2. SLA monitoring / stuck detection
-- 3. Operational metrics
--

CREATE TABLE public.intake_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core reference
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  
  -- Actor information
  actor_role TEXT NOT NULL CHECK (actor_role IN ('patient', 'doctor', 'admin', 'system')),
  actor_id UUID REFERENCES public.profiles(id),
  
  -- Transition details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'status_change',
    'payment_received',
    'document_generated',
    'email_sent',
    'email_failed',
    'script_sent',
    'refund_processed',
    'escalated',
    'claimed',
    'unclaimed'
  )),
  from_status public.intake_status,
  to_status public.intake_status,
  
  -- Additional context
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_intake_events_intake_id ON public.intake_events(intake_id);
CREATE INDEX idx_intake_events_created_at ON public.intake_events(created_at DESC);
CREATE INDEX idx_intake_events_event_type ON public.intake_events(event_type);
CREATE INDEX idx_intake_events_to_status ON public.intake_events(to_status) WHERE to_status IS NOT NULL;

-- Composite index for stuck detection queries (paid intakes without review)
CREATE INDEX idx_intake_events_stuck_detection ON public.intake_events(intake_id, event_type, created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.intake_events ENABLE ROW LEVEL SECURITY;

-- Service role can insert (used by server actions)
-- No direct patient access to events table

-- Admins/doctors can view all events
CREATE POLICY "Admins can view all intake events"
  ON public.intake_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('admin', 'doctor')
    )
  );

-- Only service role can insert (enforced by using service role client)
CREATE POLICY "Service role can insert events"
  ON public.intake_events FOR INSERT
  WITH CHECK (true);

-- ============================================
-- HELPER FUNCTION: Log intake event
-- ============================================

CREATE OR REPLACE FUNCTION public.log_intake_event(
  p_intake_id UUID,
  p_event_type TEXT,
  p_actor_role TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_from_status public.intake_status DEFAULT NULL,
  p_to_status public.intake_status DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.intake_events (
    intake_id,
    event_type,
    actor_role,
    actor_id,
    from_status,
    to_status,
    metadata
  ) VALUES (
    p_intake_id,
    p_event_type,
    p_actor_role,
    p_actor_id,
    p_from_status,
    p_to_status,
    p_metadata
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- ============================================
-- VIEW: Stuck intakes detection
-- ============================================
-- 
-- SLA thresholds:
-- - paid → pending_review/in_review: 5 minutes
-- - pending_review/in_review → decision: 60 minutes  
-- - approved → delivery complete: 10 minutes
--

CREATE OR REPLACE VIEW public.v_stuck_intakes AS
WITH intake_with_timing AS (
  SELECT 
    i.id,
    i.reference_number,
    i.status,
    i.payment_status,
    i.category,
    i.subtype,
    i.is_priority,
    i.created_at,
    i.paid_at,
    i.reviewed_at,
    i.approved_at,
    i.completed_at,
    p.email AS patient_email,
    p.full_name AS patient_name,
    s.name AS service_name,
    s.type AS service_type,
    -- Calculate age in each state
    EXTRACT(EPOCH FROM (NOW() - COALESCE(i.paid_at, i.created_at))) / 60 AS minutes_since_paid,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(i.reviewed_at, i.paid_at, i.created_at))) / 60 AS minutes_in_review,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(i.approved_at, i.created_at))) / 60 AS minutes_since_approved,
    -- Check if delivery email exists
    EXISTS (
      SELECT 1 FROM public.email_outbox eo 
      WHERE eo.intake_id = i.id 
      AND eo.email_type IN ('request_approved', 'certificate_delivery', 'script_sent')
      AND eo.status = 'sent'
    ) AS delivery_email_sent,
    EXISTS (
      SELECT 1 FROM public.email_outbox eo 
      WHERE eo.intake_id = i.id 
      AND eo.email_type IN ('request_approved', 'certificate_delivery', 'script_sent')
      AND eo.status = 'failed'
    ) AS delivery_email_failed
  FROM public.intakes i
  LEFT JOIN public.profiles p ON p.id = i.patient_id
  LEFT JOIN public.services s ON s.id = i.service_id
  WHERE i.status NOT IN ('draft', 'pending_payment', 'completed', 'declined', 'cancelled', 'expired')
)
SELECT 
  id,
  reference_number,
  status,
  payment_status,
  category,
  subtype,
  service_name,
  service_type,
  is_priority,
  patient_email,
  patient_name,
  created_at,
  paid_at,
  reviewed_at,
  approved_at,
  minutes_since_paid,
  minutes_in_review,
  minutes_since_approved,
  delivery_email_sent,
  delivery_email_failed,
  -- Determine stuck reason
  CASE
    -- Paid but not reviewed within 5 min
    WHEN status = 'paid' 
      AND payment_status = 'paid'
      AND minutes_since_paid > 5 
    THEN 'paid_no_review'
    
    -- In review too long (60 min)
    WHEN status IN ('in_review', 'pending_info')
      AND minutes_in_review > 60
    THEN 'review_timeout'
    
    -- Approved but no delivery within 10 min
    WHEN status = 'approved'
      AND minutes_since_approved > 10
      AND NOT delivery_email_sent
    THEN 'delivery_pending'
    
    -- Approved but delivery failed
    WHEN status = 'approved'
      AND delivery_email_failed
      AND NOT delivery_email_sent
    THEN 'delivery_failed'
    
    ELSE NULL
  END AS stuck_reason,
  -- Calculate age for display
  CASE
    WHEN status = 'paid' THEN minutes_since_paid
    WHEN status IN ('in_review', 'pending_info') THEN minutes_in_review
    WHEN status = 'approved' THEN minutes_since_approved
    ELSE 0
  END AS stuck_age_minutes
FROM intake_with_timing
WHERE 
  -- Only include actually stuck intakes
  (
    (status = 'paid' AND payment_status = 'paid' AND minutes_since_paid > 5)
    OR (status IN ('in_review', 'pending_info') AND minutes_in_review > 60)
    OR (status = 'approved' AND minutes_since_approved > 10 AND NOT delivery_email_sent)
    OR (status = 'approved' AND delivery_email_failed AND NOT delivery_email_sent)
  );

-- Grant access to the view
GRANT SELECT ON public.v_stuck_intakes TO authenticated;

COMMENT ON TABLE public.intake_events IS 'Audit log for intake status transitions and significant events';
COMMENT ON VIEW public.v_stuck_intakes IS 'Real-time view of intakes stuck in SLA-breaching states';
