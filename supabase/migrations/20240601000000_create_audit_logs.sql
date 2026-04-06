-- Create audit_logs table for security and compliance tracking
-- Note: Table already exists in production with this schema:
--   id, request_id, actor_id, actor_type, action, from_state, to_state, metadata, ip_address, user_agent, created_at
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_type TEXT,
  action TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request ON audit_logs(request_id);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs (use DROP POLICY IF EXISTS for idempotency)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

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
DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE audit_logs IS 'Tracks security-relevant actions for compliance and debugging';
COMMENT ON COLUMN audit_logs.action IS 'Type of action: login, logout, request_approved, state_change, etc.';
COMMENT ON COLUMN audit_logs.actor_type IS 'Type of actor: patient, doctor, admin, system';
