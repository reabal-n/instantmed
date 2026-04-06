CREATE TABLE IF NOT EXISTS doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Australia/Sydney',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id, day_of_week)
);

CREATE INDEX idx_doctor_availability_doctor ON doctor_availability(doctor_id);

ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON doctor_availability FOR ALL USING (auth.role() = 'service_role');
