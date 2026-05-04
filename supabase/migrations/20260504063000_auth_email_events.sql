-- Persist Supabase Auth email send outcomes for operational visibility.
-- Stores recipient hash/domain only, so support can see delivery health without adding a raw email store.

CREATE TABLE IF NOT EXISTS public.auth_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  action_type text NOT NULL,
  status text NOT NULL,
  recipient_hash text NOT NULL,
  recipient_domain text,
  provider text NOT NULL DEFAULT 'resend',
  provider_message_id text,
  http_status integer,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT auth_email_events_status_check CHECK (status IN ('sent', 'failed')),
  CONSTRAINT auth_email_events_action_type_check CHECK (
    action_type IN ('magiclink', 'signup', 'recovery', 'invite', 'email_change', 'reauthentication')
  )
);
CREATE INDEX IF NOT EXISTS idx_auth_email_events_created_at
  ON public.auth_email_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_email_events_status_created_at
  ON public.auth_email_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_email_events_action_created_at
  ON public.auth_email_events(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_email_events_recipient_hash
  ON public.auth_email_events(recipient_hash);
ALTER TABLE public.auth_email_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on auth_email_events" ON public.auth_email_events;
CREATE POLICY "Service role full access on auth_email_events"
  ON public.auth_email_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
COMMENT ON TABLE public.auth_email_events IS 'Operational send outcomes for Supabase Auth emails without storing raw recipient addresses.';
COMMENT ON COLUMN public.auth_email_events.recipient_hash IS 'SHA-256 hash of normalized recipient address for correlation without raw address storage.';
COMMENT ON COLUMN public.auth_email_events.recipient_domain IS 'Lowercase recipient domain for provider/domain-level delivery troubleshooting.';
