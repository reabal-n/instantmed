-- Create patient_flags table for fraud detection flagging
CREATE TABLE IF NOT EXISTS public.patient_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id),
  flag_type TEXT NOT NULL,
  reason TEXT,
  details JSONB,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, flag_type)
);

-- Create security_events table for injection attempt logging
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  patient_id UUID REFERENCES public.profiles(id),
  details JSONB,
  severity TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create date_change_requests table for certificate anti-backdating
CREATE TABLE IF NOT EXISTS public.date_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.intakes(id),
  original_date DATE NOT NULL,
  requested_date DATE NOT NULL,
  reason TEXT,
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approval_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create med_cert_audit_events for certificate submission auditing
CREATE TABLE IF NOT EXISTS public.med_cert_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID REFERENCES public.intakes(id),
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_patient_flags_patient_id ON public.patient_flags(patient_id);
CREATE INDEX IF NOT EXISTS idx_security_events_patient_id ON public.security_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_date_change_requests_intake_id ON public.date_change_requests(intake_id);

-- Enable RLS
ALTER TABLE public.patient_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.med_cert_audit_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access (these are internal tables)
CREATE POLICY "Service role full access" ON public.patient_flags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.security_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.date_change_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.med_cert_audit_events FOR ALL USING (true) WITH CHECK (true);
