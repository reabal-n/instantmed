-- Cron heartbeat monitoring table
-- Tracks last execution time for each cron job so the health-check
-- can detect when Vercel's scheduler silently stops firing crons.

CREATE TABLE IF NOT EXISTS cron_heartbeats (
  job_name TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_count BIGINT NOT NULL DEFAULT 1,
  last_duration_ms INTEGER,
  last_items_processed INTEGER,
  last_status TEXT NOT NULL DEFAULT 'ok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Increment run_count on upsert via trigger
CREATE OR REPLACE FUNCTION increment_cron_run_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD IS NOT NULL THEN
    NEW.run_count := OLD.run_count + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_cron_run_count
  BEFORE UPDATE ON cron_heartbeats
  FOR EACH ROW
  EXECUTE FUNCTION increment_cron_run_count();

-- RLS: service role only (crons use service role client)
ALTER TABLE cron_heartbeats ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE cron_heartbeats IS 'Tracks cron job execution heartbeats for monitoring missed executions';
