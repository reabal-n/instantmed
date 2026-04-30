-- Tighten paid-request Telegram retry eligibility.
-- The rollout introduced a retry ledger; legacy paid rows without a real paid_at
-- timestamp or amount must not be replayed as new Telegram requests.

UPDATE public.intakes
SET
  paid_request_telegram_attempts = 6,
  paid_request_telegram_last_attempt_at = now(),
  paid_request_telegram_failed_at = now(),
  paid_request_telegram_claimed_at = NULL,
  paid_request_telegram_error = 'Suppressed from Telegram retry because paid_at or amount_cents was missing; requires payment integrity review.',
  updated_at = now()
WHERE payment_status = 'paid'
  AND paid_request_telegram_sent_at IS NULL
  AND COALESCE(paid_request_telegram_attempts, 0) < 6
  AND (
    paid_at IS NULL
    OR COALESCE(amount_cents, 0) <= 0
  );

UPDATE public.intakes
SET
  paid_request_telegram_attempts = 6,
  paid_request_telegram_last_attempt_at = now(),
  paid_request_telegram_failed_at = now(),
  paid_request_telegram_claimed_at = NULL,
  paid_request_telegram_error = 'Legacy paid request suppressed after Telegram ledger rollout; not a failed live send.',
  updated_at = now()
WHERE payment_status = 'paid'
  AND paid_request_telegram_sent_at IS NULL
  AND COALESCE(paid_request_telegram_attempts, 0) < 6
  AND paid_at < timestamptz '2026-04-30 14:07:00+00';

DROP INDEX IF EXISTS public.idx_intakes_paid_request_telegram_pending;

CREATE INDEX idx_intakes_paid_request_telegram_pending
  ON public.intakes(paid_at, paid_request_telegram_attempts)
  WHERE payment_status = 'paid'
    AND paid_at IS NOT NULL
    AND COALESCE(amount_cents, 0) > 0
    AND paid_request_telegram_sent_at IS NULL;

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
    AND i.paid_at IS NOT NULL
    AND COALESCE(i.amount_cents, 0) > 0
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

COMMENT ON FUNCTION public.claim_paid_request_telegram_notification(uuid, timestamptz, timestamptz) IS
  'Atomically claims a credible paid-request Telegram notification before the external Telegram API call.';
