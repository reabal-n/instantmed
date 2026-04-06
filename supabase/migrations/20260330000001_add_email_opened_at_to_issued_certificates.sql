-- Add email delivery tracking to issued_certificates
ALTER TABLE issued_certificates
  ADD COLUMN IF NOT EXISTS email_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS resend_count integer NOT NULL DEFAULT 0;

-- Index for quick lookup of unconfirmed certs
CREATE INDEX IF NOT EXISTS idx_issued_certs_email_opened
  ON issued_certificates (email_opened_at)
  WHERE email_opened_at IS NULL;

COMMENT ON COLUMN issued_certificates.email_opened_at IS 'Set by Resend webhook on first email.opened event. Confirms patient received certificate.';
COMMENT ON COLUMN issued_certificates.resend_count IS 'Number of times doctor has manually resent the certificate email.';
