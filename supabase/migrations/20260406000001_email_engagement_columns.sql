-- Email engagement tracking columns for abandoned checkout followup,
-- review request system, and subscription nudge emails
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS abandoned_followup_sent_at timestamptz;
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS review_email_sent_at timestamptz;
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS review_followup_sent_at timestamptz;
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS subscription_nudge_sent_at timestamptz;
