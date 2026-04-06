CREATE TABLE IF NOT EXISTS patient_health_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  allergies JSONB DEFAULT '[]'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  current_medications JSONB DEFAULT '[]'::jsonb,
  blood_type TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_patient_health_profiles_patient ON patient_health_profiles(patient_id);

ALTER TABLE patient_health_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access" ON patient_health_profiles FOR ALL USING (auth.role() = 'service_role');
