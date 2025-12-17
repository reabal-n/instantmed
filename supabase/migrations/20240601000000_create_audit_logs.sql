-- Create audit_logs table for security and compliance tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_id UUID,
  target_type TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_id, target_type);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can insert (for server-side logging)
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE audit_logs IS 'Tracks security-relevant actions for compliance and debugging';
COMMENT ON COLUMN audit_logs.action IS 'Type of action: login, logout, request_approved, etc.';
COMMENT ON COLUMN audit_logs.target_type IS 'Type of entity affected: request, profile, document, payment';
