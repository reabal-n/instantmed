-- A payment can have multiple Stripe disputes. Preserve each dispute's exact
-- cash evidence, then derive intake and Google Ads truth from every row linked
-- to the intake. intakes.dispute_id remains compatibility metadata only.

ALTER TABLE public.stripe_disputes
  ADD COLUMN IF NOT EXISTS livemode boolean,
  ADD COLUMN IF NOT EXISTS terminal_lost_at timestamptz,
  ADD COLUMN IF NOT EXISTS terminal_lost_event_id text;

ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS priority_fee_refund_retry_attempted_at timestamptz;

ALTER TABLE public.stripe_refund_events
  ADD COLUMN IF NOT EXISTS is_priority_fee_refund boolean;

-- The production webhook rejects test-mode events before persistence. Rows
-- carrying exact event ids therefore have durable production-mode provenance;
-- created-only legacy snapshots stay NULL until a verified lifecycle event
-- links their mode. Never guess mode for a snapshot with no event evidence.
UPDATE public.stripe_disputes AS dispute
   SET livemode = true
 WHERE dispute.livemode IS NULL
   AND (
     dispute.dispute_status_event_id IS NOT NULL
     OR dispute.funds_withdrawn_event_id IS NOT NULL
     OR dispute.funds_reinstated_event_id IS NOT NULL
   );

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.stripe_disputes AS dispute
     WHERE dispute.funds_reinstated_at IS NOT NULL
       AND (
         dispute.funds_withdrawn_at IS NULL
         OR dispute.funds_reinstated_at < dispute.funds_withdrawn_at
         OR dispute.funds_reinstated_cents > dispute.funds_withdrawn_cents
       )
  ) THEN
    RAISE EXCEPTION
      'Stripe dispute reinstatement evidence is internally inconsistent; reconcile exact Stripe cash events before this migration';
  END IF;
END
$block$;

ALTER TABLE public.stripe_disputes
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
      AND funds_withdrawn_at IS NOT NULL
      AND funds_reinstated_at >= funds_withdrawn_at
      AND funds_reinstated_cents <= funds_withdrawn_cents
    )
  ),
  DROP CONSTRAINT IF EXISTS stripe_disputes_terminal_lost_evidence_check,
  ADD CONSTRAINT stripe_disputes_terminal_lost_evidence_check CHECK (
    (terminal_lost_at IS NULL AND terminal_lost_event_id IS NULL)
    OR
    (terminal_lost_at IS NOT NULL AND terminal_lost_event_id IS NOT NULL)
  ),
  DROP CONSTRAINT IF EXISTS stripe_disputes_exact_event_mode_check,
  ADD CONSTRAINT stripe_disputes_exact_event_mode_check CHECK (
    (
      dispute_status_event_id IS NULL
      AND funds_withdrawn_event_id IS NULL
      AND funds_reinstated_event_id IS NULL
    )
    OR livemode IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_stripe_disputes_terminal_lost_intake
  ON public.stripe_disputes (intake_id, terminal_lost_at DESC)
  WHERE terminal_lost_at IS NOT NULL AND intake_id IS NOT NULL;

COMMENT ON COLUMN public.stripe_disputes.terminal_lost_at IS
  'First durable non-stale Stripe lifecycle event proving this dispute terminally lost';
COMMENT ON COLUMN public.stripe_disputes.terminal_lost_event_id IS
  'Stripe event id paired with terminal_lost_at; never cleared by a later status snapshot';

-- Only exact status-event evidence introduced by the preceding migration is
-- eligible for this additive backfill. Historical status text alone is not
-- treated as proof of event timing.
UPDATE public.stripe_disputes AS dispute
   SET terminal_lost_at = dispute.dispute_status_event_at,
       terminal_lost_event_id = dispute.dispute_status_event_id
 WHERE dispute.status = 'lost'
   AND dispute.dispute_status_event_at IS NOT NULL
   AND dispute.dispute_status_event_id IS NOT NULL
   AND dispute.terminal_lost_at IS NULL;

-- PostgreSQL overloads functions by signature. Remove the four-argument v1
-- so PostgREST can never route a lifecycle call around livemode validation.
DROP FUNCTION IF EXISTS public.record_stripe_dispute_status_event(
  text, text, timestamptz, text
);

CREATE FUNCTION public.record_stripe_dispute_status_event(
  p_dispute_id text,
  p_event_id text,
  p_event_at timestamptz,
  p_status text,
  p_livemode boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_applied boolean := false;
  v_dispute public.stripe_disputes%ROWTYPE;
  v_existing_rank integer;
  v_existing_terminal boolean;
  v_incoming_rank integer;
  v_terminal boolean;
BEGIN
  IF p_dispute_id IS NULL OR pg_catalog.btrim(p_dispute_id) = ''
    OR p_event_id IS NULL OR pg_catalog.btrim(p_event_id) = ''
    OR p_event_at IS NULL OR p_livemode IS NULL
    OR p_status IS NULL OR pg_catalog.btrim(p_status) = '' THEN
    RAISE EXCEPTION 'Complete Stripe dispute status evidence is required'
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

  IF v_dispute.livemode IS NOT NULL AND v_dispute.livemode <> p_livemode THEN
    RAISE EXCEPTION 'Conflicting Stripe dispute mode evidence'
      USING ERRCODE = 'P0001';
  END IF;

  v_terminal := p_status IN ('lost', 'prevented', 'warning_closed', 'won');
  v_existing_terminal := v_dispute.status IN ('lost', 'prevented', 'warning_closed', 'won');
  v_incoming_rank := CASE p_status
    WHEN 'warning_needs_response' THEN 10
    WHEN 'needs_response' THEN 10
    WHEN 'warning_under_review' THEN 20
    WHEN 'under_review' THEN 20
    WHEN 'prevented' THEN 30
    WHEN 'warning_closed' THEN 30
    WHEN 'won' THEN 30
    WHEN 'lost' THEN 30
    ELSE 0
  END;
  v_existing_rank := CASE v_dispute.status
    WHEN 'warning_needs_response' THEN 10
    WHEN 'needs_response' THEN 10
    WHEN 'warning_under_review' THEN 20
    WHEN 'under_review' THEN 20
    WHEN 'prevented' THEN 30
    WHEN 'warning_closed' THEN 30
    WHEN 'won' THEN 30
    WHEN 'lost' THEN 30
    ELSE 0
  END;

  -- A non-terminal update can never reopen a terminal decision. Stripe event
  -- ids are identities, not clocks: at equal-second precision terminal evidence
  -- outranks non-terminal evidence, while incompatible terminal snapshots fail
  -- closed for operator reconciliation.
  IF v_dispute.dispute_status_event_id = p_event_id THEN
    IF v_dispute.dispute_status_event_at <> p_event_at OR v_dispute.status <> p_status THEN
      RAISE EXCEPTION 'Conflicting replay of Stripe dispute status event'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_dispute.livemode IS NULL THEN
      UPDATE public.stripe_disputes AS dispute
         SET livemode = p_livemode,
             updated_at = pg_catalog.clock_timestamp()
       WHERE dispute.dispute_id = p_dispute_id
       RETURNING dispute.* INTO v_dispute;
    END IF;
    RETURN pg_catalog.jsonb_build_object(
      'applied', false,
      'intake_id', v_dispute.intake_id,
      'status', v_dispute.status,
      'terminal_lost_at', v_dispute.terminal_lost_at
    );
  END IF;

  IF v_dispute.dispute_status_event_at = p_event_at THEN
    IF v_existing_terminal AND v_terminal AND v_dispute.status <> p_status THEN
      RAISE EXCEPTION 'Conflicting same-second terminal Stripe dispute evidence'
        USING ERRCODE = 'P0001';
    END IF;
    IF NOT v_existing_terminal AND NOT v_terminal
      AND v_existing_rank = v_incoming_rank
      AND v_dispute.status <> p_status THEN
      RAISE EXCEPTION 'Conflicting same-second Stripe dispute status evidence'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF (v_dispute.resolved_at IS NOT NULL AND NOT v_terminal)
    OR v_dispute.dispute_status_event_at > p_event_at
    OR (
      v_dispute.dispute_status_event_at = p_event_at
      AND (
        (v_existing_terminal AND NOT v_terminal)
        OR (v_existing_terminal = v_terminal AND v_existing_rank >= v_incoming_rank)
      )
    ) THEN
    RETURN pg_catalog.jsonb_build_object(
      'applied', false,
      'intake_id', v_dispute.intake_id,
      'status', v_dispute.status,
      'terminal_lost_at', v_dispute.terminal_lost_at
    );
  END IF;

  UPDATE public.stripe_disputes AS dispute
     SET dispute_status_event_at = p_event_at,
         dispute_status_event_id = p_event_id,
         livemode = COALESCE(dispute.livemode, p_livemode),
         outcome = CASE WHEN v_terminal THEN p_status ELSE dispute.outcome END,
         resolved_at = CASE WHEN v_terminal THEN p_event_at ELSE dispute.resolved_at END,
         status = p_status,
         terminal_lost_at = CASE
           WHEN p_status = 'lost' AND dispute.terminal_lost_at IS NULL THEN p_event_at
           ELSE dispute.terminal_lost_at
         END,
         terminal_lost_event_id = CASE
           WHEN p_status = 'lost' AND dispute.terminal_lost_at IS NULL THEN p_event_id
           ELSE dispute.terminal_lost_event_id
         END,
         updated_at = pg_catalog.clock_timestamp()
   WHERE dispute.dispute_id = p_dispute_id
   RETURNING dispute.* INTO v_dispute;
  v_applied := FOUND;

  RETURN pg_catalog.jsonb_build_object(
    'applied', v_applied,
    'intake_id', v_dispute.intake_id,
    'status', v_dispute.status,
    'terminal_lost_at', v_dispute.terminal_lost_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_stripe_dispute_status_event(
  text, text, timestamptz, text, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_stripe_dispute_status_event(
  text, text, timestamptz, text, boolean
) TO service_role;

COMMENT ON FUNCTION public.record_stripe_dispute_status_event(
  text, text, timestamptz, text, boolean
) IS
  'Monotonically records exact Stripe dispute status evidence and preserves terminal-loss proof; service role only';

-- Temporary deployment bridge: old application instances resolve the legacy
-- signature but fail closed, leaving Stripe/DLQ to replay after the new caller
-- carrying verified livemode is live. It deliberately never guesses mode.
CREATE FUNCTION public.record_stripe_dispute_status_event(
  p_dispute_id text,
  p_event_id text,
  p_event_at timestamptz,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  RAISE EXCEPTION 'Stripe dispute livemode evidence is required; replay this event with the five-argument RPC'
    USING ERRCODE = 'P0001';
END;
$function$;

REVOKE ALL ON FUNCTION public.record_stripe_dispute_status_event(
  text, text, timestamptz, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_stripe_dispute_status_event(
  text, text, timestamptz, text
) TO service_role;

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
  v_applied boolean := false;
  v_dispute public.stripe_disputes%ROWTYPE;
  v_intake public.intakes%ROWTYPE;
  v_intake_updated boolean := false;
  v_evidenced_refund_cents bigint := 0;
  v_outstanding_refund_cents bigint := 0;
  v_outstanding_dispute_cents bigint := 0;
  v_restore_status text;
BEGIN
  IF p_event_type NOT IN (
    'charge.dispute.funds_withdrawn',
    'charge.dispute.funds_reinstated'
  ) THEN
    RAISE EXCEPTION 'unsupported Stripe dispute cash event type: %', p_event_type
      USING ERRCODE = '22023';
  END IF;
  IF p_event_id IS NULL OR pg_catalog.btrim(p_event_id) = '' OR p_event_at IS NULL THEN
    RAISE EXCEPTION 'Complete Stripe dispute cash event evidence is required'
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
  IF v_dispute.livemode IS NULL THEN
    RAISE EXCEPTION 'Stripe dispute cash event has no durable mode evidence'
      USING ERRCODE = 'P0001';
  END IF;
  IF pg_catalog.lower(v_dispute.currency) <> 'aud' THEN
    RAISE EXCEPTION 'Non-AUD dispute cash cannot reconcile an AUD intake'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_dispute.intake_id IS NOT NULL THEN
    SELECT intake.*
      INTO v_intake
      FROM public.intakes AS intake
     WHERE intake.id = v_dispute.intake_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stripe dispute linked intake is missing'
        USING ERRCODE = 'P0002';
    END IF;
    IF v_intake.payment_status NOT IN (
      'paid',
      'partially_refunded',
      'refunded',
      'refund_processing',
      'refund_failed',
      'disputed'
    ) THEN
      RAISE EXCEPTION 'Stripe dispute cash cannot reconcile poisoned intake payment state: %',
        COALESCE(v_intake.payment_status, 'null')
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_event_type = 'charge.dispute.funds_withdrawn' THEN
    IF v_dispute.funds_withdrawn_event_id IS NOT NULL THEN
      IF v_dispute.funds_withdrawn_event_id <> p_event_id
        OR v_dispute.funds_withdrawn_at <> p_event_at
        OR v_dispute.funds_withdrawn_cents <> p_amount_cents THEN
        RAISE EXCEPTION 'Conflicting Stripe dispute withdrawal evidence'
          USING ERRCODE = 'P0001';
      END IF;
    ELSE
      UPDATE public.stripe_disputes AS dispute
         SET funds_withdrawn_at = p_event_at,
             funds_withdrawn_cents = p_amount_cents,
             funds_withdrawn_event_id = p_event_id,
             updated_at = pg_catalog.clock_timestamp()
       WHERE dispute.dispute_id = p_dispute_id;
      v_applied := true;
    END IF;
  ELSE
    IF v_dispute.funds_withdrawn_event_id IS NULL THEN
      RAISE EXCEPTION 'Stripe dispute cash reinstatement requires a prior withdrawal'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_dispute.funds_reinstated_event_id IS NOT NULL THEN
      IF v_dispute.funds_reinstated_event_id <> p_event_id
        OR v_dispute.funds_reinstated_at <> p_event_at
        OR v_dispute.funds_reinstated_cents <> p_amount_cents THEN
        RAISE EXCEPTION 'Conflicting Stripe dispute reinstatement evidence'
          USING ERRCODE = 'P0001';
      END IF;
    ELSE
      UPDATE public.stripe_disputes AS dispute
         SET funds_reinstated_at = p_event_at,
             funds_reinstated_cents = p_amount_cents,
             funds_reinstated_event_id = p_event_id,
             updated_at = pg_catalog.clock_timestamp()
       WHERE dispute.dispute_id = p_dispute_id;
      v_applied := true;
    END IF;
  END IF;

  IF v_dispute.intake_id IS NOT NULL THEN
    SELECT COALESCE(sum(GREATEST(
      COALESCE(dispute.funds_withdrawn_cents, 0) -
        COALESCE(dispute.funds_reinstated_cents, 0),
      0
    )), 0)
      INTO v_outstanding_dispute_cents
      FROM public.stripe_disputes AS dispute
     WHERE dispute.intake_id = v_dispute.intake_id
       AND dispute.livemode = v_dispute.livemode;

    SELECT
      COALESCE(sum(movement.amount_cents), 0),
      COALESCE(sum(movement.amount_cents) FILTER (
        WHERE movement.refund_reversed_at IS NULL
      ), 0)
      INTO v_evidenced_refund_cents, v_outstanding_refund_cents
      FROM public.stripe_refund_cash_movements AS movement
     WHERE movement.intake_id = v_dispute.intake_id
       AND movement.livemode = v_dispute.livemode
       AND movement.currency = 'aud';

    IF v_evidenced_refund_cents < COALESCE(v_intake.refund_amount_cents, 0) THEN
      RAISE EXCEPTION 'Exact refund evidence does not cover cumulative intake refunds'
        USING ERRCODE = 'P0001';
    END IF;

    v_restore_status := CASE
      WHEN v_outstanding_dispute_cents > 0 THEN 'disputed'
      WHEN COALESCE(v_intake.amount_cents, 0) > 0
        AND v_outstanding_refund_cents >= v_intake.amount_cents
        THEN 'refunded'
      WHEN v_outstanding_refund_cents > 0 THEN 'partially_refunded'
      ELSE 'paid'
    END;

    UPDATE public.intakes AS intake
       SET payment_status = v_restore_status,
           refund_amount_cents = LEAST(
             v_outstanding_refund_cents,
             GREATEST(COALESCE(v_intake.amount_cents, 0), 0)
           )::integer,
           dispute_id = CASE
             WHEN p_event_type = 'charge.dispute.funds_withdrawn' THEN p_dispute_id
             ELSE intake.dispute_id
           END,
           updated_at = pg_catalog.clock_timestamp()
     WHERE intake.id = v_dispute.intake_id;
    v_intake_updated := FOUND;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'applied', v_applied,
    'intake_id', v_dispute.intake_id,
    'intake_updated', v_intake_updated,
    'amount_cents', v_intake.amount_cents,
    'refund_amount_cents', v_outstanding_refund_cents,
    'outstanding_dispute_cents', v_outstanding_dispute_cents,
    'restored_payment_status', v_restore_status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_stripe_dispute_cash_event(
  text, text, text, timestamptz, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_stripe_dispute_cash_event(
  text, text, text, timestamptz, integer
) TO service_role;

COMMENT ON FUNCTION public.record_stripe_dispute_cash_event(
  text, text, text, timestamptz, integer
) IS
  'Records exact dispute cash evidence and derives intake state from all linked disputes; service role only';

CREATE VIEW public.stripe_payment_adjustment_targets
WITH (security_invoker = true)
AS
WITH aggregate_disputes AS (
  SELECT
    dispute.intake_id,
    count(*) FILTER (WHERE dispute.terminal_lost_at IS NOT NULL)::integer
      AS terminal_dispute_count,
    COALESCE(sum(GREATEST(
      COALESCE(dispute.funds_withdrawn_cents, 0) -
        COALESCE(dispute.funds_reinstated_cents, 0),
      0
    )) FILTER (WHERE dispute.terminal_lost_at IS NOT NULL), 0)::bigint
      AS terminal_lost_outstanding_cents,
    max(GREATEST(
      dispute.terminal_lost_at,
      dispute.funds_withdrawn_at,
      dispute.funds_reinstated_at
    )) FILTER (WHERE dispute.terminal_lost_at IS NOT NULL) AS dispute_adjustment_at
  FROM public.stripe_disputes AS dispute
  WHERE dispute.intake_id IS NOT NULL
    AND dispute.livemode = true
    AND pg_catalog.lower(dispute.currency) = 'aud'
  GROUP BY dispute.intake_id
), exact_refunds AS (
  SELECT
    movement.intake_id,
    COALESCE(sum(movement.amount_cents) FILTER (
      WHERE movement.refund_reversed_at IS NULL
    ), 0)::bigint AS outstanding_refund_cents,
    max(GREATEST(
      movement.refund_cash_at,
      movement.refund_reversed_at
    )) AS refund_adjustment_at
  FROM public.stripe_refund_cash_movements AS movement
  WHERE movement.livemode = true
    AND movement.intake_id IS NOT NULL
    AND movement.currency = 'aud'
  GROUP BY movement.intake_id
), conflicting_refund_intakes AS (
  SELECT DISTINCT evidence.intake_id
  FROM public.stripe_refund_events AS evidence
  JOIN public.stripe_refund_evidence_consistency AS consistency
    ON consistency.livemode = evidence.livemode
   AND consistency.stripe_refund_id = evidence.stripe_refund_id
  WHERE evidence.livemode = true
    AND evidence.intake_id IS NOT NULL
    AND NOT consistency.is_consistent
), adjustment_intakes AS (
  SELECT intake_id FROM aggregate_disputes WHERE terminal_dispute_count > 0
  UNION
  SELECT intake_id FROM exact_refunds
)
SELECT
  intake.id AS intake_id,
  intake.amount_cents,
  COALESCE(exact_refunds.outstanding_refund_cents, 0)::integer AS refund_amount_cents,
  intake.payment_status,
  intake.paid_at,
  intake.refunded_at,
  intake.updated_at,
  GREATEST(
    aggregate_disputes.dispute_adjustment_at,
    exact_refunds.refund_adjustment_at
  ) AS adjustment_at,
  COALESCE(aggregate_disputes.terminal_dispute_count, 0) AS terminal_dispute_count,
  COALESCE(aggregate_disputes.terminal_lost_outstanding_cents, 0)::bigint
    AS terminal_lost_outstanding_cents,
  computed.exact_target_net_value_cents,
  -- Google permanently removes a conversion restated to zero. Revenue stays
  -- exact at zero; Ads receives a reversible A$0.01 floor so later exact cash
  -- reinstatement can still be represented.
  GREATEST(computed.exact_target_net_value_cents, 1)::integer
    AS target_net_value_cents
FROM adjustment_intakes
JOIN public.intakes AS intake ON intake.id = adjustment_intakes.intake_id
LEFT JOIN aggregate_disputes ON aggregate_disputes.intake_id = intake.id
LEFT JOIN exact_refunds ON exact_refunds.intake_id = intake.id
CROSS JOIN LATERAL (
  SELECT GREATEST(
    COALESCE(intake.amount_cents, 0) -
      LEAST(
        COALESCE(intake.amount_cents, 0),
        COALESCE(exact_refunds.outstanding_refund_cents, 0) +
          COALESCE(aggregate_disputes.terminal_lost_outstanding_cents, 0)
      ),
    0
  )::integer AS exact_target_net_value_cents
) AS computed
WHERE intake.paid_at IS NOT NULL
  AND COALESCE(intake.refund_amount_cents, 0) =
    COALESCE(exact_refunds.outstanding_refund_cents, 0)
  AND NOT EXISTS (
    SELECT 1
    FROM conflicting_refund_intakes AS conflict
    WHERE conflict.intake_id = intake.id
  )
  AND COALESCE(intake.exclude_from_reporting, false) = false;

REVOKE ALL ON public.stripe_payment_adjustment_targets
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.stripe_payment_adjustment_targets TO service_role;

COMMENT ON VIEW public.stripe_payment_adjustment_targets IS
  'One exact retained Google Ads target per intake from live AUD refund cash and every durably terminal-lost dispute';

CREATE VIEW public.stripe_dispute_ads_targets
WITH (security_invoker = true)
AS
SELECT target.*
FROM public.stripe_payment_adjustment_targets AS target
WHERE target.terminal_dispute_count > 0;

REVOKE ALL ON public.stripe_dispute_ads_targets
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.stripe_dispute_ads_targets TO service_role;

COMMENT ON VIEW public.stripe_dispute_ads_targets IS
  'Compatibility subset of exact retained Ads targets with terminal dispute evidence';

-- A durable lease closes the race between webhook/cron workers after audit
-- preflight but before the external Google Ads mutation.
CREATE TABLE public.google_ads_conversion_adjustment_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  generation integer NOT NULL CHECK (generation > 0),
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('RETRACTION', 'RESTATEMENT')),
  target_net_value_cents integer NOT NULL CHECK (target_net_value_cents >= 0),
  adjustment_at timestamptz NOT NULL,
  state text NOT NULL CHECK (state IN (
    'pending',
    'reserved',
    'retryable_failed',
    'succeeded',
    'resolved_not_counted',
    'terminal_failed',
    'unknown_outcome'
  )),
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_source text,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id, generation),
  CONSTRAINT google_ads_adjustment_claim_lease_check CHECK (
    (state = 'reserved' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR
    (state <> 'reserved' AND lease_token IS NULL AND lease_expires_at IS NULL)
  )
);

CREATE INDEX idx_google_ads_adjustment_claims_retryable
  ON public.google_ads_conversion_adjustment_claims (state, updated_at)
  WHERE state IN ('pending', 'reserved', 'retryable_failed', 'unknown_outcome');

ALTER TABLE public.google_ads_conversion_adjustment_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_ads_conversion_adjustment_claims
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.google_ads_conversion_adjustment_claims TO service_role;

-- Claims become the authoritative desired-state history. Bootstrap only the
-- latest definitive legacy audit outcome per intake so A -> B -> A compares
-- against B, never against any matching event in the distant past.
WITH latest_definitive_audit AS (
  SELECT DISTINCT ON (audit.intake_id)
    audit.intake_id,
    audit.created_at,
    audit.metadata
  FROM public.audit_logs AS audit
  JOIN public.intakes AS intake ON intake.id = audit.intake_id
  WHERE audit.action = 'google_ads_conversion_adjustment'
    AND audit.intake_id IS NOT NULL
    AND audit.metadata ->> 'status' IN (
      'success', 'resolved_not_counted', 'terminal_failed'
    )
    -- Older code briefly classified CONVERSION_NOT_FOUND as terminal even
    -- inside Google's asynchronous match window. It is timing evidence, not a
    -- durable external outcome, so never freeze that mistake into a claim.
    AND NOT (
      audit.metadata ->> 'status' = 'terminal_failed'
      AND (
        audit.metadata ->> 'terminal_reason' = 'conversion_not_found'
        OR audit.metadata ->> 'error_code' LIKE '%CONVERSION_NOT_FOUND%'
      )
    )
    AND audit.metadata ->> 'adjustment_type' IN ('RETRACTION', 'RESTATEMENT')
    AND audit.metadata ->> 'target_net_value_cents' ~ '^[0-9]+$'
    AND (audit.metadata ->> 'target_net_value_cents')::integer <= intake.amount_cents
  ORDER BY audit.intake_id, audit.created_at DESC, audit.id DESC
)
INSERT INTO public.google_ads_conversion_adjustment_claims (
  intake_id,
  generation,
  adjustment_type,
  target_net_value_cents,
  adjustment_at,
  state,
  last_source,
  completed_at
)
SELECT
  audit.intake_id,
  1,
  audit.metadata ->> 'adjustment_type',
  (audit.metadata ->> 'target_net_value_cents')::integer,
  pg_catalog.date_trunc('second', audit.created_at),
  CASE audit.metadata ->> 'status'
    WHEN 'success' THEN 'succeeded'
    WHEN 'resolved_not_counted' THEN 'resolved_not_counted'
    ELSE 'terminal_failed'
  END,
  'legacy_audit_bootstrap',
  audit.created_at
FROM latest_definitive_audit AS audit;

CREATE FUNCTION public.queue_google_ads_conversion_adjustment(
  p_intake_id uuid,
  p_adjustment_type text,
  p_target_net_value_cents integer,
  p_source text,
  p_adjustment_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_latest public.google_ads_conversion_adjustment_claims%ROWTYPE;
  v_claim public.google_ads_conversion_adjustment_claims%ROWTYPE;
  v_adjustment_at timestamptz;
  v_amount_cents integer;
BEGIN
  IF p_adjustment_type NOT IN ('RETRACTION', 'RESTATEMENT')
    OR p_target_net_value_cents IS NULL OR p_target_net_value_cents < 0
    OR p_adjustment_at IS NULL THEN
    RAISE EXCEPTION 'Invalid Google Ads adjustment desired state'
      USING ERRCODE = '22023';
  END IF;

  SELECT intake.amount_cents
    INTO v_amount_cents
    FROM public.intakes AS intake
   WHERE intake.id = p_intake_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Google Ads adjustment intake not found'
      USING ERRCODE = 'P0002';
  END IF;
  IF v_amount_cents IS NULL OR v_amount_cents <= 0
    OR p_target_net_value_cents > v_amount_cents THEN
    RAISE EXCEPTION 'Google Ads desired target exceeds the paid intake amount'
      USING ERRCODE = '22023';
  END IF;

  SELECT claim.*
    INTO v_latest
    FROM public.google_ads_conversion_adjustment_claims AS claim
   WHERE claim.intake_id = p_intake_id
   ORDER BY claim.generation DESC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND AND p_target_net_value_cents = v_amount_cents THEN
    RETURN pg_catalog.jsonb_build_object(
      'queued', false,
      'state', 'no_adjustment'
    );
  END IF;

  IF FOUND AND v_latest.adjustment_type = p_adjustment_type
    AND v_latest.target_net_value_cents = p_target_net_value_cents THEN
    RETURN pg_catalog.jsonb_build_object(
      'queued', false,
      'claim_id', v_latest.id,
      'generation', v_latest.generation,
      'state', v_latest.state,
      'adjustment_at', v_latest.adjustment_at
    );
  END IF;

  IF FOUND AND v_latest.state = 'succeeded'
    AND v_latest.target_net_value_cents = 0
    AND p_target_net_value_cents > 0 THEN
    RETURN pg_catalog.jsonb_build_object(
      'queued', false,
      'state', 'blocked_irreversible_zero',
      'claim_id', v_latest.id,
      'generation', v_latest.generation,
      'adjustment_at', v_latest.adjustment_at
    );
  END IF;

  IF FOUND AND v_latest.state IN ('reserved', 'unknown_outcome') THEN
    RETURN pg_catalog.jsonb_build_object(
      'queued', false,
      'state', CASE
        WHEN v_latest.state = 'reserved' THEN 'blocked_in_progress'
        ELSE 'blocked_unknown_outcome'
      END,
      'claim_id', v_latest.id,
      'generation', v_latest.generation,
      'adjustment_at', v_latest.adjustment_at
    );
  END IF;

  v_adjustment_at := pg_catalog.date_trunc('second', GREATEST(
    p_adjustment_at,
    COALESCE(v_latest.adjustment_at + interval '1 second', p_adjustment_at)
  ));

  INSERT INTO public.google_ads_conversion_adjustment_claims (
    intake_id,
    generation,
    adjustment_type,
    target_net_value_cents,
    adjustment_at,
    state,
    last_source
  ) VALUES (
    p_intake_id,
    COALESCE(v_latest.generation, 0) + 1,
    p_adjustment_type,
    p_target_net_value_cents,
    v_adjustment_at,
    'pending',
    p_source
  )
  RETURNING * INTO v_claim;

  RETURN pg_catalog.jsonb_build_object(
    'queued', true,
    'claim_id', v_claim.id,
    'generation', v_claim.generation,
    'state', v_claim.state,
    'adjustment_at', v_claim.adjustment_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.queue_google_ads_conversion_adjustment(
  uuid, text, integer, text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_google_ads_conversion_adjustment(
  uuid, text, integer, text, timestamptz
) TO service_role;

CREATE FUNCTION public.reserve_google_ads_conversion_adjustment(
  p_intake_id uuid,
  p_adjustment_type text,
  p_target_net_value_cents integer,
  p_source text,
  p_adjustment_at timestamptz,
  p_lease_seconds integer DEFAULT 600
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_latest public.google_ads_conversion_adjustment_claims%ROWTYPE;
  v_claim public.google_ads_conversion_adjustment_claims%ROWTYPE;
  v_token uuid;
  v_adjustment_at timestamptz;
  v_amount_cents integer;
BEGIN
  IF p_adjustment_type NOT IN ('RETRACTION', 'RESTATEMENT')
    OR p_target_net_value_cents IS NULL OR p_target_net_value_cents < 0
    OR p_adjustment_at IS NULL
    OR p_lease_seconds < 60 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'Invalid Google Ads adjustment reservation'
      USING ERRCODE = '22023';
  END IF;

  SELECT intake.amount_cents
    INTO v_amount_cents
    FROM public.intakes AS intake
   WHERE intake.id = p_intake_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Google Ads adjustment intake not found'
      USING ERRCODE = 'P0002';
  END IF;
  IF v_amount_cents IS NULL OR v_amount_cents <= 0
    OR p_target_net_value_cents > v_amount_cents THEN
    RAISE EXCEPTION 'Google Ads desired target exceeds the paid intake amount'
      USING ERRCODE = '22023';
  END IF;

  SELECT claim.*
    INTO v_latest
    FROM public.google_ads_conversion_adjustment_claims AS claim
   WHERE claim.intake_id = p_intake_id
   ORDER BY claim.generation DESC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND AND p_target_net_value_cents = v_amount_cents THEN
    RETURN pg_catalog.jsonb_build_object(
      'reserved', false,
      'state', 'no_adjustment'
    );
  END IF;

  IF NOT FOUND OR v_latest.adjustment_type <> p_adjustment_type
    OR v_latest.target_net_value_cents <> p_target_net_value_cents THEN
    IF FOUND AND v_latest.state = 'succeeded'
      AND v_latest.target_net_value_cents = 0
      AND p_target_net_value_cents > 0 THEN
      RETURN pg_catalog.jsonb_build_object(
        'reserved', false,
        'state', 'blocked_irreversible_zero'
      );
    END IF;
    IF FOUND AND v_latest.state IN ('reserved', 'unknown_outcome') THEN
      RETURN pg_catalog.jsonb_build_object(
        'reserved', false,
        'state', CASE
          WHEN v_latest.state = 'reserved' THEN 'blocked_in_progress'
          ELSE 'blocked_unknown_outcome'
        END
      );
    END IF;
    v_adjustment_at := pg_catalog.date_trunc('second', GREATEST(
      p_adjustment_at,
      COALESCE(v_latest.adjustment_at + interval '1 second', p_adjustment_at)
    ));
    INSERT INTO public.google_ads_conversion_adjustment_claims (
      intake_id, generation, adjustment_type, target_net_value_cents,
      adjustment_at, state, last_source
    ) VALUES (
      p_intake_id, COALESCE(v_latest.generation, 0) + 1,
      p_adjustment_type, p_target_net_value_cents, v_adjustment_at,
      'pending', p_source
    ) RETURNING * INTO v_claim;
  ELSE
    v_claim := v_latest;
  END IF;

  IF v_claim.state IN (
    'succeeded', 'resolved_not_counted', 'terminal_failed', 'unknown_outcome'
  ) THEN
    RETURN pg_catalog.jsonb_build_object(
      'reserved', false,
      'state', v_claim.state,
      'adjustment_at', v_claim.adjustment_at
    );
  END IF;

  IF v_claim.adjustment_at > pg_catalog.date_trunc(
    'second', pg_catalog.clock_timestamp()
  ) THEN
    RETURN pg_catalog.jsonb_build_object(
      'reserved', false,
      'state', 'scheduled',
      'adjustment_at', v_claim.adjustment_at
    );
  END IF;

  IF v_claim.state = 'reserved' THEN
    IF v_claim.lease_expires_at <= pg_catalog.clock_timestamp() THEN
      UPDATE public.google_ads_conversion_adjustment_claims AS claim
         SET state = 'unknown_outcome',
             lease_token = NULL,
             lease_expires_at = NULL,
             last_error = 'Reservation expired before a durable external outcome was recorded',
             completed_at = pg_catalog.clock_timestamp(),
             updated_at = pg_catalog.clock_timestamp()
       WHERE claim.id = v_claim.id;
      RETURN pg_catalog.jsonb_build_object(
        'reserved', false,
        'state', 'unknown_outcome',
        'adjustment_at', v_claim.adjustment_at
      );
    END IF;
    RETURN pg_catalog.jsonb_build_object(
      'reserved', false,
      'state', 'reserved',
      'adjustment_at', v_claim.adjustment_at
    );
  END IF;

  v_token := gen_random_uuid();
  UPDATE public.google_ads_conversion_adjustment_claims AS claim
     SET state = 'reserved',
         lease_token = v_token,
         lease_expires_at = pg_catalog.clock_timestamp() +
           pg_catalog.make_interval(secs => p_lease_seconds),
         attempt_count = claim.attempt_count + 1,
         last_source = p_source,
         last_error = NULL,
         completed_at = NULL,
         updated_at = pg_catalog.clock_timestamp()
   WHERE claim.id = v_claim.id
   RETURNING * INTO v_claim;

  RETURN pg_catalog.jsonb_build_object(
    'reserved', true,
    'claim_id', v_claim.id,
    'generation', v_claim.generation,
    'lease_token', v_token,
    'state', 'reserved',
    'adjustment_at', v_claim.adjustment_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_google_ads_conversion_adjustment(
  uuid, text, integer, text, timestamptz, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_google_ads_conversion_adjustment(
  uuid, text, integer, text, timestamptz, integer
) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_google_ads_conversion_adjustment_claim(
  p_claim_id uuid,
  p_lease_token uuid,
  p_outcome text,
  p_error text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF p_outcome NOT IN (
    'retryable_failed',
    'succeeded',
    'resolved_not_counted',
    'terminal_failed',
    'unknown_outcome'
  ) THEN
    RAISE EXCEPTION 'Invalid Google Ads adjustment completion outcome'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.google_ads_conversion_adjustment_claims AS claim
     SET state = p_outcome,
         lease_token = NULL,
         lease_expires_at = NULL,
         last_error = left(p_error, 500),
         completed_at = CASE
           WHEN p_outcome = 'retryable_failed' THEN NULL
           ELSE pg_catalog.clock_timestamp()
         END,
         updated_at = pg_catalog.clock_timestamp()
   WHERE claim.id = p_claim_id
     AND claim.state = 'reserved'
     AND claim.lease_token = p_lease_token;

  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_google_ads_conversion_adjustment_claim(
  uuid, uuid, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_google_ads_conversion_adjustment_claim(
  uuid, uuid, text, text
) TO service_role;

COMMENT ON FUNCTION public.queue_google_ads_conversion_adjustment(
  uuid, text, integer, text, timestamptz
) IS
  'Durably queues a monotonic desired Google Ads restatement before webhook acknowledgement; service role only';
COMMENT ON FUNCTION public.reserve_google_ads_conversion_adjustment(
  uuid, text, integer, text, timestamptz, integer
) IS
  'Atomically leases the latest exact Google Ads desired state; expired external attempts become fail-closed unknown outcomes; service role only';
COMMENT ON FUNCTION public.complete_google_ads_conversion_adjustment_claim(
  uuid, uuid, text, text
) IS
  'Completes or releases a leased Google Ads conversion adjustment attempt; service role only';

CREATE VIEW public.google_ads_conversion_adjustment_due
WITH (security_invoker = true)
AS
WITH latest_claim AS (
  SELECT DISTINCT ON (claim.intake_id)
    claim.intake_id,
    claim.id AS claim_id,
    claim.generation,
    claim.adjustment_type,
    claim.target_net_value_cents,
    claim.adjustment_at,
    claim.state
  FROM public.google_ads_conversion_adjustment_claims AS claim
  ORDER BY claim.intake_id, claim.generation DESC
)
SELECT
  target.intake_id,
  target.amount_cents,
  target.refund_amount_cents,
  target.payment_status,
  target.paid_at,
  CASE
    WHEN latest_claim.target_net_value_cents = target.target_net_value_cents
      THEN latest_claim.adjustment_at
    ELSE target.adjustment_at
  END AS adjustment_at,
  target.target_net_value_cents,
  latest_claim.claim_id,
  latest_claim.generation AS claim_generation,
  latest_claim.state AS claim_state
FROM public.stripe_payment_adjustment_targets AS target
LEFT JOIN latest_claim ON latest_claim.intake_id = target.intake_id
WHERE EXISTS (
  SELECT 1
  FROM public.audit_logs AS audit
  WHERE audit.intake_id = target.intake_id
    AND audit.action = 'google_ads_conversion_upload'
    AND audit.metadata ->> 'status' = 'success'
)
AND (
  (
    latest_claim.claim_id IS NULL
    AND target.target_net_value_cents < target.amount_cents
  )
  OR (
    latest_claim.state IN ('pending', 'retryable_failed')
    AND latest_claim.target_net_value_cents = target.target_net_value_cents
  )
  OR (
    latest_claim.state NOT IN ('reserved', 'unknown_outcome')
    AND latest_claim.target_net_value_cents <> target.target_net_value_cents
  )
)
AND NOT (
  latest_claim.state = 'succeeded'
  AND latest_claim.target_net_value_cents = 0
  AND target.target_net_value_cents > 0
)
AND target.paid_at >= pg_catalog.clock_timestamp() - interval '54 days'
AND CASE
  WHEN latest_claim.target_net_value_cents = target.target_net_value_cents
    THEN latest_claim.adjustment_at
  ELSE target.adjustment_at
END <= pg_catalog.date_trunc('second', pg_catalog.clock_timestamp());

REVOKE ALL ON public.google_ads_conversion_adjustment_due
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.google_ads_conversion_adjustment_due TO service_role;

COMMENT ON VIEW public.google_ads_conversion_adjustment_due IS
  'Latest exact Ads desired states that are actionable; excludes completed states and fail-closed uncertain external outcomes';

CREATE VIEW public.google_ads_conversion_adjustment_claim_health
WITH (security_invoker = true)
AS
WITH latest_claim AS (
  SELECT DISTINCT ON (claim.intake_id)
    claim.intake_id,
    claim.target_net_value_cents,
    claim.state
  FROM public.google_ads_conversion_adjustment_claims AS claim
  ORDER BY claim.intake_id, claim.generation DESC
)
SELECT
  count(*) FILTER (WHERE claim.state = 'unknown_outcome')::bigint
    AS unknown_outcome_count,
  count(*) FILTER (
    WHERE claim.state = 'succeeded'
      AND claim.target_net_value_cents = 0
  )::bigint AS irreversible_zero_count,
  count(*) FILTER (
    WHERE claim.state IN ('pending', 'retryable_failed')
      AND claim.updated_at < pg_catalog.clock_timestamp() - interval '72 hours'
  )::bigint AS stale_pending_count,
  count(*) FILTER (
    WHERE claim.state = 'reserved'
      AND claim.lease_expires_at <= pg_catalog.clock_timestamp()
  )::bigint AS expired_reservation_count,
  (
    SELECT count(*)::bigint
    FROM public.stripe_payment_adjustment_targets AS target
    LEFT JOIN latest_claim AS latest ON latest.intake_id = target.intake_id
    WHERE target.paid_at < pg_catalog.clock_timestamp() - interval '54 days'
      AND target.target_net_value_cents < target.amount_cents
      AND EXISTS (
        SELECT 1
        FROM public.audit_logs AS audit
        WHERE audit.intake_id = target.intake_id
          AND audit.action = 'google_ads_conversion_upload'
          AND audit.metadata ->> 'status' = 'success'
      )
      AND NOT COALESCE((
        latest.target_net_value_cents = target.target_net_value_cents
        AND latest.state IN ('succeeded', 'resolved_not_counted', 'terminal_failed')
      ), false)
  ) AS expired_conversion_target_count,
  min(claim.updated_at) FILTER (
    WHERE claim.state = 'unknown_outcome'
      OR (
        claim.state = 'reserved'
        AND claim.lease_expires_at <= pg_catalog.clock_timestamp()
      )
  ) AS oldest_uncertain_at
FROM public.google_ads_conversion_adjustment_claims AS claim;

REVOKE ALL ON public.google_ads_conversion_adjustment_claim_health
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.google_ads_conversion_adjustment_claim_health TO service_role;

COMMENT ON VIEW public.google_ads_conversion_adjustment_claim_health IS
  'Aggregate-only alert surface for external Ads writes whose outcome cannot be proved';

-- Failed/canceled refund evidence must make any not-yet-sent refund notice
-- terminally ineligible for dispatcher retry.
INSERT INTO public.email_templates (
  slug,
  name,
  description,
  subject,
  body_html,
  body_text,
  available_tags
)
VALUES (
  'refund-failed',
  'Refund status update',
  'Corrects a previously sent refund notice after exact Stripe reversal evidence',
  'Important update about your refund',
  '<h1>Hi {{patient_name}},</h1>' ||
    '<p>Stripe has told us that the refund we previously notified you about did not complete.</p>' ||
    '<p>We are reviewing the payment record and will contact you if anything further is needed. You can reply to this email or contact support@instantmed.com.au with questions.</p>' ||
    '<p>Best regards,<br>InstantMed Team</p>',
  'Hi {{patient_name}}, Stripe has told us that the refund we previously notified you about did not complete. We are reviewing the payment record and will contact you if anything further is needed. Contact support@instantmed.com.au with questions.',
  '["patient_name"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.email_outbox
  DROP CONSTRAINT IF EXISTS email_outbox_status_check;
ALTER TABLE public.email_outbox
  ADD CONSTRAINT email_outbox_status_check CHECK (
    status IN ('pending', 'sending', 'sent', 'failed', 'skipped_e2e', 'cancelled')
  );

CREATE FUNCTION public.cancel_stripe_refund_notifications(
  p_intake_id uuid,
  p_refund_ids text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_keys text[];
  v_cancelled integer := 0;
BEGIN
  IF p_intake_id IS NULL OR p_refund_ids IS NULL
    OR pg_catalog.cardinality(p_refund_ids) = 0
    OR EXISTS (
      SELECT 1 FROM pg_catalog.unnest(p_refund_ids) AS refund_id
      WHERE refund_id IS NULL OR pg_catalog.btrim(refund_id) = ''
    ) THEN
    RAISE EXCEPTION 'Complete Stripe refund notification cancellation evidence is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.array_agg(
    'stripe-refund-processed:' || p_intake_id::text || ':' || refund_id
  ) INTO v_keys
  FROM pg_catalog.unnest(p_refund_ids) AS refund_id;

  PERFORM outbox.id
  FROM public.email_outbox AS outbox
  WHERE outbox.idempotency_key = ANY(v_keys)
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.email_outbox AS outbox
    WHERE outbox.idempotency_key = ANY(v_keys)
      AND outbox.status = 'sending'
  ) THEN
    RAISE EXCEPTION 'Stripe refund notification provider outcome is uncertain'
      USING ERRCODE = 'P0001';
  END IF;

  -- A provider-accepted notice cannot be recalled. Queue one corrective
  -- patient notice from the same durable recipient context; the unique key
  -- makes webhook replay idempotent. A `sending` row never reaches this block
  -- because its provider outcome is still unknown and must be replayed later.
  INSERT INTO public.email_outbox (
    email_type,
    to_email,
    to_name,
    subject,
    status,
    provider,
    intake_id,
    patient_id,
    metadata,
    idempotency_key,
    last_attempt_at,
    retry_count,
    scheduled_for
  )
  SELECT
    'refund-failed',
    outbox.to_email,
    outbox.to_name,
    'Important update about your refund',
    'pending',
    'resend',
    outbox.intake_id,
    outbox.patient_id,
    pg_catalog.jsonb_build_object(
      'stripe_refund_id', outbox.metadata ->> 'stripe_refund_id',
      'refund_livemode', outbox.metadata -> 'refund_livemode',
      'corrects_outbox_id', outbox.id
    ),
    'stripe-refund-failed:' || p_intake_id::text || ':' ||
      (outbox.metadata ->> 'stripe_refund_id'),
    pg_catalog.clock_timestamp(),
    0,
    pg_catalog.clock_timestamp()
  FROM public.email_outbox AS outbox
  WHERE outbox.idempotency_key = ANY(v_keys)
    AND outbox.status = 'sent'
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  UPDATE public.email_outbox AS outbox
     SET status = 'cancelled',
         error_message = 'Exact Stripe refund reversal invalidated this notification',
         updated_at = pg_catalog.clock_timestamp()
   WHERE outbox.idempotency_key = ANY(v_keys)
     AND outbox.status IN ('pending', 'failed');
  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  RETURN v_cancelled;
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_stripe_refund_notifications(uuid, text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_stripe_refund_notifications(uuid, text[])
  TO service_role;

COMMENT ON FUNCTION public.cancel_stripe_refund_notifications(uuid, text[]) IS
  'Cancels only unsent exact-refund notices; a sending row fails closed as an unknown provider outcome';

-- A backfill observation key includes its durable lifecycle evidence so a
-- later failure/reversal can append a new observation instead of colliding
-- with an earlier succeeded snapshot.
UPDATE public.stripe_refund_events AS evidence
   SET evidence_key =
     (CASE WHEN evidence.livemode THEN 'live' ELSE 'test' END) ||
     ':refund:' || evidence.stripe_refund_id ||
     ':observation:' || COALESCE(evidence.balance_transaction_id, 'none') || ':' ||
     COALESCE(evidence.failure_balance_transaction_id, 'none') || ':' ||
     COALESCE(evidence.refund_status, 'unknown')
 WHERE evidence.evidence_source = 'refund.list.backfill'
   AND evidence.evidence_key =
     (CASE WHEN evidence.livemode THEN 'live' ELSE 'test' END) ||
     ':refund:' || evidence.stripe_refund_id;

ALTER TABLE public.stripe_refund_events
  DROP CONSTRAINT IF EXISTS stripe_refund_events_source_identity_check,
  ADD CONSTRAINT stripe_refund_events_source_identity_check CHECK (
    (
      evidence_source = 'refund.list.backfill'
      AND stripe_event_id IS NULL
      AND stripe_event_created_at IS NULL
      AND evidence_key =
        (CASE WHEN livemode THEN 'live' ELSE 'test' END) ||
        ':refund:' || stripe_refund_id ||
        ':observation:' || COALESCE(balance_transaction_id, 'none') || ':' ||
        COALESCE(failure_balance_transaction_id, 'none') || ':' ||
        COALESCE(refund_status, 'unknown')
    )
    OR
    (
      evidence_source <> 'refund.list.backfill'
      AND stripe_event_id IS NOT NULL
      AND stripe_event_created_at IS NOT NULL
      AND evidence_key =
        (CASE WHEN livemode THEN 'live' ELSE 'test' END) ||
        ':event:' || stripe_event_id || ':refund:' || stripe_refund_id
    )
  );

-- Priority classification is deliberately nullable during rollout. Historical
-- `priority_fee_refunded_at` was stamped with local wall-clock time, not the
-- Stripe balance timestamp, so it cannot safely classify old evidence. The
-- metadata-aware exact backfill appends a true/false observation later; until
-- then reconciliation preserves any legacy stamp and health reports unknown
-- classification rather than guessing or aborting this schema migration.

CREATE OR REPLACE VIEW public.stripe_refund_evidence_consistency
WITH (security_invoker = true)
AS
SELECT
  refund_event.livemode,
  refund_event.stripe_refund_id,
  max(refund_event.intake_id::text)::uuid AS intake_id,
  max(refund_event.payment_intent_id) AS payment_intent_id,
  max(refund_event.charge_id) AS charge_id,
  max(refund_event.amount_cents) AS amount_cents,
  max(refund_event.currency) AS currency,
  max(refund_event.refund_created_at) AS refund_created_at,
  max(refund_event.balance_transaction_id) AS balance_transaction_id,
  max(refund_event.refund_cash_at) AS refund_cash_at,
  max(refund_event.failure_balance_transaction_id) AS failure_balance_transaction_id,
  max(refund_event.refund_reversed_at) AS refund_reversed_at,
  (
    count(DISTINCT refund_event.amount_cents) = 1
    AND count(DISTINCT refund_event.currency) = 1
    AND count(DISTINCT refund_event.refund_created_at) = 1
    AND count(DISTINCT refund_event.is_priority_fee_refund) <= 1
    AND count(DISTINCT refund_event.intake_id) <= 1
    AND count(DISTINCT refund_event.payment_intent_id) <= 1
    AND count(DISTINCT refund_event.charge_id) <= 1
    AND count(DISTINCT refund_event.balance_transaction_id) <= 1
    AND count(DISTINCT refund_event.refund_cash_at) <= 1
    AND count(DISTINCT refund_event.failure_balance_transaction_id) <= 1
    AND count(DISTINCT refund_event.refund_reversed_at) <= 1
    AND (
      (count(refund_event.balance_transaction_id) = 0 AND count(refund_event.refund_cash_at) = 0)
      OR
      (count(refund_event.balance_transaction_id) > 0 AND count(refund_event.refund_cash_at) > 0)
    )
    AND (
      (
        count(refund_event.failure_balance_transaction_id) = 0
        AND count(refund_event.refund_reversed_at) = 0
      )
      OR
      (
        count(refund_event.failure_balance_transaction_id) > 0
        AND count(refund_event.refund_reversed_at) > 0
        AND count(refund_event.refund_cash_at) > 0
        AND max(refund_event.refund_reversed_at) >= max(refund_event.refund_cash_at)
      )
    )
  ) AS is_consistent,
  CASE
    WHEN count(refund_event.is_priority_fee_refund) = 0 THEN NULL
    ELSE bool_or(refund_event.is_priority_fee_refund)
  END AS is_priority_fee_refund
FROM public.stripe_refund_events AS refund_event
GROUP BY refund_event.livemode, refund_event.stripe_refund_id;

CREATE OR REPLACE VIEW public.stripe_refund_cash_movements
WITH (security_invoker = true)
AS
SELECT
  consistency.stripe_refund_id,
  intake.id AS intake_id,
  consistency.payment_intent_id,
  consistency.charge_id,
  consistency.amount_cents,
  consistency.currency,
  consistency.refund_created_at,
  consistency.refund_cash_at,
  consistency.refund_reversed_at,
  consistency.livemode,
  intake.amount_cents AS order_amount_cents,
  intake.category,
  intake.subtype,
  intake.exclude_from_reporting,
  intake.patient_id,
  consistency.is_priority_fee_refund
FROM public.stripe_refund_evidence_consistency AS consistency
LEFT JOIN public.intakes AS intake ON intake.id = consistency.intake_id
WHERE consistency.is_consistent
  AND consistency.refund_cash_at IS NOT NULL;

-- Reconcile refund lifecycle from the latest durable Stripe observation, not
-- webhook arrival order or a cumulative Charge snapshot. Cash totals still
-- come exclusively from exact balance movements.
CREATE OR REPLACE FUNCTION public.reconcile_intake_refund_cash_state(
  p_intake_id uuid,
  p_livemode boolean,
  p_trigger_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_intake public.intakes%ROWTYPE;
  v_evidenced_refund_cents bigint := 0;
  v_outstanding_refund_cents bigint := 0;
  v_outstanding_dispute_cents bigint := 0;
  v_latest_refund_id text;
  v_latest_refund_status text;
  v_latest_refund_at timestamptz;
  v_latest_adjustment_at timestamptz;
  v_priority_fee_refunded_at timestamptz;
  v_priority_classification_complete boolean := true;
  v_payment_status text;
  v_refund_status public.refund_status;
  v_applied boolean := false;
BEGIN
  IF p_livemode IS NULL THEN
    RAISE EXCEPTION 'Stripe refund reconciliation mode is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT intake.*
    INTO v_intake
    FROM public.intakes AS intake
   WHERE intake.id = p_intake_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund intake not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_intake.payment_status NOT IN (
    'paid',
    'partially_refunded',
    'refunded',
    'refund_processing',
    'refund_failed',
    'disputed'
  ) THEN
    RAISE EXCEPTION 'Stripe refund cash cannot reconcile poisoned intake payment state: %',
      COALESCE(v_intake.payment_status, 'null')
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.stripe_refund_evidence_consistency AS consistency
     WHERE consistency.livemode = p_livemode
       AND NOT consistency.is_consistent
       AND EXISTS (
         SELECT 1
           FROM public.stripe_refund_events AS evidence
          WHERE evidence.livemode = consistency.livemode
            AND evidence.stripe_refund_id = consistency.stripe_refund_id
            AND evidence.intake_id = p_intake_id
       )
  ) THEN
    RAISE EXCEPTION 'Conflicting exact refund evidence'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.stripe_refund_evidence_consistency AS consistency
     WHERE consistency.livemode = p_livemode
       AND consistency.intake_id = p_intake_id
       AND consistency.is_consistent
       AND consistency.refund_cash_at IS NOT NULL
       AND consistency.currency <> 'aud'
  ) THEN
    RAISE EXCEPTION 'Non-AUD refund evidence cannot reconcile an AUD intake'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT
    COALESCE(sum(movement.amount_cents), 0),
    COALESCE(sum(movement.amount_cents) FILTER (
      WHERE movement.refund_reversed_at IS NULL
    ), 0),
    max(movement.refund_cash_at) FILTER (
      WHERE movement.refund_reversed_at IS NULL
    ),
    max(GREATEST(movement.refund_cash_at, movement.refund_reversed_at)),
    max(movement.refund_cash_at) FILTER (
      WHERE movement.refund_reversed_at IS NULL
        AND movement.is_priority_fee_refund
    ),
    COALESCE(bool_and(movement.is_priority_fee_refund IS NOT NULL), true)
    INTO
      v_evidenced_refund_cents,
      v_outstanding_refund_cents,
      v_latest_refund_at,
      v_latest_adjustment_at,
      v_priority_fee_refunded_at,
      v_priority_classification_complete
    FROM public.stripe_refund_cash_movements AS movement
   WHERE movement.livemode = p_livemode
     AND movement.intake_id = p_intake_id
     AND movement.currency = 'aud';

  IF v_evidenced_refund_cents < COALESCE(v_intake.refund_amount_cents, 0) THEN
    RAISE EXCEPTION 'Exact refund evidence does not cover cumulative intake refunds'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT evidence.stripe_refund_id, evidence.refund_status
    INTO v_latest_refund_id, v_latest_refund_status
    FROM public.stripe_refund_events AS evidence
    JOIN public.stripe_refund_evidence_consistency AS consistency
      ON consistency.livemode = evidence.livemode
     AND consistency.stripe_refund_id = evidence.stripe_refund_id
     AND consistency.is_consistent
   WHERE evidence.livemode = p_livemode
     AND evidence.intake_id = p_intake_id
   ORDER BY (
     CASE
       WHEN evidence.evidence_source IN (
         'refund.created', 'refund.updated', 'refund.failed'
       ) THEN evidence.stripe_event_created_at
       ELSE GREATEST(
         evidence.refund_reversed_at,
         evidence.refund_cash_at,
         evidence.refund_created_at
       )
     END
   ) DESC,
   CASE evidence.refund_status
     WHEN 'failed' THEN 40
     WHEN 'canceled' THEN 40
     WHEN 'succeeded' THEN 30
     WHEN 'requires_action' THEN 20
     WHEN 'pending' THEN 20
     ELSE 10
   END DESC,
   evidence.evidence_key DESC
   LIMIT 1;

  SELECT COALESCE(sum(GREATEST(
    COALESCE(dispute.funds_withdrawn_cents, 0) -
      COALESCE(dispute.funds_reinstated_cents, 0),
    0
  )), 0)
    INTO v_outstanding_dispute_cents
   FROM public.stripe_disputes AS dispute
   WHERE dispute.intake_id = p_intake_id
     AND dispute.livemode = p_livemode;

  v_payment_status := CASE
    WHEN v_outstanding_dispute_cents > 0 THEN 'disputed'
    WHEN COALESCE(v_intake.amount_cents, 0) > 0
      AND v_outstanding_refund_cents >= v_intake.amount_cents THEN 'refunded'
    WHEN v_outstanding_refund_cents > 0 THEN 'partially_refunded'
    ELSE 'paid'
  END;

  v_refund_status := CASE
    WHEN v_latest_refund_status IN ('failed', 'canceled')
      THEN 'failed'::public.refund_status
    WHEN v_latest_refund_status IN ('pending', 'requires_action')
      THEN 'pending'::public.refund_status
    WHEN v_outstanding_refund_cents > 0
      THEN 'succeeded'::public.refund_status
    ELSE 'not_applicable'::public.refund_status
  END;

  UPDATE public.intakes AS intake
     SET payment_status = v_payment_status,
         refund_status = v_refund_status,
         refund_amount_cents = LEAST(
           v_outstanding_refund_cents,
           GREATEST(COALESCE(v_intake.amount_cents, 0), 0)
         )::integer,
         refund_stripe_id = v_latest_refund_id,
         refunded_at = v_latest_refund_at,
         priority_fee_refunded_at = CASE
           WHEN v_priority_classification_complete THEN v_priority_fee_refunded_at
           ELSE intake.priority_fee_refunded_at
         END,
         refund_error = CASE
           WHEN v_latest_refund_status IN ('failed', 'canceled')
             THEN 'Stripe reported an exact refund balance reversal'
           ELSE NULL
         END,
         updated_at = pg_catalog.clock_timestamp()
   WHERE intake.id = p_intake_id;
  v_applied := FOUND;

  UPDATE public.payments AS payment
     SET status = CASE
           WHEN v_outstanding_dispute_cents > 0 THEN 'disputed'
           WHEN v_outstanding_refund_cents > 0 THEN 'refunded'
           ELSE 'paid'
         END,
         refund_status = CASE
           WHEN v_latest_refund_status IN ('failed', 'canceled')
             AND v_outstanding_refund_cents = 0 THEN 'failed'
           WHEN v_outstanding_refund_cents > 0 THEN 'refunded'
           WHEN v_latest_refund_status IN ('pending', 'requires_action') THEN 'processing'
           ELSE 'not_applicable'
         END,
         refund_amount = LEAST(
           v_outstanding_refund_cents,
           GREATEST(COALESCE(v_intake.amount_cents, 0), 0)
         )::integer,
         stripe_refund_id = v_latest_refund_id,
         refunded_at = v_latest_refund_at,
         updated_at = pg_catalog.clock_timestamp()
   WHERE payment.stripe_payment_intent_id = v_intake.stripe_payment_intent_id;

  RETURN pg_catalog.jsonb_build_object(
    'applied', v_applied,
    'intake_id', p_intake_id,
    'refund_amount_cents', LEAST(
      v_outstanding_refund_cents,
      GREATEST(COALESCE(v_intake.amount_cents, 0), 0)
    ),
    'outstanding_dispute_cents', v_outstanding_dispute_cents,
    'payment_status', v_payment_status,
    'refund_status', v_refund_status,
    'priority_fee_refunded_at', CASE
      WHEN v_priority_classification_complete THEN v_priority_fee_refunded_at
      ELSE v_intake.priority_fee_refunded_at
    END,
    'adjustment_at', v_latest_adjustment_at,
    'trigger_status_ignored', p_trigger_status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_intake_refund_cash_state(
  uuid, boolean, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_intake_refund_cash_state(
  uuid, boolean, text
) TO service_role;

COMMENT ON FUNCTION public.reconcile_intake_refund_cash_state(
  uuid, boolean, text
) IS
  'Reconciles exact refund cash and latest durable lifecycle evidence independent of webhook arrival order; service role only';

-- Health compares the local outstanding total to NET exact cash (successful
-- debits minus exact reversals) and fails closed in either direction.
CREATE OR REPLACE VIEW public.stripe_refund_ledger_health
WITH (security_invoker = true)
AS
WITH exact_refunds AS (
  SELECT
    movement.intake_id,
    COALESCE(sum(movement.amount_cents) FILTER (
      WHERE movement.refund_reversed_at IS NULL
    ), 0)::bigint AS exact_refund_cents
  FROM public.stripe_refund_cash_movements AS movement
  WHERE movement.livemode = true
    AND movement.intake_id IS NOT NULL
    AND movement.currency = 'aud'
  GROUP BY movement.intake_id
),
cumulative_health AS (
  SELECT
    count(*) FILTER (
      WHERE COALESCE(intake.refund_amount_cents, 0) <>
        COALESCE(exact_refund.exact_refund_cents, 0)
    )::bigint AS incomplete_intake_count,
    COALESCE(sum(abs(
      COALESCE(intake.refund_amount_cents, 0) -
        COALESCE(exact_refund.exact_refund_cents, 0)
    )), 0)::bigint AS unledgered_refund_cents
  FROM public.intakes AS intake
  LEFT JOIN exact_refunds AS exact_refund ON exact_refund.intake_id = intake.id
  WHERE COALESCE(intake.exclude_from_reporting, false) = false
),
conflict_health AS (
  SELECT count(*)::bigint AS conflicting_refund_count
  FROM public.stripe_refund_evidence_consistency AS consistency
  WHERE consistency.livemode = true
    AND NOT consistency.is_consistent
),
unlinked_health AS (
  SELECT
    count(*)::bigint AS unlinked_refund_count,
    COALESCE(sum(movement.amount_cents), 0)::bigint AS unlinked_refund_cents
  FROM public.stripe_refund_cash_movements AS movement
  WHERE movement.livemode = true
    AND movement.intake_id IS NULL
    AND movement.currency = 'aud'
    AND movement.refund_reversed_at IS NULL
), unsupported_currency_health AS (
  SELECT
    count(*)::bigint AS unsupported_currency_refund_count,
    COALESCE(sum(consistency.amount_cents), 0)::bigint
      AS unsupported_currency_refund_cents
  FROM public.stripe_refund_evidence_consistency AS consistency
  WHERE consistency.livemode = true
    AND consistency.is_consistent
    AND consistency.refund_cash_at IS NOT NULL
    AND consistency.currency <> 'aud'
), priority_classification_health AS (
  SELECT count(*)::bigint AS unknown_priority_classification_count
  FROM public.stripe_refund_evidence_consistency AS consistency
  WHERE consistency.livemode = true
    AND consistency.is_consistent
    AND consistency.refund_cash_at IS NOT NULL
    AND consistency.is_priority_fee_refund IS NULL
), dispute_health AS (
  SELECT
    count(*) FILTER (
      WHERE dispute.livemode = true
        AND dispute.intake_id IS NULL
        AND (
          dispute.dispute_status_event_id IS NOT NULL
          OR
          dispute.funds_withdrawn_at IS NOT NULL
          OR dispute.terminal_lost_at IS NOT NULL
        )
    )::bigint AS unlinked_live_dispute_count,
    COALESCE(sum(GREATEST(
      COALESCE(dispute.funds_withdrawn_cents, 0) -
        COALESCE(dispute.funds_reinstated_cents, 0),
      0
    )) FILTER (
      WHERE dispute.livemode = true
        AND dispute.intake_id IS NULL
    ), 0)::bigint AS unlinked_live_dispute_cents,
    count(*) FILTER (
      WHERE dispute.livemode IS NULL
        AND (
          dispute.dispute_status_event_id IS NOT NULL
          OR dispute.funds_withdrawn_event_id IS NOT NULL
          OR dispute.funds_reinstated_event_id IS NOT NULL
        )
    )::bigint AS unknown_mode_dispute_count,
    count(*) FILTER (
      WHERE dispute.livemode = true
        AND pg_catalog.lower(dispute.currency) <> 'aud'
        AND (
          dispute.dispute_status_event_id IS NOT NULL
          OR dispute.funds_withdrawn_event_id IS NOT NULL
          OR dispute.funds_reinstated_event_id IS NOT NULL
        )
    )::bigint AS unsupported_currency_dispute_count
  FROM public.stripe_disputes AS dispute
)
SELECT
  cumulative_health.incomplete_intake_count,
  cumulative_health.unledgered_refund_cents,
  conflict_health.conflicting_refund_count,
  unlinked_health.unlinked_refund_count,
  unlinked_health.unlinked_refund_cents,
  unsupported_currency_health.unsupported_currency_refund_count,
  unsupported_currency_health.unsupported_currency_refund_cents,
  priority_classification_health.unknown_priority_classification_count,
  dispute_health.unlinked_live_dispute_count,
  dispute_health.unlinked_live_dispute_cents,
  dispute_health.unknown_mode_dispute_count,
  dispute_health.unsupported_currency_dispute_count
FROM cumulative_health
CROSS JOIN conflict_health
CROSS JOIN unlinked_health
CROSS JOIN unsupported_currency_health
CROSS JOIN priority_classification_health
CROSS JOIN dispute_health;

REVOKE ALL ON public.stripe_refund_ledger_health
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.stripe_refund_ledger_health TO service_role;

COMMENT ON VIEW public.stripe_refund_ledger_health IS
  'Live-mode fail-closed comparison of local outstanding refunds to net exact cash in both directions';

-- Support refunds have a deliberately narrow live-money boundary: no more
-- than $100 per attempt and no more than three distinct attempts per actor in
-- a rolling 24-hour window. A dedicated ledger is required because
-- intakes.refunded_at is durable cash evidence, not an attempt timestamp, and
-- therefore cannot safely enforce this quota while a refund is pending or has
-- failed.
CREATE TABLE public.support_refund_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE RESTRICT,
  attempt_key text NOT NULL CHECK (
    pg_catalog.char_length(attempt_key) BETWEEN 1 AND 255
  ),
  amount_cents integer NOT NULL CHECK (amount_cents BETWEEN 1 AND 10000),
  attempted_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (actor_profile_id, attempt_key)
);

ALTER TABLE public.support_refund_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.support_refund_attempts
  FROM PUBLIC, anon, authenticated, service_role;

CREATE INDEX idx_support_refund_attempts_actor_window
  ON public.support_refund_attempts (actor_profile_id, attempted_at DESC);

COMMENT ON TABLE public.support_refund_attempts IS
  'Non-PHI ledger of support-role Stripe refund attempts used for the atomic rolling quota';

CREATE OR REPLACE FUNCTION public.reserve_support_refund_attempt(
  p_actor_profile_id uuid,
  p_intake_id uuid,
  p_attempt_key text,
  p_amount_cents integer
)
RETURNS TABLE(
  allowed boolean,
  denial_reason text,
  attempt_id uuid,
  recent_attempt_count integer,
  reused boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_role public.user_role;
  v_existing public.support_refund_attempts%ROWTYPE;
  v_recent_attempt_count integer;
  v_attempt_id uuid;
  v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF p_actor_profile_id IS NULL
     OR p_intake_id IS NULL
     OR NULLIF(pg_catalog.btrim(p_attempt_key), '') IS NULL
     OR pg_catalog.char_length(p_attempt_key) > 255
     OR p_amount_cents IS NULL
     OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Invalid support refund attempt reservation'
      USING ERRCODE = '22023';
  END IF;

  -- The actor row is the per-support-operator mutex. Parallel reservations
  -- for one actor serialize here before either counting or inserting.
  SELECT profile.role
    INTO v_actor_role
    FROM public.profiles AS profile
   WHERE profile.id = p_actor_profile_id
   FOR UPDATE;

  IF NOT FOUND OR v_actor_role <> 'support'::public.user_role THEN
    RAISE EXCEPTION 'Support refund actor not found'
      USING ERRCODE = '22023';
  END IF;

  -- Retrying the same Stripe idempotency generation is not a new money
  -- attempt. It reuses its original quota receipt after verifying that the
  -- immutable request details still match.
  SELECT attempt.*
    INTO v_existing
    FROM public.support_refund_attempts AS attempt
   WHERE attempt.actor_profile_id = p_actor_profile_id
     AND attempt.attempt_key = p_attempt_key
   FOR UPDATE;

  IF FOUND THEN
    IF v_existing.intake_id <> p_intake_id
       OR v_existing.amount_cents <> p_amount_cents THEN
      RAISE EXCEPTION 'Support refund attempt key conflicts with another request'
        USING ERRCODE = '22023';
    END IF;

    SELECT count(*)::integer
      INTO v_recent_attempt_count
      FROM public.support_refund_attempts AS attempt
     WHERE attempt.actor_profile_id = p_actor_profile_id
       AND attempt.attempted_at >= v_now - INTERVAL '24 hours';

    RETURN QUERY SELECT
      true,
      NULL::text,
      v_existing.id,
      v_recent_attempt_count,
      true;
    RETURN;
  END IF;

  SELECT count(*)::integer
    INTO v_recent_attempt_count
    FROM public.support_refund_attempts AS attempt
   WHERE attempt.actor_profile_id = p_actor_profile_id
     AND attempt.attempted_at >= v_now - INTERVAL '24 hours';

  IF p_amount_cents > 10000 THEN
    RETURN QUERY SELECT
      false,
      'amount_limit'::text,
      NULL::uuid,
      v_recent_attempt_count,
      false;
    RETURN;
  END IF;

  IF v_recent_attempt_count >= 3 THEN
    RETURN QUERY SELECT
      false,
      'attempt_limit'::text,
      NULL::uuid,
      v_recent_attempt_count,
      false;
    RETURN;
  END IF;

  INSERT INTO public.support_refund_attempts (
    actor_profile_id,
    intake_id,
    attempt_key,
    amount_cents,
    attempted_at
  ) VALUES (
    p_actor_profile_id,
    p_intake_id,
    p_attempt_key,
    p_amount_cents,
    v_now
  )
  RETURNING id INTO v_attempt_id;

  RETURN QUERY SELECT
    true,
    NULL::text,
    v_attempt_id,
    v_recent_attempt_count + 1,
    false;
END
$function$;

REVOKE ALL ON FUNCTION public.reserve_support_refund_attempt(uuid, uuid, text, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_support_refund_attempt(uuid, uuid, text, integer)
  TO service_role;

COMMENT ON FUNCTION public.reserve_support_refund_attempt(uuid, uuid, text, integer) IS
  'Atomically enforces the service-role-only support refund amount and rolling-attempt limits';
