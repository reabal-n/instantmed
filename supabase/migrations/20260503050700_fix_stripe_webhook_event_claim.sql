-- Fix Stripe webhook idempotency claim semantics.
--
-- The previous function inferred "inserted" by checking processed_at within a
-- one-second window. Fast duplicate deliveries inside that window were falsely
-- treated as newly claimed. ROW_COUNT is the actual atomic insert result.

CREATE OR REPLACE FUNCTION public.try_process_stripe_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_request_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  INSERT INTO public.stripe_webhook_events (
    event_id,
    event_type,
    intake_id,
    session_id,
    metadata,
    processed_at,
    created_at
  )
  VALUES (
    p_event_id,
    p_event_type,
    p_request_id,
    p_session_id,
    COALESCE(p_metadata, '{}'::jsonb),
    NOW(),
    NOW()
  )
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_process_stripe_event(TEXT, TEXT, UUID, TEXT, JSONB)
  TO authenticated, service_role;
