-- Create cron_locks table for serverless cron job concurrency control
-- Prevents overlapping execution when a cron job takes longer than its schedule interval

CREATE TABLE IF NOT EXISTS cron_locks (
  job_name TEXT PRIMARY KEY,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by TEXT,
  expires_at TIMESTAMPTZ
);

COMMENT ON TABLE cron_locks IS 'Prevents overlapping cron job execution in serverless environments. Locks auto-expire via acquireCronLock().';

-- Enable RLS (standard practice for all tables)
ALTER TABLE cron_locks ENABLE ROW LEVEL SECURITY;

-- Only the service role (server-side cron jobs) can read/write this table
CREATE POLICY "service_role_full_access" ON cron_locks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
