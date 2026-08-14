-- Stripe dispute creation/closure describes a case lifecycle; it does not by
-- itself prove that cash left or returned to the Stripe balance. Persist the
-- two balance movements independently so revenue windows and intake payment
-- state follow Stripe's durable cash-event timestamps.

ALTER TABLE public.stripe_disputes
  ADD COLUMN IF NOT EXISTS funds_withdrawn_at timestamptz,
  ADD COLUMN IF NOT EXISTS funds_withdrawn_cents integer,
  ADD COLUMN IF NOT EXISTS funds_withdrawn_event_id text,
  ADD COLUMN IF NOT EXISTS funds_reinstated_at timestamptz,
  ADD COLUMN IF NOT EXISTS funds_reinstated_cents integer,
  ADD COLUMN IF NOT EXISTS funds_reinstated_event_id text,
  ADD COLUMN IF NOT EXISTS dispute_status_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_status_event_id text;

ALTER TABLE public.stripe_disputes
  DROP CONSTRAINT IF EXISTS stripe_disputes_funds_withdrawn_evidence_check,
  ADD CONSTRAINT stripe_disputes_funds_withdrawn_evidence_check CHECK (
    (
      funds_withdrawn_at IS NULL
      AND funds_withdrawn_cents IS NULL
      AND funds_withdrawn_event_id IS NULL
    )
    OR
    (
      funds_withdrawn_at IS NOT NULL
      AND funds_withdrawn_cents > 0
      AND funds_withdrawn_event_id IS NOT NULL
    )
  ),
  DROP CONSTRAINT IF EXISTS stripe_disputes_funds_reinstated_evidence_check,
  ADD CONSTRAINT stripe_disputes_funds_reinstated_evidence_check CHECK (
    (
      funds_reinstated_at IS NULL
      AND funds_reinstated_cents IS NULL
      AND funds_reinstated_event_id IS NULL
    )
    OR
    (
      funds_reinstated_at IS NOT NULL
      AND funds_reinstated_cents > 0
      AND funds_reinstated_event_id IS NOT NULL
    )
  ),
  DROP CONSTRAINT IF EXISTS stripe_disputes_status_event_evidence_check,
  ADD CONSTRAINT stripe_disputes_status_event_evidence_check CHECK (
    (dispute_status_event_at IS NULL AND dispute_status_event_id IS NULL)
    OR
    (dispute_status_event_at IS NOT NULL AND dispute_status_event_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_stripe_disputes_funds_withdrawn_at
  ON public.stripe_disputes (funds_withdrawn_at DESC)
  WHERE funds_withdrawn_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stripe_disputes_funds_reinstated_at
  ON public.stripe_disputes (funds_reinstated_at DESC)
  WHERE funds_reinstated_at IS NOT NULL;

COMMENT ON COLUMN public.stripe_disputes.funds_withdrawn_at IS
  'Canonical Stripe charge.dispute.funds_withdrawn event time; not dispute creation time';
COMMENT ON COLUMN public.stripe_disputes.funds_withdrawn_cents IS
  'AUD cents actually withdrawn, derived from negative dispute balance transactions';
COMMENT ON COLUMN public.stripe_disputes.funds_withdrawn_event_id IS
  'Stripe event that durably proved the dispute withdrawal';
COMMENT ON COLUMN public.stripe_disputes.funds_reinstated_at IS
  'Canonical Stripe charge.dispute.funds_reinstated event time';
COMMENT ON COLUMN public.stripe_disputes.funds_reinstated_cents IS
  'AUD cents actually reinstated, derived from positive dispute balance transactions';
COMMENT ON COLUMN public.stripe_disputes.funds_reinstated_event_id IS
  'Stripe event that durably proved the dispute reinstatement';

CREATE OR REPLACE FUNCTION public.record_stripe_dispute_cash_event(
  p_dispute_id text,
  p_event_id text,
  p_event_type text,
  p_event_at timestamptz,
  p_amount_cents integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_dispute public.stripe_disputes%ROWTYPE;
  v_intake public.intakes%ROWTYPE;
  v_intake_updated boolean := false;
  v_restore_status text;
BEGIN
  IF p_event_type NOT IN (
    'charge.dispute.funds_withdrawn',
    'charge.dispute.funds_reinstated'
  ) THEN
    RAISE EXCEPTION 'unsupported Stripe dispute cash event type: %', p_event_type
      USING ERRCODE = '22023';
  END IF;

  IF p_event_id IS NULL OR pg_catalog.btrim(p_event_id) = '' THEN
    RAISE EXCEPTION 'Stripe dispute cash event id is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_event_at IS NULL THEN
    RAISE EXCEPTION 'Stripe dispute cash event time is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Stripe dispute cash amount must be positive cents'
      USING ERRCODE = '22023';
  END IF;

  SELECT dispute.*
    INTO v_dispute
    FROM public.stripe_disputes AS dispute
   WHERE dispute.dispute_id = p_dispute_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stripe dispute ledger row not found: %', p_dispute_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_dispute.intake_id IS NOT NULL THEN
    SELECT intake.*
      INTO v_intake
      FROM public.intakes AS intake
     WHERE intake.id = v_dispute.intake_id
     FOR UPDATE;
  END IF;

  IF p_event_type = 'charge.dispute.funds_withdrawn' THEN
    IF v_dispute.funds_withdrawn_event_id IS NOT NULL THEN
      RETURN pg_catalog.jsonb_build_object(
        'applied', false,
        'intake_id', v_dispute.intake_id,
        'intake_updated', false,
        'amount_cents', v_intake.amount_cents,
        'refund_amount_cents', v_intake.refund_amount_cents,
        'restored_payment_status', NULL
      );
    END IF;

    UPDATE public.stripe_disputes AS dispute
       SET funds_withdrawn_at = p_event_at,
           funds_withdrawn_cents = p_amount_cents,
           funds_withdrawn_event_id = p_event_id,
           updated_at = pg_catalog.clock_timestamp()
     WHERE dispute.dispute_id = p_dispute_id;

    IF v_dispute.intake_id IS NOT NULL THEN
      UPDATE public.intakes AS intake
         SET payment_status = 'disputed',
             dispute_id = p_dispute_id,
             updated_at = pg_catalog.clock_timestamp()
       WHERE intake.id = v_dispute.intake_id
         AND intake.payment_status IN (
           'paid',
           'partially_refunded',
           'refunded',
           'refund_processing',
           'refund_failed',
           'disputed'
         )
       RETURNING intake.* INTO v_intake;
      v_intake_updated := FOUND;
    END IF;

    RETURN pg_catalog.jsonb_build_object(
      'applied', true,
      'intake_id', v_dispute.intake_id,
      'intake_updated', v_intake_updated,
      'amount_cents', v_intake.amount_cents,
      'refund_amount_cents', v_intake.refund_amount_cents,
      'restored_payment_status', NULL
    );
  END IF;

  IF v_dispute.funds_withdrawn_event_id IS NULL THEN
    RAISE EXCEPTION 'Stripe dispute cash reinstatement requires a prior withdrawal'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_dispute.funds_reinstated_event_id IS NOT NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'applied', false,
      'intake_id', v_dispute.intake_id,
      'intake_updated', false,
      'amount_cents', v_intake.amount_cents,
      'refund_amount_cents', v_intake.refund_amount_cents,
      'restored_payment_status', v_intake.payment_status
    );
  END IF;

  IF v_dispute.intake_id IS NOT NULL THEN
    IF p_amount_cents < v_dispute.funds_withdrawn_cents THEN
      v_restore_status := 'disputed';
    ELSE
      v_restore_status := CASE
        WHEN v_intake.refunded_at IS NOT NULL
          AND COALESCE(v_intake.amount_cents, 0) > 0
          AND COALESCE(v_intake.refund_amount_cents, 0) >= v_intake.amount_cents
          THEN 'refunded'
        WHEN v_intake.refunded_at IS NOT NULL
          AND COALESCE(v_intake.refund_amount_cents, 0) > 0
          THEN 'partially_refunded'
        ELSE 'paid'
      END;
    END IF;
  END IF;

  UPDATE public.stripe_disputes AS dispute
     SET funds_reinstated_at = p_event_at,
         funds_reinstated_cents = p_amount_cents,
         funds_reinstated_event_id = p_event_id,
         updated_at = pg_catalog.clock_timestamp()
   WHERE dispute.dispute_id = p_dispute_id;

  IF v_dispute.intake_id IS NOT NULL THEN
    UPDATE public.intakes AS intake
       SET payment_status = v_restore_status,
           updated_at = pg_catalog.clock_timestamp()
     WHERE intake.id = v_dispute.intake_id
       AND intake.payment_status = 'disputed'
       AND intake.dispute_id = p_dispute_id
       AND v_restore_status <> 'disputed';
    v_intake_updated := FOUND;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'applied', true,
    'intake_id', v_dispute.intake_id,
    'intake_updated', v_intake_updated,
    'amount_cents', v_intake.amount_cents,
    'refund_amount_cents', v_intake.refund_amount_cents,
    'restored_payment_status', v_restore_status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_stripe_dispute_cash_event(
  text,
  text,
  text,
  timestamptz,
  integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_stripe_dispute_cash_event(
  text,
  text,
  text,
  timestamptz,
  integer
) TO service_role;

COMMENT ON FUNCTION public.record_stripe_dispute_cash_event(
  text,
  text,
  text,
  timestamptz,
  integer
) IS
  'Atomically records one Stripe dispute balance withdrawal/reinstatement and reconciles linked intake payment state; service role only';
