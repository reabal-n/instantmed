-- Exit intent nurture sequence tracking
-- Stores email captures from exit-intent overlays and tracks 3-email sequence progress

CREATE TABLE IF NOT EXISTS exit_intent_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  service TEXT NOT NULL DEFAULT 'medical-certificate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reminder_1_sent_at TIMESTAMPTZ,      -- immediate (sent by capture action)
  reminder_2_sent_at TIMESTAMPTZ,      -- ~24h social proof email
  reminder_3_sent_at TIMESTAMPTZ,      -- ~72h last-chance email
  reminder_2_opened_at TIMESTAMPTZ,    -- open tracking for email 2
  reminder_3_opened_at TIMESTAMPTZ,    -- open tracking for email 3
  converted BOOLEAN NOT NULL DEFAULT false,
  converted_at TIMESTAMPTZ,            -- when checkout completed
  unsubscribed BOOLEAN NOT NULL DEFAULT false,
  unsubscribed_at TIMESTAMPTZ,         -- when unsubscribe clicked
  processing_lock_until TIMESTAMPTZ    -- idempotency: lock row during cron processing
);

-- RLS: service role only (no patient access needed)
ALTER TABLE exit_intent_captures ENABLE ROW LEVEL SECURITY;

-- No public policies — only service_role can access

-- Unique constraint for dedup: one active nurture per email+service
CREATE UNIQUE INDEX idx_exit_intent_email_service_unique
  ON exit_intent_captures (email, service)
  WHERE NOT converted AND NOT unsubscribed;

-- Index for cron queries finding candidates for email 2 and 3
CREATE INDEX idx_exit_intent_nurture_candidates
  ON exit_intent_captures (created_at)
  WHERE NOT converted AND NOT unsubscribed;

-- Upsert function: insert or reset nurture if same email+service exists
CREATE OR REPLACE FUNCTION upsert_exit_intent_capture(
  p_email TEXT,
  p_service TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO exit_intent_captures (email, service, reminder_1_sent_at)
  VALUES (p_email, p_service, now())
  ON CONFLICT (email, service) WHERE NOT converted AND NOT unsubscribed
  DO UPDATE SET
    reminder_1_sent_at = now(),
    -- Reset sequence so they get emails 2 & 3 again from this new capture
    reminder_2_sent_at = NULL,
    reminder_3_sent_at = NULL,
    reminder_2_opened_at = NULL,
    reminder_3_opened_at = NULL,
    created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
