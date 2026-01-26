-- Email outbox table for logging all transactional emails
-- Supports E2E testing seam and audit trail

CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core email fields
  email_type text NOT NULL,  -- 'med_cert_patient' | 'med_cert_employer' | 'welcome' | 'script_sent' | 'request_declined' | etc.
  to_email text NOT NULL,
  to_name text,
  subject text NOT NULL,
  
  -- Sending status
  status text NOT NULL DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed' | 'skipped_e2e'
  provider text NOT NULL DEFAULT 'resend',
  provider_message_id text,  -- Resend message ID when sent
  
  -- Error handling
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  
  -- Context/linking
  intake_id uuid REFERENCES intakes(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  certificate_id uuid REFERENCES issued_certificates(id) ON DELETE SET NULL,
  
  -- Metadata (non-sensitive only)
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  
  -- Rate limiting support
  CONSTRAINT email_outbox_status_check CHECK (status IN ('pending', 'sent', 'failed', 'skipped_e2e'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_outbox_intake_id ON email_outbox(intake_id) WHERE intake_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_outbox_patient_id ON email_outbox(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_outbox_email_type ON email_outbox(email_type);
CREATE INDEX IF NOT EXISTS idx_email_outbox_to_email ON email_outbox(to_email);
CREATE INDEX IF NOT EXISTS idx_email_outbox_created_at ON email_outbox(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(status);

-- Index for rate limiting: employer sends per intake in rolling window
CREATE INDEX IF NOT EXISTS idx_email_outbox_employer_rate_limit 
  ON email_outbox(intake_id, email_type, created_at DESC)
  WHERE email_type = 'med_cert_employer';

-- RLS policies
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;

-- Service role can do anything
CREATE POLICY "Service role full access on email_outbox"
  ON email_outbox
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Doctors can view emails for intakes they're assigned to
CREATE POLICY "Doctors can view email_outbox for their intakes"
  ON email_outbox
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('doctor', 'admin')
    )
    AND (
      intake_id IN (
        SELECT id FROM intakes
        WHERE reviewed_by = auth.uid() OR claimed_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Patients can view their own emails
CREATE POLICY "Patients can view their own emails"
  ON email_outbox
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Function to check employer email rate limit (3 per intake per 24 hours)
CREATE OR REPLACE FUNCTION check_employer_email_rate_limit(p_intake_id uuid)
RETURNS TABLE(allowed boolean, current_count integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  v_window_start := now() - interval '24 hours';
  
  SELECT COUNT(*)::integer INTO v_count
  FROM email_outbox
  WHERE intake_id = p_intake_id
    AND email_type = 'med_cert_employer'
    AND created_at > v_window_start
    AND status IN ('sent', 'skipped_e2e');  -- Only count successful sends
  
  RETURN QUERY SELECT 
    (v_count < 3) as allowed,
    v_count as current_count,
    (
      SELECT MIN(created_at) + interval '24 hours'
      FROM email_outbox
      WHERE intake_id = p_intake_id
        AND email_type = 'med_cert_employer'
        AND created_at > v_window_start
        AND status IN ('sent', 'skipped_e2e')
    ) as reset_at;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_employer_email_rate_limit(uuid) TO authenticated;

COMMENT ON TABLE email_outbox IS 'Audit log for all transactional emails sent by the system';
COMMENT ON COLUMN email_outbox.email_type IS 'Type of email: med_cert_patient, med_cert_employer, welcome, script_sent, request_declined, etc.';
COMMENT ON COLUMN email_outbox.status IS 'Delivery status: pending, sent, failed, skipped_e2e';
COMMENT ON COLUMN email_outbox.metadata IS 'Non-sensitive metadata like verification_code, secure_link_used flag';
