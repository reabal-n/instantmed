-- Remove email body columns from email_outbox
-- These were added for dispatcher retry but we'll reconstruct from intake/certificate data instead

ALTER TABLE email_outbox 
DROP COLUMN IF EXISTS html_body,
DROP COLUMN IF EXISTS text_body,
DROP COLUMN IF EXISTS from_email,
DROP COLUMN IF EXISTS reply_to;

-- Keep last_attempt_at for backoff querying (efficient index usage)
-- Keep the dispatcher index
