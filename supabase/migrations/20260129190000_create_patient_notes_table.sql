-- Create patient_notes table for doctor/admin notes on patient profiles
CREATE TABLE IF NOT EXISTS patient_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_patient_notes_patient_id ON patient_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_notes_created_by ON patient_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_patient_notes_created_at ON patient_notes(created_at DESC);

-- Enable RLS
ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies - only doctors and admins can access
CREATE POLICY "Doctors and admins can view patient notes"
  ON patient_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('doctor', 'admin')
    )
  );

CREATE POLICY "Doctors and admins can insert patient notes"
  ON patient_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('doctor', 'admin')
    )
  );

CREATE POLICY "Doctors and admins can delete patient notes"
  ON patient_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access to patient_notes"
  ON patient_notes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE patient_notes IS 'Doctor/admin notes on patient profiles - internal only, not visible to patients';
