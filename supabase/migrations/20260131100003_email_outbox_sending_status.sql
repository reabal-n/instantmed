-- Add 'sending' status for atomic claim mechanism
-- This prevents duplicate sends when cron runs twice or admin clicks resend during cron

ALTER TABLE email_outbox 
DROP CONSTRAINT IF EXISTS email_outbox_status_check;

ALTER TABLE email_outbox 
ADD CONSTRAINT email_outbox_status_check 
CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped_e2e'));

COMMENT ON COLUMN email_outbox.status IS 'pending=new, sending=claimed by dispatcher, sent=delivered, failed=error, skipped_e2e=test mode';
