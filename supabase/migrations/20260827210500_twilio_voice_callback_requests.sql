-- Durable, PHI-encrypted handoff from the consented AI voice receptionist.
-- The call transcript is never stored. Only a caller-confirmed callback
-- summary and callback details are placed inside payload_enc.

CREATE TABLE public.voice_callback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid_hash text NOT NULL UNIQUE,
  payload_enc jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'contacted', 'resolved')),
  consented_at timestamptz NOT NULL,
  telegram_notification_attempts integer NOT NULL DEFAULT 0
    CHECK (telegram_notification_attempts >= 0),
  telegram_notification_sent_at timestamptz,
  telegram_message_id bigint,
  contacted_at timestamptz,
  contacted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT voice_callback_request_resolution_consistent CHECK (
    (status = 'resolved' AND resolved_at IS NOT NULL)
    OR (status <> 'resolved' AND resolved_at IS NULL)
  )
);

CREATE INDEX voice_callback_requests_pending_created_idx
  ON public.voice_callback_requests (created_at ASC)
  WHERE status = 'pending';

ALTER TABLE public.voice_callback_requests ENABLE ROW LEVEL SECURITY;

-- There are deliberately no anon/authenticated policies. All reads and writes
-- go through role-checked server code using the service-role client.
REVOKE ALL ON TABLE public.voice_callback_requests FROM anon, authenticated;
GRANT ALL ON TABLE public.voice_callback_requests TO service_role;

CREATE OR REPLACE FUNCTION public.claim_voice_callback_notification_attempt(
  p_request_id uuid,
  p_max_attempts integer DEFAULT 6
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_max_attempts < 1 OR p_max_attempts > 20 THEN
    RAISE EXCEPTION 'p_max_attempts must be between 1 and 20';
  END IF;

  UPDATE public.voice_callback_requests
  SET telegram_notification_attempts = telegram_notification_attempts + 1
  WHERE id = p_request_id
    AND telegram_notification_sent_at IS NULL
    AND telegram_notification_attempts < p_max_attempts;

  RETURN found;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_voice_callback_notification_attempt(uuid, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_voice_callback_notification_attempt(uuid, integer) TO service_role;

CREATE TRIGGER voice_callback_requests_updated_at
  BEFORE UPDATE ON public.voice_callback_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.voice_callback_requests IS
  'Encrypted callback summaries from the consented Twilio AI voice receptionist; never stores raw audio or full transcripts.';
