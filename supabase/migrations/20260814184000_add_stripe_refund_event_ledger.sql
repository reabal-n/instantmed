-- Refund totals on intakes are cumulative snapshots. Preserve each exact
-- Stripe refund/event observation append-only so reporting can time partial
-- refunds and later top-ups independently without inventing a historical split.
-- Cash leaves and returns at the associated Stripe balance-transaction times,
-- not at Refund.created or webhook delivery time.

CREATE TABLE public.stripe_refund_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_key text NOT NULL UNIQUE,
  evidence_source text NOT NULL CHECK (evidence_source IN (
    'charge.refunded',
    'refund.created',
    'refund.failed',
    'refund.updated',
    'refund.list.backfill'
  )),
  stripe_event_id text,
  stripe_refund_id text NOT NULL,
  intake_id uuid,
  payment_intent_id text,
  charge_id text,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL CHECK (currency = lower(currency)),
  refund_status text,
  balance_transaction_id text,
  failure_balance_transaction_id text,
  refund_created_at timestamptz NOT NULL,
  refund_cash_at timestamptz,
  refund_reversed_at timestamptz,
  stripe_event_created_at timestamptz,
  livemode boolean NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stripe_refund_events_lifecycle_check CHECK (
    (balance_transaction_id IS NULL) = (refund_cash_at IS NULL)
    AND (failure_balance_transaction_id IS NULL) = (refund_reversed_at IS NULL)
    AND (refund_reversed_at IS NULL OR refund_cash_at IS NOT NULL)
    AND (refund_reversed_at IS NULL OR refund_reversed_at >= refund_cash_at)
  ),
  CONSTRAINT stripe_refund_events_source_identity_check CHECK (
    (
      evidence_source = 'refund.list.backfill'
      AND stripe_event_id IS NULL
      AND stripe_event_created_at IS NULL
      AND evidence_key =
        (CASE WHEN livemode THEN 'live' ELSE 'test' END) ||
        ':refund:' || stripe_refund_id
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
  )
);

CREATE INDEX idx_stripe_refund_events_refund_id
  ON public.stripe_refund_events (livemode, stripe_refund_id);
CREATE INDEX idx_stripe_refund_events_intake_id
  ON public.stripe_refund_events (intake_id)
  WHERE intake_id IS NOT NULL;
CREATE INDEX idx_stripe_refund_events_cash_at
  ON public.stripe_refund_events (refund_cash_at DESC)
  WHERE refund_cash_at IS NOT NULL;
CREATE INDEX idx_stripe_refund_events_reversed_at
  ON public.stripe_refund_events (refund_reversed_at DESC)
  WHERE refund_reversed_at IS NOT NULL;

ALTER TABLE public.stripe_refund_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.stripe_refund_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.stripe_refund_events TO service_role;

COMMENT ON TABLE public.stripe_refund_events IS
  'Append-only Stripe refund observations; never updated from cumulative intake refund fields';

-- A Refund id has immutable amount/currency/created fields. Linkage and balance
-- transaction fields may be absent in an early observation, but every non-null
-- observation must agree. A conflict fails closed instead of selecting a
-- preferred row and silently rewriting cash history.
CREATE VIEW public.stripe_refund_evidence_consistency
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
  ) AS is_consistent
FROM public.stripe_refund_events AS refund_event
GROUP BY refund_event.livemode, refund_event.stripe_refund_id;

REVOKE ALL ON public.stripe_refund_evidence_consistency
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.stripe_refund_evidence_consistency TO service_role;

COMMENT ON VIEW public.stripe_refund_evidence_consistency IS
  'One immutable-field consistency verdict per Stripe refund id and mode';

CREATE VIEW public.stripe_refund_cash_movements
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
  intake.patient_id
FROM public.stripe_refund_evidence_consistency AS consistency
LEFT JOIN public.intakes AS intake ON intake.id = consistency.intake_id
WHERE consistency.is_consistent
  AND consistency.refund_cash_at IS NOT NULL;

REVOKE ALL ON public.stripe_refund_cash_movements
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.stripe_refund_cash_movements TO service_role;

COMMENT ON VIEW public.stripe_refund_cash_movements IS
  'One exact refund cash movement and optional reversal per consistent Stripe refund id';

-- Recompute the intake's aggregate refund/payment state only from consistent,
-- exact balance evidence. The intake row lock serialises out-of-order or
-- concurrent refund observations; a retry simply derives the same state.
CREATE OR REPLACE FUNCTION public.reconcile_intake_refund_cash_state(
  p_intake_id uuid,
  p_livemode boolean,
  p_trigger_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_intake public.intakes%ROWTYPE;
  v_evidenced_refund_cents bigint := 0;
  v_outstanding_refund_cents bigint := 0;
  v_outstanding_dispute_cents bigint := 0;
  v_latest_refund_id text;
  v_latest_refund_at timestamptz;
  v_payment_status text;
  v_refund_status public.refund_status;
BEGIN
  SELECT intake.*
    INTO v_intake
    FROM public.intakes AS intake
   WHERE intake.id = p_intake_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund intake not found'
      USING ERRCODE = 'P0002';
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

  SELECT
    COALESCE(sum(movement.amount_cents), 0),
    COALESCE(sum(movement.amount_cents) FILTER (
      WHERE movement.refund_reversed_at IS NULL
    ), 0)
    INTO v_evidenced_refund_cents, v_outstanding_refund_cents
    FROM public.stripe_refund_cash_movements AS movement
   WHERE movement.livemode = p_livemode
     AND movement.intake_id = p_intake_id
     AND movement.currency = 'aud';

  -- A pending refund with no balance movement changes no intake cash state.
  IF v_evidenced_refund_cents = 0 THEN
    RETURN pg_catalog.jsonb_build_object(
      'applied', false,
      'intake_id', p_intake_id,
      'refund_amount_cents', v_intake.refund_amount_cents,
      'payment_status', v_intake.payment_status
    );
  END IF;

  IF v_evidenced_refund_cents < COALESCE(v_intake.refund_amount_cents, 0) THEN
    RAISE EXCEPTION 'Exact refund evidence does not cover cumulative intake refunds'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT movement.stripe_refund_id, movement.refund_cash_at
    INTO v_latest_refund_id, v_latest_refund_at
    FROM public.stripe_refund_cash_movements AS movement
   WHERE movement.livemode = p_livemode
     AND movement.intake_id = p_intake_id
     AND movement.currency = 'aud'
     AND movement.refund_reversed_at IS NULL
   ORDER BY movement.refund_cash_at DESC, movement.stripe_refund_id DESC
   LIMIT 1;

  SELECT COALESCE(sum(GREATEST(
    COALESCE(dispute.funds_withdrawn_cents, 0) -
      COALESCE(dispute.funds_reinstated_cents, 0),
    0
  )), 0)
    INTO v_outstanding_dispute_cents
    FROM public.stripe_disputes AS dispute
   WHERE dispute.intake_id = p_intake_id;

  v_payment_status := CASE
    WHEN v_outstanding_dispute_cents > 0 THEN 'disputed'
    WHEN COALESCE(v_intake.amount_cents, 0) > 0
      AND v_outstanding_refund_cents >= v_intake.amount_cents THEN 'refunded'
    WHEN v_outstanding_refund_cents > 0 THEN 'partially_refunded'
    ELSE 'paid'
  END;

  v_refund_status := CASE
    WHEN p_trigger_status IN ('failed', 'canceled') THEN 'failed'::public.refund_status
    WHEN p_trigger_status IN ('pending', 'requires_action') THEN 'pending'::public.refund_status
    WHEN v_outstanding_refund_cents > 0 THEN 'succeeded'::public.refund_status
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
         refund_error = CASE
           WHEN p_trigger_status IN ('failed', 'canceled')
             THEN 'Stripe reported an exact refund balance reversal'
           ELSE NULL
         END,
         updated_at = pg_catalog.clock_timestamp()
   WHERE intake.id = p_intake_id
     AND intake.payment_status IN (
       'paid',
       'partially_refunded',
       'refunded',
       'refund_processing',
       'refund_failed',
       'disputed'
     );

  RETURN pg_catalog.jsonb_build_object(
    'applied', FOUND,
    'intake_id', p_intake_id,
    'refund_amount_cents', LEAST(
      v_outstanding_refund_cents,
      GREATEST(COALESCE(v_intake.amount_cents, 0), 0)
    ),
    'outstanding_dispute_cents', v_outstanding_dispute_cents,
    'payment_status', v_payment_status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_intake_refund_cash_state(uuid, boolean, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_intake_refund_cash_state(uuid, boolean, text)
  TO service_role;

COMMENT ON FUNCTION public.reconcile_intake_refund_cash_state(uuid, boolean, text) IS
  'Idempotently reconciles one intake from consistent exact refund balance movements and all linked dispute cash';

-- Intakes do not carry a Stripe mode. This health row therefore owns live
-- production reporting only; test observations can neither satisfy nor poison
-- the production dashboard reconciliation.
CREATE VIEW public.stripe_refund_ledger_health
WITH (security_invoker = true)
AS
WITH exact_refunds AS (
  SELECT
    movement.intake_id,
    sum(movement.amount_cents)::bigint AS exact_refund_cents
  FROM public.stripe_refund_cash_movements AS movement
  WHERE movement.livemode = true
    AND movement.intake_id IS NOT NULL
    AND movement.currency = 'aud'
  GROUP BY movement.intake_id
),
cumulative_health AS (
  SELECT
    count(*) FILTER (
      WHERE COALESCE(intake.refund_amount_cents, 0) >
        COALESCE(exact_refund.exact_refund_cents, 0)
    )::bigint AS incomplete_intake_count,
    COALESCE(sum(
      GREATEST(
        COALESCE(intake.refund_amount_cents, 0) -
          COALESCE(exact_refund.exact_refund_cents, 0),
        0
      )
    ), 0)::bigint AS unledgered_refund_cents
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
)
SELECT
  cumulative_health.incomplete_intake_count,
  cumulative_health.unledgered_refund_cents,
  conflict_health.conflicting_refund_count,
  unlinked_health.unlinked_refund_count,
  unlinked_health.unlinked_refund_cents
FROM cumulative_health
CROSS JOIN conflict_health
CROSS JOIN unlinked_health;

REVOKE ALL ON public.stripe_refund_ledger_health
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.stripe_refund_ledger_health TO service_role;

COMMENT ON VIEW public.stripe_refund_ledger_health IS
  'Aggregate-only live-mode fail-closed check for missing, conflicting, or unlinked exact refund evidence';
