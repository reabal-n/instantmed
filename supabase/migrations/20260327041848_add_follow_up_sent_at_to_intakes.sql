-- Add follow-up email tracking to intakes
ALTER TABLE intakes
  ADD COLUMN IF NOT EXISTS follow_up_sent_at timestamptz DEFAULT NULL;

-- Index for cron query performance
CREATE INDEX IF NOT EXISTS idx_intakes_follow_up
  ON intakes (status, category, approved_at)
  WHERE follow_up_sent_at IS NULL;

COMMENT ON COLUMN intakes.follow_up_sent_at IS
  'When the day-3 post-approval follow-up email was sent. NULL = not yet sent.';
