-- Patient Messages Table for async doctor-patient communication
-- This enables follow-up questions and information requests

CREATE TABLE IF NOT EXISTS patient_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  intake_id UUID REFERENCES intakes(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'doctor', 'system')),
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_patient_messages_patient_id ON patient_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_messages_intake_id ON patient_messages(intake_id);
CREATE INDEX IF NOT EXISTS idx_patient_messages_created_at ON patient_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_messages_unread ON patient_messages(patient_id, sender_type, read_at) 
  WHERE read_at IS NULL;

-- RLS Policies
ALTER TABLE patient_messages ENABLE ROW LEVEL SECURITY;

-- Patients can read their own messages
CREATE POLICY "Patients can read own messages"
  ON patient_messages FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Patients can insert messages (as patient sender)
CREATE POLICY "Patients can send messages"
  ON patient_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
    AND sender_type = 'patient'
  );

-- Doctors/admins can read all messages
CREATE POLICY "Doctors can read all messages"
  ON patient_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('doctor', 'admin')
    )
  );

-- Doctors/admins can insert messages
CREATE POLICY "Doctors can send messages"
  ON patient_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('doctor', 'admin')
    )
    AND sender_type IN ('doctor', 'system')
  );

-- Doctors/admins can update messages (for read receipts)
CREATE POLICY "Doctors can update messages"
  ON patient_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('doctor', 'admin')
    )
  );

-- Patients can update their own messages' read status
CREATE POLICY "Patients can mark messages as read"
  ON patient_messages FOR UPDATE
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_patient_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patient_messages_updated_at
  BEFORE UPDATE ON patient_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_messages_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON patient_messages TO authenticated;
