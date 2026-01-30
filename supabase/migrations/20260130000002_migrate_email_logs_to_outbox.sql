-- Migrate historical data from email_logs to email_outbox
-- This is a one-time migration to consolidate email logging
-- Note: Production email_logs only has: id, request_id, recipient_email, template_type, subject, sent_at, metadata

-- Insert all email_logs data into email_outbox
INSERT INTO email_outbox (
  email_type,
  to_email,
  subject,
  status,
  provider,
  intake_id,
  metadata,
  created_at,
  sent_at
)
SELECT
  email_logs.template_type as email_type,
  email_logs.recipient_email as to_email,
  email_logs.subject,
  'sent' as status,
  'resend' as provider,
  email_logs.request_id as intake_id,
  email_logs.metadata,
  COALESCE(email_logs.sent_at, NOW()) as created_at,
  email_logs.sent_at
FROM email_logs
WHERE NOT EXISTS (
  SELECT 1 FROM email_outbox 
  WHERE email_outbox.to_email = email_logs.recipient_email
    AND email_outbox.email_type = email_logs.template_type
    AND email_outbox.created_at = email_logs.sent_at
);

-- Log migration stats
DO $$
DECLARE
  logs_count integer;
  outbox_count integer;
BEGIN
  SELECT COUNT(*) INTO logs_count FROM email_logs;
  SELECT COUNT(*) INTO outbox_count FROM email_outbox;
  RAISE NOTICE 'Migration complete: % records in email_logs, % records in email_outbox', logs_count, outbox_count;
END $$;
