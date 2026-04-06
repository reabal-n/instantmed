-- Migration: Create email retry queue table
-- Enables reliable email delivery with automatic retries for failed notifications

CREATE TABLE IF NOT EXISTS email_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID REFERENCES intakes(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for processing retries efficiently
CREATE INDEX IF NOT EXISTS idx_email_retry_queue_next_retry 
ON email_retry_queue (next_retry_at ASC) 
WHERE next_retry_at IS NOT NULL AND retry_count < 3;

-- Index for finding exhausted retries
CREATE INDEX IF NOT EXISTS idx_email_retry_queue_exhausted 
ON email_retry_queue (retry_count) 
WHERE retry_count >= 3;

-- Index for linking back to intakes
CREATE INDEX IF NOT EXISTS idx_email_retry_queue_intake 
ON email_retry_queue (intake_id);

-- RLS policies
ALTER TABLE email_retry_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access (no direct user access)
CREATE POLICY "Service role full access to email_retry_queue"
ON email_retry_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view for debugging
CREATE POLICY "Admins can view email_retry_queue"
ON email_retry_queue
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.auth_user_id = (SELECT auth.uid())
    AND profiles.role = 'admin'
  )
);

-- Add notification_email_status and notification_email_error to intakes if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'intakes' AND column_name = 'notification_email_status'
  ) THEN
    ALTER TABLE intakes ADD COLUMN notification_email_status TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'intakes' AND column_name = 'notification_email_error'
  ) THEN
    ALTER TABLE intakes ADD COLUMN notification_email_error TEXT;
  END IF;
END $$;

COMMENT ON TABLE email_retry_queue IS 'Queue for retrying failed email notifications';
COMMENT ON COLUMN email_retry_queue.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN email_retry_queue.next_retry_at IS 'When to attempt next retry (null = exhausted)';
