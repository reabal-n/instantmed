-- Restore enhanced intake abandonment analytics.
--
-- The table exists in the historical baseline, but the production schema cache
-- reported it missing during the 2026-06-02 conversion funnel audit. Keeping
-- this as an explicit incremental migration makes the recovery pipeline and
-- audit queries depend on the active migration stream, not only on the squashed
-- baseline.

CREATE TABLE IF NOT EXISTS public.intake_abandonment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  service_type text NOT NULL,
  last_step text NOT NULL,
  step_number integer NOT NULL,
  time_spent_ms integer,
  message_count integer DEFAULT 0,
  abandon_reason text NOT NULL,

  reached_payment boolean DEFAULT false,
  stripe_checkout_started boolean DEFAULT false,
  payment_error text,

  was_blocked_by_safety boolean DEFAULT false,
  safety_block_reason text,
  safety_block_code text,

  fields_completed text[] DEFAULT '{}',
  last_field_edited text,
  form_progress integer DEFAULT 0,

  device_type text,
  browser text,
  browser_version text,
  os_name text,
  has_network_error boolean DEFAULT false,
  last_network_error text,

  page_view_count integer DEFAULT 0,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_abandonment_time
  ON public.intake_abandonment(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intake_abandonment_reason
  ON public.intake_abandonment(abandon_reason, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intake_abandonment_step
  ON public.intake_abandonment(last_step, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intake_abandonment_service_step
  ON public.intake_abandonment(service_type, last_step, created_at DESC);

ALTER TABLE public.intake_abandonment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intake_abandonment_admin" ON public.intake_abandonment;
CREATE POLICY "intake_abandonment_admin"
  ON public.intake_abandonment
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.intake_abandonment IS
  'PHI-light analytics for intake abandonment, payment reach, safety blocks, and device context.';

NOTIFY pgrst, 'reload schema';
