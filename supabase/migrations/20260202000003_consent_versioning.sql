CREATE TABLE IF NOT EXISTS consent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number INT NOT NULL,
  consent_type TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(consent_type, version_number)
);

CREATE TABLE IF NOT EXISTS patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id),
  consent_version_id UUID NOT NULL REFERENCES consent_versions(id),
  intake_id UUID REFERENCES intakes(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(patient_id, consent_version_id, intake_id)
);

CREATE INDEX idx_patient_consents_patient ON patient_consents(patient_id);
CREATE INDEX idx_consent_versions_type ON consent_versions(consent_type, version_number DESC);

ALTER TABLE consent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;

-- Service role access for all operations
CREATE POLICY "Service role access" ON consent_versions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role access" ON patient_consents FOR ALL USING (auth.role() = 'service_role');
