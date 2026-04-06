-- Add columns for retry/dispatcher support
-- last_attempt_at: when the last send attempt was made
-- html_body: store rendered HTML for retries (avoids re-rendering templates)

ALTER TABLE email_outbox 
ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
ADD COLUMN IF NOT EXISTS html_body text,
ADD COLUMN IF NOT EXISTS text_body text,
ADD COLUMN IF NOT EXISTS from_email text,
ADD COLUMN IF NOT EXISTS reply_to text;

-- Update retry_count default and ensure it's not null
ALTER TABLE email_outbox ALTER COLUMN retry_count SET DEFAULT 0;

-- Index for dispatcher query: pending/failed emails eligible for retry
CREATE INDEX IF NOT EXISTS idx_email_outbox_dispatcher 
  ON email_outbox(status, last_attempt_at, retry_count)
  WHERE status IN ('pending', 'failed');

COMMENT ON COLUMN email_outbox.last_attempt_at IS 'Timestamp of last send attempt for backoff calculation';
COMMENT ON COLUMN email_outbox.html_body IS 'Rendered HTML body for dispatcher retries';
