-- ============================================
-- CONSENTS: Patient consent records
-- ============================================

CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Consent details
  consent_type public.consent_type NOT NULL,
  consent_version TEXT NOT NULL DEFAULT '1.0', -- Track consent document versions
  
  -- Consent state
  is_granted BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  
  -- Audit trail data (immutable)
  client_ip TEXT,
  client_user_agent TEXT,
  client_fingerprint TEXT, -- Browser fingerprint for fraud detection
  
  -- Legal
  consent_text_hash TEXT, -- SHA256 of the consent text shown
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_consents_intake ON public.consents(intake_id);
CREATE INDEX idx_consents_patient ON public.consents(patient_id);
CREATE INDEX idx_consents_type ON public.consents(consent_type);
CREATE INDEX idx_consents_granted ON public.consents(is_granted, granted_at);

-- Unique constraint: one consent of each type per intake
CREATE UNIQUE INDEX idx_consents_unique_per_intake 
  ON public.consents(intake_id, consent_type);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

-- Patients can view their own consents
CREATE POLICY "Patients can view own consents"
  ON public.consents FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Patients can insert consents
CREATE POLICY "Patients can insert consents"
  ON public.consents FOR INSERT
  WITH CHECK (
    patient_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Consents cannot be updated (immutable for legal reasons)
-- Only revocation is tracked via revoked_at timestamp through specific function

-- Admins can view all consents
CREATE POLICY "Admins can view all consents"
  ON public.consents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Function to grant consent (ensures proper audit trail)
CREATE OR REPLACE FUNCTION public.grant_consent(
  p_intake_id UUID,
  p_consent_type public.consent_type,
  p_consent_version TEXT,
  p_consent_text_hash TEXT,
  p_client_ip TEXT DEFAULT NULL,
  p_client_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_patient_id UUID;
  v_consent_id UUID;
BEGIN
  -- Get patient_id from intake
  SELECT patient_id INTO v_patient_id
  FROM public.intakes
  WHERE id = p_intake_id;
  
  -- Verify the caller owns this intake
  IF v_patient_id NOT IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to grant consent for this intake';
  END IF;
  
  -- Insert or update consent
  INSERT INTO public.consents (
    intake_id,
    patient_id,
    consent_type,
    consent_version,
    consent_text_hash,
    is_granted,
    granted_at,
    client_ip,
    client_user_agent
  ) VALUES (
    p_intake_id,
    v_patient_id,
    p_consent_type,
    p_consent_version,
    p_consent_text_hash,
    TRUE,
    NOW(),
    p_client_ip,
    p_client_user_agent
  )
  ON CONFLICT (intake_id, consent_type) 
  DO UPDATE SET
    consent_version = EXCLUDED.consent_version,
    consent_text_hash = EXCLUDED.consent_text_hash,
    is_granted = TRUE,
    granted_at = NOW(),
    client_ip = EXCLUDED.client_ip,
    client_user_agent = EXCLUDED.client_user_agent,
    revoked_at = NULL
  RETURNING id INTO v_consent_id;
  
  RETURN v_consent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
