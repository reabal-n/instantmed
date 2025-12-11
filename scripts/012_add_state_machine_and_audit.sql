-- Add new status values and audit logging for state machine
-- This extends the requests table with proper state machine states

-- Create request_state enum type with all states
DO $$ BEGIN
  -- Add new status values (existing: pending, approved, declined, needs_follow_up)
  -- New states: draft, awaiting_payment, paid, awaiting_review, in_review, completed
  ALTER TABLE requests 
    DROP CONSTRAINT IF EXISTS requests_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create audit_logs table for tracking all state transitions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  actor_id UUID, -- Who triggered the action (patient, doctor, system)
  actor_type TEXT NOT NULL DEFAULT 'system', -- 'patient', 'doctor', 'admin', 'system'
  action TEXT NOT NULL, -- 'status_change', 'payment', 'document_generated', etc.
  from_state TEXT,
  to_state TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rate_limits table for tracking API usage
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user ID
  identifier_type TEXT NOT NULL DEFAULT 'ip', -- 'ip' or 'user'
  endpoint TEXT NOT NULL,
  request_count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create fraud_flags table for abuse detection
CREATE TABLE IF NOT EXISTS fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL, -- 'multiple_daily', 'suspicious_medicare', 'rapid_completion', 'duplicate_request'
  severity TEXT NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high'
  details JSONB DEFAULT '{}',
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'request_received', 'payment_confirmed', 'approved', 'needs_info', 'declined'
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_request ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_patient ON fraud_flags(patient_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_unreviewed ON fraud_flags(reviewed) WHERE reviewed = FALSE;
CREATE INDEX IF NOT EXISTS idx_email_logs_request ON email_logs(request_id);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_logs (doctors and admins can view)
CREATE POLICY "doctors_view_audit_logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- RLS policies for fraud_flags (doctors and admins can view/update)
CREATE POLICY "doctors_view_fraud_flags" ON fraud_flags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );

CREATE POLICY "doctors_update_fraud_flags" ON fraud_flags
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- Service role has full access (for webhooks and system operations)
-- No explicit policies needed as service role bypasses RLS
