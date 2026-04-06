-- ============================================
-- INTAKES: Main request/consultation records
-- ============================================

CREATE TABLE public.intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  assigned_admin_id UUID REFERENCES public.profiles(id),
  
  -- Reference number for patients
  reference_number TEXT UNIQUE NOT NULL DEFAULT 
    'IM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6)),
  
  -- Status tracking
  status public.intake_status NOT NULL DEFAULT 'draft',
  previous_status public.intake_status,
  
  -- Priority and SLA
  is_priority BOOLEAN DEFAULT FALSE,
  sla_deadline TIMESTAMPTZ,
  sla_warning_sent BOOLEAN DEFAULT FALSE,
  sla_breached BOOLEAN DEFAULT FALSE,
  
  -- Risk assessment (populated by rules engine)
  risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_tier public.risk_tier DEFAULT 'low',
  risk_reasons JSONB DEFAULT '[]',
  risk_flags JSONB DEFAULT '[]', -- Specific flags that triggered
  
  -- Triage result
  triage_result TEXT CHECK (triage_result IN ('allow', 'request_more_info', 'requires_live_consult', 'decline')),
  triage_reasons JSONB DEFAULT '[]',
  requires_live_consult BOOLEAN DEFAULT FALSE,
  live_consult_reason TEXT,
  
  -- Payment
  payment_id TEXT, -- Stripe payment intent ID
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'failed')),
  amount_cents INTEGER,
  refund_amount_cents INTEGER DEFAULT 0,
  
  -- Admin workflow
  admin_notes TEXT, -- Internal notes not visible to patient
  decline_reason TEXT,
  escalation_notes TEXT,
  
  -- Timestamps for lifecycle
  submitted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Document references
  generated_document_url TEXT,
  generated_document_type TEXT,
  document_sent_at TIMESTAMPTZ,
  
  -- Client info for consent
  client_ip TEXT,
  client_user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_intakes_patient ON public.intakes(patient_id);
CREATE INDEX idx_intakes_service ON public.intakes(service_id);
CREATE INDEX idx_intakes_status ON public.intakes(status);
CREATE INDEX idx_intakes_assigned_admin ON public.intakes(assigned_admin_id) WHERE assigned_admin_id IS NOT NULL;
CREATE INDEX idx_intakes_reference ON public.intakes(reference_number);
CREATE INDEX idx_intakes_created ON public.intakes(created_at DESC);
CREATE INDEX idx_intakes_sla_deadline ON public.intakes(sla_deadline) WHERE sla_deadline IS NOT NULL AND status IN ('paid', 'in_review', 'pending_info');
CREATE INDEX idx_intakes_risk_tier ON public.intakes(risk_tier);
CREATE INDEX idx_intakes_payment_status ON public.intakes(payment_status);

-- Composite indexes for admin queue
CREATE INDEX idx_intakes_admin_queue ON public.intakes(status, is_priority DESC, created_at ASC) 
  WHERE status IN ('paid', 'in_review', 'pending_info');

CREATE TRIGGER intakes_updated_at
  BEFORE UPDATE ON public.intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function to set SLA deadline on payment
CREATE OR REPLACE FUNCTION public.set_intake_sla()
RETURNS TRIGGER AS $$
DECLARE
  service_record RECORD;
BEGIN
  -- Only set SLA when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    SELECT * INTO service_record FROM public.services WHERE id = NEW.service_id;
    
    IF NEW.is_priority THEN
      NEW.sla_deadline := NOW() + (service_record.sla_priority_minutes || ' minutes')::INTERVAL;
    ELSE
      NEW.sla_deadline := NOW() + (service_record.sla_standard_minutes || ' minutes')::INTERVAL;
    END IF;
    
    NEW.paid_at := NOW();
  END IF;
  
  -- Track status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.previous_status := OLD.status;
    
    -- Set timestamps based on status transitions
    CASE NEW.status
      WHEN 'in_review' THEN NEW.reviewed_at := NOW();
      WHEN 'approved' THEN NEW.approved_at := NOW();
      WHEN 'declined' THEN NEW.declined_at := NOW();
      WHEN 'completed' THEN NEW.completed_at := NOW();
      WHEN 'cancelled' THEN NEW.cancelled_at := NOW();
      ELSE NULL;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER intake_sla_trigger
  BEFORE UPDATE ON public.intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_intake_sla();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.intakes ENABLE ROW LEVEL SECURITY;

-- Patients can view their own intakes
CREATE POLICY "Patients can view own intakes"
  ON public.intakes FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Patients can create intakes
CREATE POLICY "Patients can create intakes"
  ON public.intakes FOR INSERT
  WITH CHECK (
    patient_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Patients can update their draft intakes
CREATE POLICY "Patients can update draft intakes"
  ON public.intakes FOR UPDATE
  USING (
    patient_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
    AND status IN ('draft', 'pending_payment', 'pending_info')
  );

-- Admins can view all intakes
CREATE POLICY "Admins can view all intakes"
  ON public.intakes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Admins can update intakes
CREATE POLICY "Admins can update intakes"
  ON public.intakes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );
