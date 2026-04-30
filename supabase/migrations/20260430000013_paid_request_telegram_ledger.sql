-- Durable paid-request Telegram notification ledger.
-- Prevents a webhook retry from losing the doctor notification after the
-- intake has already been marked paid.

ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS paid_request_telegram_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_request_telegram_failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_request_telegram_error text,
  ADD COLUMN IF NOT EXISTS paid_request_telegram_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_request_telegram_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_request_telegram_claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_intakes_paid_request_telegram_pending
  ON public.intakes(paid_at, paid_request_telegram_attempts)
  WHERE payment_status = 'paid'
    AND paid_request_telegram_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_intakes_paid_request_telegram_claim
  ON public.intakes(paid_request_telegram_claimed_at)
  WHERE payment_status = 'paid'
    AND paid_request_telegram_sent_at IS NULL
    AND paid_request_telegram_claimed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_paid_request_telegram_notification(
  p_intake_id uuid,
  p_claimed_at timestamptz DEFAULT now(),
  p_stale_claim_before timestamptz DEFAULT now() - interval '5 minutes'
)
RETURNS TABLE (
  id uuid,
  patient_id uuid,
  amount_cents integer,
  category text,
  subtype text,
  paid_request_telegram_attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.intakes AS i
  SET
    paid_request_telegram_claimed_at = p_claimed_at,
    paid_request_telegram_last_attempt_at = p_claimed_at,
    paid_request_telegram_attempts = COALESCE(i.paid_request_telegram_attempts, 0) + 1,
    updated_at = p_claimed_at
  WHERE i.id = p_intake_id
    AND i.payment_status = 'paid'
    AND i.paid_request_telegram_sent_at IS NULL
    AND (
      i.paid_request_telegram_claimed_at IS NULL
      OR i.paid_request_telegram_claimed_at < p_stale_claim_before
    )
  RETURNING
    i.id,
    i.patient_id,
    i.amount_cents,
    i.category,
    i.subtype,
    i.paid_request_telegram_attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_paid_request_telegram_notification(uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_paid_request_telegram_notification(uuid, timestamptz, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.claim_paid_request_telegram_notification(uuid, timestamptz, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_paid_request_telegram_notification(uuid, timestamptz, timestamptz) TO service_role;

COMMENT ON COLUMN public.intakes.paid_request_telegram_sent_at IS
  'When the doctor Telegram notification for a paid request was successfully sent.';
COMMENT ON COLUMN public.intakes.paid_request_telegram_failed_at IS
  'Last failed paid-request Telegram notification attempt.';
COMMENT ON COLUMN public.intakes.paid_request_telegram_error IS
  'Last paid-request Telegram notification error for ops retry visibility.';
COMMENT ON COLUMN public.intakes.paid_request_telegram_claimed_at IS
  'Short-lived claim timestamp used to prevent concurrent duplicate Telegram sends.';
COMMENT ON FUNCTION public.claim_paid_request_telegram_notification(uuid, timestamptz, timestamptz) IS
  'Atomically claims an unsent paid-request Telegram notification before the external Telegram API call.';
