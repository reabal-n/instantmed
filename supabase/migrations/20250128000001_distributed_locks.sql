-- Distributed Locks Table
-- Used for preventing concurrent execution of critical operations

CREATE TABLE IF NOT EXISTS distributed_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  lock_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_distributed_locks_expires_at 
  ON distributed_locks(expires_at);

-- Index for key lookups
CREATE INDEX IF NOT EXISTS idx_distributed_locks_key 
  ON distributed_locks(key);

-- Auto-cleanup function for expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM distributed_locks WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- RLS: Only service role can access locks
ALTER TABLE distributed_locks ENABLE ROW LEVEL SECURITY;

-- No policies = only service role can access
-- This is intentional for security

COMMENT ON TABLE distributed_locks IS 'Distributed locks for concurrent operation prevention';
COMMENT ON COLUMN distributed_locks.key IS 'Unique lock identifier (e.g., intake-approval-123)';
COMMENT ON COLUMN distributed_locks.lock_id IS 'Unique ID for this lock acquisition';
COMMENT ON COLUMN distributed_locks.expires_at IS 'When the lock automatically expires';
