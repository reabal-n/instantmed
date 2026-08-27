-- Transient, PHI-encrypted messages taken by Lena for the Medical Director.
-- Raw audio, full transcripts, and raw Twilio Call SIDs are never stored.

CREATE TABLE public.medical_director_voice_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid_fingerprint text NOT NULL UNIQUE,
  payload_enc jsonb NOT NULL,
  category text NOT NULL
    CHECK (category IN (
      'medical_certificate',
      'prescription',
      'payment_refund',
      'account_technical',
      'complaint',
      'other'
    )),
  callback_requested boolean NOT NULL DEFAULT false,
  patient_details_complete boolean NOT NULL DEFAULT false,
  patient_match_state text NOT NULL DEFAULT 'incomplete'
    CHECK (patient_match_state IN ('suggested', 'unmatched', 'ambiguous', 'incomplete')),
  suggested_patient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_review', 'resolved')),
  claimed_at timestamptz,
  claimed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_reason text
    CHECK (resolution_reason IS NULL OR resolution_reason IN (
      'actioned',
      'callback_completed',
      'unable_to_match',
      'duplicate',
      'no_action_required',
      'spam_test'
    )),
  reopened_at timestamptz,
  reopened_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  telegram_notification_attempts integer NOT NULL DEFAULT 0
    CHECK (telegram_notification_attempts >= 0),
  telegram_notification_sent_at timestamptz,
  telegram_message_id bigint,
  unresolved_reminder_claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medical_director_voice_message_workflow_consistent CHECK (
    (status = 'new' AND claimed_at IS NULL AND claimed_by IS NULL
      AND resolved_at IS NULL AND resolved_by IS NULL AND resolution_reason IS NULL)
    OR (status = 'in_review' AND claimed_at IS NOT NULL AND claimed_by IS NOT NULL
      AND resolved_at IS NULL AND resolved_by IS NULL AND resolution_reason IS NULL)
    OR (status = 'resolved' AND claimed_at IS NOT NULL AND claimed_by IS NOT NULL
      AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL AND resolution_reason IS NOT NULL)
  )
);

CREATE INDEX medical_director_voice_messages_status_created_idx
  ON public.medical_director_voice_messages (status, created_at DESC);

CREATE INDEX medical_director_voice_messages_unresolved_age_idx
  ON public.medical_director_voice_messages (created_at ASC)
  WHERE status <> 'resolved';

ALTER TABLE public.medical_director_voice_messages ENABLE ROW LEVEL SECURITY;

-- Deliberately no anon/authenticated policies. Role-checked server code is the
-- only read/write path, and it uses the service role after admin authorization.
REVOKE ALL ON TABLE public.medical_director_voice_messages FROM anon, authenticated;
GRANT ALL ON TABLE public.medical_director_voice_messages TO service_role;

CREATE OR REPLACE FUNCTION public.claim_medical_director_voice_notification_attempt(
  p_message_id uuid,
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

  UPDATE public.medical_director_voice_messages
  SET telegram_notification_attempts = telegram_notification_attempts + 1
  WHERE id = p_message_id
    AND telegram_notification_sent_at IS NULL
    AND telegram_notification_attempts < p_max_attempts;

  RETURN found;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_medical_director_voice_notification_attempt(uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_medical_director_voice_notification_attempt(uuid, integer)
  TO service_role;

-- Atomically claim at most one aggregate unresolved reminder per hour. The
-- caller receives only PHI-free queue metadata.
CREATE OR REPLACE FUNCTION public.claim_medical_director_voice_unresolved_reminder()
RETURNS TABLE(waiting_count bigint, oldest_created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_oldest_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('medical-director-voice-reminder'));

  IF EXISTS (
    SELECT 1
    FROM public.medical_director_voice_messages
    WHERE unresolved_reminder_claimed_at > now() - interval '1 hour'
  ) THEN
    RETURN;
  END IF;

  SELECT id INTO v_oldest_id
  FROM public.medical_director_voice_messages
  WHERE status <> 'resolved'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_oldest_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.medical_director_voice_messages
  SET unresolved_reminder_claimed_at = now()
  WHERE id = v_oldest_id;

  RETURN QUERY
  SELECT count(*), min(created_at)
  FROM public.medical_director_voice_messages
  WHERE status <> 'resolved';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_medical_director_voice_unresolved_reminder()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_medical_director_voice_unresolved_reminder()
  TO service_role;

-- The inbox is transient. Only already-resolved payloads are removed; open
-- messages remain visible and are surfaced by the age reminder.
CREATE OR REPLACE FUNCTION public.cleanup_resolved_medical_director_voice_messages(
  p_retention_days integer DEFAULT 30,
  p_limit integer DEFAULT 100
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF p_retention_days < 7 OR p_retention_days > 365 OR p_limit < 1 OR p_limit > 1000 THEN
    RAISE EXCEPTION 'invalid voice-message cleanup bounds';
  END IF;

  WITH doomed AS (
    SELECT id
    FROM public.medical_director_voice_messages
    WHERE status = 'resolved'
      AND resolved_at < now() - make_interval(days => p_retention_days)
    ORDER BY resolved_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM public.medical_director_voice_messages m
  USING doomed
  WHERE m.id = doomed.id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_resolved_medical_director_voice_messages(integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_resolved_medical_director_voice_messages(integer, integer)
  TO service_role;

CREATE TRIGGER medical_director_voice_messages_updated_at
  BEFORE UPDATE ON public.medical_director_voice_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.medical_director_voice_messages IS
  'Encrypted, caller-confirmed messages for the Medical Director; no raw audio, full transcripts, or raw Twilio Call SIDs.';
