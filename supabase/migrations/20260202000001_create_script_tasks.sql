-- Script To-Do List: tracks prescription requests that need to be sent via Parchment
CREATE TABLE IF NOT EXISTS script_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID REFERENCES intakes(id) ON DELETE SET NULL,
  repeat_rx_request_id UUID, -- for repeat-rx requests (separate table)
  doctor_id UUID NOT NULL REFERENCES profiles(id),
  patient_name TEXT NOT NULL,
  patient_email TEXT,
  medication_name TEXT,
  medication_strength TEXT,
  medication_form TEXT,
  status TEXT NOT NULL DEFAULT 'pending_send' CHECK (status IN ('pending_send', 'sent', 'confirmed')),
  notes TEXT,
  sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_script_tasks_doctor_status ON script_tasks(doctor_id, status);
CREATE INDEX idx_script_tasks_status ON script_tasks(status);
CREATE INDEX idx_script_tasks_intake ON script_tasks(intake_id);
CREATE INDEX idx_script_tasks_created ON script_tasks(created_at DESC);

-- RLS policies
ALTER TABLE script_tasks ENABLE ROW LEVEL SECURITY;

-- Doctors and admins can see all script tasks
CREATE POLICY "Doctors and admins can view script tasks" ON script_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('doctor', 'admin')
    )
  );

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access" ON script_tasks
  FOR ALL USING (auth.role() = 'service_role');
