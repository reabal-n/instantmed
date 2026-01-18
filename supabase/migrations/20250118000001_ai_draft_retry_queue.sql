-- AI Draft Retry Queue
-- Allows failed AI draft generation to be retried via cron job

CREATE TABLE IF NOT EXISTS ai_draft_retry_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES intakes(id) ON DELETE CASCADE,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  last_error text,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Partial unique index to prevent duplicate pending retries for the same intake
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_intake 
  ON ai_draft_retry_queue(intake_id) 
  WHERE completed_at IS NULL;

-- Index for efficient cron job queries
CREATE INDEX IF NOT EXISTS idx_ai_draft_retry_pending 
  ON ai_draft_retry_queue(next_retry_at) 
  WHERE completed_at IS NULL AND attempts < max_attempts;

-- RLS policies
ALTER TABLE ai_draft_retry_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access (this is a background job table)
CREATE POLICY "Service role full access on ai_draft_retry_queue"
  ON ai_draft_retry_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE ai_draft_retry_queue IS 'Queue for retrying failed AI draft generation with exponential backoff';
