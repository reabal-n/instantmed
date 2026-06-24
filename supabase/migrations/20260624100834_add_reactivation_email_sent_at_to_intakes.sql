-- Med-cert reactivation email dedup (one "need another certificate?" nudge per
-- patient). Additive + safe: nullable column, write-once by the reactivation cron.
-- NOT a subscription; the cron is gated OFF by CERT_REACTIVATION_EMAILS_ENABLED
-- and marketing-consent gated per patient.
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS reactivation_email_sent_at timestamptz;

-- Partial index serving the cron finder (un-nudged med-cert intakes in a window).
CREATE INDEX IF NOT EXISTS idx_intakes_reactivation_pending
  ON intakes (category, status, created_at)
  WHERE reactivation_email_sent_at IS NULL;
