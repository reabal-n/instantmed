-- Harden refund creation around one durable attempt per intake. Stripe API
-- acceptance is not cash evidence: attempts own external-call ambiguity while
-- append-only balance evidence remains the sole authority for cash mirrors.

-- API reconciliation is a point-in-time Stripe Refund observation, not a
-- webhook. It therefore has no Stripe event id/time and uses the same immutable
-- observation-key shape as the existing bounded backfill.
ALTER TABLE public.stripe_refund_events
  DROP CONSTRAINT IF EXISTS stripe_refund_events_evidence_source_check;
ALTER TABLE public.stripe_refund_events
  ADD CONSTRAINT stripe_refund_events_evidence_source_check CHECK (
    evidence_source IN (
      'charge.refunded',
      'refund.created',
      'refund.failed',
      'refund.updated',
      'refund.list.backfill',
      'refund.api.reconcile'
    )
  );

ALTER TABLE public.stripe_refund_events
  DROP CONSTRAINT IF EXISTS stripe_refund_events_source_identity_check;
ALTER TABLE public.stripe_refund_events
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
      evidence_source = 'refund.api.reconcile'
      AND stripe_event_id IS NULL
      AND stripe_event_created_at IS NULL
      AND evidence_key =
        (CASE WHEN livemode THEN 'live' ELSE 'test' END) ||
        ':refund:' || stripe_refund_id ||
        ':api:' || COALESCE(balance_transaction_id, 'none') || ':' ||
        COALESCE(failure_balance_transaction_id, 'none') || ':' ||
        COALESCE(refund_status, 'unknown')
    )
    OR
    (
      evidence_source NOT IN ('refund.list.backfill', 'refund.api.reconcile')
      AND stripe_event_id IS NOT NULL
      AND stripe_event_created_at IS NOT NULL
      AND evidence_key =
        (CASE WHEN livemode THEN 'live' ELSE 'test' END) ||
        ':event:' || stripe_event_id || ':refund:' || stripe_refund_id
    )
  );

-- A declined intake is a durable refund obligation even if the process dies
-- before the first Stripe API reservation. Capture the runtime credential mode
-- in the same atomic decline update; never infer it later from a runner.
ALTER TABLE public.intakes
  ADD COLUMN refund_obligation_livemode boolean;

COMMENT ON COLUMN public.intakes.refund_obligation_livemode IS
  'Authoritative Stripe mode captured atomically when a refundable intake is declined; null legacy rows require manual review';

CREATE INDEX idx_intakes_decline_refund_obligation_mode
  ON public.intakes (refund_obligation_livemode, updated_at, id)
  WHERE status = 'declined'
    AND payment_status IN ('paid', 'partially_refunded');

CREATE TABLE public.stripe_refund_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE RESTRICT,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  payment_intent_id text NOT NULL,
  livemode boolean NOT NULL,
  refund_type text NOT NULL CHECK (refund_type IN (
    'admin_manual',
    'decline',
    'priority_breach',
    'standalone',
    'standalone_topup'
  )),
  target_total_cents integer NOT NULL CHECK (target_total_cents > 0),
  requested_amount_cents integer NOT NULL CHECK (requested_amount_cents > 0),
  generation smallint NOT NULL DEFAULT 1 CHECK (generation IN (1, 2)),
  retry_of_attempt_id uuid REFERENCES public.stripe_refund_attempts(id)
    ON DELETE RESTRICT,
  idempotency_key text NOT NULL UNIQUE,
  lease_token uuid,
  lease_expires_at timestamptz,
  next_check_at timestamptz,
  stripe_refund_id text,
  stripe_status text,
  state text NOT NULL DEFAULT 'reserved' CHECK (state IN (
    'reserved',
    'submitted',
    'unknown_outcome',
    'manual_review',
    'succeeded',
    'failed',
    'canceled'
  )),
  last_error text,
  submitted_at timestamptz,
  terminal_at timestamptz,
  downstream_finalized_at timestamptz,
  downstream_manual_review_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT stripe_refund_attempts_amount_check CHECK (
    requested_amount_cents <= target_total_cents
  ),
  CONSTRAINT stripe_refund_attempts_retry_link_check CHECK (
    (generation = 1 AND retry_of_attempt_id IS NULL)
    OR (generation = 2 AND retry_of_attempt_id IS NOT NULL)
  ),
  CONSTRAINT stripe_refund_attempts_idempotency_key_check CHECK (
    idempotency_key = 'refund-attempt:' || id::text
  ),
  CONSTRAINT stripe_refund_attempts_lease_check CHECK (
    (lease_token IS NULL) = (lease_expires_at IS NULL)
  ),
  CONSTRAINT stripe_refund_attempts_stripe_status_check CHECK (
    stripe_status IS NULL OR stripe_status IN (
      'pending', 'requires_action', 'succeeded', 'failed', 'canceled'
    )
  ),
  CONSTRAINT stripe_refund_attempts_downstream_finalized_check CHECK (
    downstream_finalized_at IS NULL
    OR state IN ('succeeded', 'failed', 'canceled')
  ),
  CONSTRAINT stripe_refund_attempts_downstream_manual_review_check CHECK (
    downstream_manual_review_at IS NULL
    OR (
      state IN ('succeeded', 'failed', 'canceled')
      AND stripe_refund_id IS NOT NULL
      AND downstream_finalized_at IS NULL
    )
  )
);

-- An intake can have many historical partial/top-up generations, but only one
-- unresolved external-money target at a time. This serializes priority-fee
-- then decline-top-up ordering without treating either as the global refund.
CREATE UNIQUE INDEX idx_stripe_refund_attempts_one_active_intake
  ON public.stripe_refund_attempts (livemode, intake_id)
  WHERE state IN ('reserved', 'submitted', 'unknown_outcome', 'manual_review');

-- The static cross-intake checks provide stable errors; this unique index is
-- the race-proof backstop when two workers concurrently target the same PI.
CREATE UNIQUE INDEX idx_stripe_refund_attempts_one_active_payment_intent
  ON public.stripe_refund_attempts (livemode, payment_intent_id)
  WHERE state IN ('reserved', 'submitted', 'unknown_outcome', 'manual_review');

CREATE UNIQUE INDEX idx_stripe_refund_attempts_business_generation
  ON public.stripe_refund_attempts (
    livemode,
    intake_id,
    refund_type,
    target_total_cents,
    generation
  );

CREATE INDEX idx_stripe_refund_attempts_recovery_due
  ON public.stripe_refund_attempts (next_check_at, created_at)
  WHERE state IN ('reserved', 'submitted', 'unknown_outcome')
     OR (
       state IN ('succeeded', 'failed', 'canceled')
       AND downstream_finalized_at IS NULL
       AND downstream_manual_review_at IS NULL
     );

CREATE INDEX idx_stripe_refund_attempts_intake_history
  ON public.stripe_refund_attempts (intake_id, created_at DESC);

CREATE INDEX idx_stripe_refund_attempts_actor_history
  ON public.stripe_refund_attempts (actor_profile_id, created_at DESC)
  WHERE actor_profile_id IS NOT NULL;

CREATE INDEX idx_stripe_refund_attempts_retry_parent
  ON public.stripe_refund_attempts (retry_of_attempt_id)
  WHERE retry_of_attempt_id IS NOT NULL;

CREATE UNIQUE INDEX idx_stripe_refund_attempts_refund_id
  ON public.stripe_refund_attempts (livemode, stripe_refund_id)
  WHERE stripe_refund_id IS NOT NULL;

ALTER TABLE public.stripe_refund_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stripe_refund_attempts
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.stripe_refund_attempts TO service_role;

COMMENT ON TABLE public.stripe_refund_attempts IS
  'Service-role-only ledger for one Stripe Refund.create generation and its ambiguous external outcome';

-- One current lifecycle observation per Refund id. Event time, not delivery
-- order, wins inside each Refund; aggregate intake state is reduced later from
-- all of these per-refund rows plus all open attempts.
CREATE OR REPLACE VIEW public.stripe_refund_current_lifecycle
WITH (security_invoker = true)
AS
WITH ranked_observations AS (
  SELECT
    refund_event.*,
    pg_catalog.row_number() OVER (
      PARTITION BY refund_event.livemode, refund_event.stripe_refund_id
      ORDER BY
        CASE
          WHEN refund_event.evidence_source IN (
            'refund.created', 'refund.updated', 'refund.failed'
          ) THEN refund_event.stripe_event_created_at
          ELSE GREATEST(
            refund_event.refund_reversed_at,
            refund_event.refund_cash_at,
            refund_event.refund_created_at
          )
        END DESC NULLS LAST,
        CASE refund_event.refund_status
          WHEN 'failed' THEN 50
          WHEN 'canceled' THEN 50
          WHEN 'succeeded' THEN 40
          WHEN 'requires_action' THEN 30
          WHEN 'pending' THEN 30
          ELSE 10
        END DESC,
        refund_event.evidence_key DESC
    ) AS lifecycle_rank
  FROM public.stripe_refund_events AS refund_event
)
SELECT
  observation.livemode,
  observation.stripe_refund_id,
  COALESCE(consistency.intake_id, attempt.intake_id) AS intake_id,
  COALESCE(consistency.payment_intent_id, attempt.payment_intent_id)
    AS payment_intent_id,
  consistency.charge_id,
  consistency.amount_cents,
  consistency.currency,
  consistency.refund_created_at,
  consistency.refund_cash_at,
  consistency.refund_reversed_at,
  consistency.is_priority_fee_refund,
  observation.refund_status,
  CASE
    WHEN observation.evidence_source IN (
      'refund.created', 'refund.updated', 'refund.failed'
    ) THEN observation.stripe_event_created_at
    ELSE GREATEST(
      observation.refund_reversed_at,
      observation.refund_cash_at,
      observation.refund_created_at
    )
  END AS lifecycle_at,
  (
    consistency.is_consistent
    AND (
      consistency.intake_id IS NULL
      OR attempt.intake_id IS NULL
      OR consistency.intake_id = attempt.intake_id
    )
    AND (
      consistency.payment_intent_id IS NULL
      OR attempt.payment_intent_id IS NULL
      OR consistency.payment_intent_id = attempt.payment_intent_id
    )
  ) AS is_consistent
FROM ranked_observations AS observation
JOIN public.stripe_refund_evidence_consistency AS consistency
  ON consistency.livemode = observation.livemode
 AND consistency.stripe_refund_id = observation.stripe_refund_id
LEFT JOIN public.stripe_refund_attempts AS attempt
  ON attempt.livemode = observation.livemode
 AND attempt.stripe_refund_id = observation.stripe_refund_id
WHERE observation.lifecycle_rank = 1;

REVOKE ALL ON TABLE public.stripe_refund_current_lifecycle
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.stripe_refund_current_lifecycle TO service_role;

COMMENT ON VIEW public.stripe_refund_current_lifecycle IS
  'Latest durable lifecycle observation per Stripe refund id, with attempt linkage enrichment';

CREATE OR REPLACE FUNCTION public.reserve_stripe_refund_attempt(
  p_actor_profile_id uuid,
  p_intake_id uuid,
  p_payment_intent_id text,
  p_livemode boolean,
  p_refund_type text,
  p_target_total_cents integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_role text;
  v_attempt_id uuid;
  v_cash_refund_cents bigint := 0;
  v_existing public.stripe_refund_attempts%ROWTYPE;
  v_generation smallint := 1;
  v_has_predecessor boolean := false;
  v_idempotency_key text;
  v_intake public.intakes%ROWTYPE;
  v_lease_expires_at timestamptz;
  v_lease_token uuid;
  v_predecessor public.stripe_refund_attempts%ROWTYPE;
  v_quota_allowed boolean;
  v_quota_denial_reason text;
  v_requested_amount_cents integer;
  v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF p_intake_id IS NULL
     OR NULLIF(pg_catalog.btrim(p_payment_intent_id), '') IS NULL
     OR p_livemode IS NULL
     OR NULLIF(pg_catalog.btrim(p_refund_type), '') IS NULL
     OR p_refund_type NOT IN (
       'admin_manual',
       'decline',
       'priority_breach',
       'standalone',
       'standalone_topup'
     )
     OR p_target_total_cents IS NULL
     OR p_target_total_cents <= 0 THEN
    RAISE EXCEPTION 'Invalid Stripe refund attempt reservation'
      USING ERRCODE = '22023';
  END IF;

  -- Preserve the existing support quota lock order: actor first, intake next.
  -- The nested quota RPC re-locks this same actor row in this transaction.
  IF p_actor_profile_id IS NOT NULL THEN
    SELECT profile.role
      INTO v_actor_role
      FROM public.profiles AS profile
     WHERE profile.id = p_actor_profile_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stripe refund actor not found'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT intake.*
    INTO v_intake
    FROM public.intakes AS intake
   WHERE intake.id = p_intake_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stripe refund intake not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_intake.payment_status NOT IN ('paid', 'partially_refunded') THEN
    RAISE EXCEPTION 'Intake payment state is not refundable: %',
      COALESCE(v_intake.payment_status, 'null')
      USING ERRCODE = '22023';
  END IF;

  IF p_refund_type = 'decline'
     AND v_intake.refund_obligation_livemode IS NULL THEN
    RAISE EXCEPTION 'refund_obligation_livemode_missing'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_refund_type = 'decline'
     AND v_intake.refund_obligation_livemode <> p_livemode THEN
    RAISE EXCEPTION 'refund_obligation_livemode_conflict'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_intake.stripe_payment_intent_id IS NOT NULL
     AND v_intake.stripe_payment_intent_id <> p_payment_intent_id THEN
    RAISE EXCEPTION 'Refund PaymentIntent conflicts with the intake binding'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.intakes AS other_intake
     WHERE other_intake.id <> p_intake_id
       AND (
         other_intake.stripe_payment_intent_id = p_payment_intent_id
         OR EXISTS (
           SELECT 1
             FROM public.payments AS other_payment
            WHERE other_payment.stripe_payment_intent_id = p_payment_intent_id
              AND (
                other_payment.intake_id = other_intake.id
                OR (
                  other_intake.payment_id IS NOT NULL
                  AND other_payment.stripe_session_id = other_intake.payment_id
                )
              )
         )
       )
    UNION ALL
    SELECT 1
      FROM public.stripe_refund_attempts AS other_attempt
     WHERE other_attempt.livemode = p_livemode
       AND other_attempt.payment_intent_id = p_payment_intent_id
       AND other_attempt.intake_id <> p_intake_id
    UNION ALL
    SELECT 1
      FROM public.stripe_refund_events AS other_evidence
     WHERE other_evidence.livemode = p_livemode
       AND other_evidence.payment_intent_id = p_payment_intent_id
       AND other_evidence.intake_id IS NOT NULL
       AND other_evidence.intake_id <> p_intake_id
  ) THEN
    RAISE EXCEPTION 'refund_payment_intent_intake_conflict'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_intake.amount_cents IS NULL
     OR v_intake.amount_cents <= 0
     OR p_target_total_cents > v_intake.amount_cents THEN
    RAISE EXCEPTION 'Refund target exceeds the authoritative charged amount'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.stripe_refund_events AS evidence
     WHERE evidence.livemode <> p_livemode
       AND (
         evidence.intake_id = p_intake_id
         OR evidence.payment_intent_id = p_payment_intent_id
       )
    UNION ALL
    SELECT 1
      FROM public.stripe_refund_attempts AS attempt
     WHERE attempt.livemode <> p_livemode
       AND (
         attempt.intake_id = p_intake_id
         OR attempt.payment_intent_id = p_payment_intent_id
       )
  ) THEN
    RAISE EXCEPTION 'refund_attempt_livemode_conflict'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT attempt.*
    INTO v_existing
    FROM public.stripe_refund_attempts AS attempt
   WHERE attempt.livemode = p_livemode
     AND attempt.intake_id = p_intake_id
     AND attempt.state IN (
       'reserved', 'submitted', 'unknown_outcome', 'manual_review'
     )
   FOR UPDATE;

  IF FOUND THEN
    IF v_existing.state = 'manual_review' THEN
      RAISE EXCEPTION 'refund_attempt_manual_review_required'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_existing.payment_intent_id <> p_payment_intent_id
       OR v_existing.refund_type <> p_refund_type
       OR v_existing.target_total_cents <> p_target_total_cents THEN
      RAISE EXCEPTION 'refund_attempt_active_conflict'
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.intakes AS intake
       SET refund_status = 'pending'::public.refund_status,
           refund_error = NULL,
           updated_at = v_now
     WHERE intake.id = p_intake_id;

    UPDATE public.payments AS payment
       SET refund_status = 'processing',
           updated_at = v_now
     WHERE payment.intake_id = p_intake_id
       AND payment.stripe_payment_intent_id = p_payment_intent_id;

    RETURN pg_catalog.jsonb_build_object(
      'active', true,
      'matches_request', true,
      'outcome', 'active',
      'reserved', false,
      'attempt_id', v_existing.id,
      'lease_token', v_existing.lease_token,
      'idempotency_key', v_existing.idempotency_key,
      'requested_amount_cents', v_existing.requested_amount_cents
    );
  END IF;

  SELECT COALESCE(sum(movement.amount_cents), 0)
    INTO v_cash_refund_cents
    FROM public.stripe_refund_cash_movements AS movement
   WHERE movement.livemode = p_livemode
     AND movement.currency = 'aud'
     AND movement.refund_reversed_at IS NULL
     AND (
       movement.intake_id = p_intake_id
       OR movement.payment_intent_id = p_payment_intent_id
     );

  IF v_cash_refund_cents < COALESCE(v_intake.refund_amount_cents, 0) THEN
    RAISE EXCEPTION 'Exact refund evidence does not cover the intake cash mirror'
      USING ERRCODE = 'P0001';
  END IF;

  v_requested_amount_cents := p_target_total_cents - v_cash_refund_cents;
  IF v_requested_amount_cents <= 0 THEN
    RETURN pg_catalog.jsonb_build_object(
      'active', false,
      'matches_request', true,
      'outcome', 'cash_satisfied',
      'reserved', false,
      'attempt_id', NULL,
      'lease_token', NULL,
      'idempotency_key', NULL,
      'requested_amount_cents', 0
    );
  END IF;

  SELECT attempt.*
    INTO v_predecessor
    FROM public.stripe_refund_attempts AS attempt
   WHERE attempt.livemode = p_livemode
     AND attempt.intake_id = p_intake_id
     AND attempt.refund_type = p_refund_type
     AND attempt.target_total_cents = p_target_total_cents
   ORDER BY attempt.generation DESC
   LIMIT 1
   FOR UPDATE;
  v_has_predecessor := FOUND;

  IF v_has_predecessor THEN
    IF v_predecessor.payment_intent_id <> p_payment_intent_id THEN
      RAISE EXCEPTION 'refund_attempt_business_target_conflict'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_predecessor.generation >= 2 THEN
      RAISE EXCEPTION 'refund_attempt_retry_limit'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_predecessor.state NOT IN ('failed', 'canceled')
       OR v_predecessor.stripe_refund_id IS NULL
       OR NOT EXISTS (
         SELECT 1
           FROM public.stripe_refund_current_lifecycle AS lifecycle
          WHERE lifecycle.livemode = v_predecessor.livemode
            AND lifecycle.stripe_refund_id = v_predecessor.stripe_refund_id
            AND lifecycle.is_consistent
            AND (
              lifecycle.refund_reversed_at IS NOT NULL
              OR lifecycle.refund_status IN ('failed', 'canceled')
            )
       ) THEN
      RAISE EXCEPTION 'refund_attempt_retry_not_ready'
        USING ERRCODE = 'P0001';
    END IF;
    v_generation := 2;
  END IF;

  v_attempt_id := gen_random_uuid();
  v_lease_token := gen_random_uuid();
  v_idempotency_key := 'refund-attempt:' || v_attempt_id::text;
  v_lease_expires_at := v_now + INTERVAL '2 minutes';

  IF v_actor_role = 'support' THEN
    -- Every external Stripe mutation generation is a distinct policy attempt.
    -- The new idempotency key makes the nested quota receipt itself idempotent
    -- without letting a failed predecessor bypass the rolling attempt cap.
    SELECT quota.allowed, quota.denial_reason
      INTO v_quota_allowed, v_quota_denial_reason
      FROM public.reserve_support_refund_attempt(
        p_actor_profile_id,
        p_intake_id,
        v_idempotency_key,
        v_requested_amount_cents
      ) AS quota;

    IF NOT COALESCE(v_quota_allowed, false) THEN
      IF v_quota_denial_reason = 'amount_limit' THEN
        RAISE EXCEPTION 'support_refund_amount_limit'
          USING ERRCODE = 'P0001';
      END IF;
      IF v_quota_denial_reason = 'attempt_limit' THEN
        RAISE EXCEPTION 'support_refund_attempt_limit'
          USING ERRCODE = 'P0001';
      END IF;
      RAISE EXCEPTION 'Support refund quota reservation failed'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.stripe_refund_attempts (
    id,
    intake_id,
    actor_profile_id,
    payment_intent_id,
    livemode,
    refund_type,
    target_total_cents,
    requested_amount_cents,
    generation,
    retry_of_attempt_id,
    idempotency_key,
    lease_token,
    lease_expires_at,
    next_check_at,
    state,
    created_at,
    updated_at
  ) VALUES (
    v_attempt_id,
    p_intake_id,
    p_actor_profile_id,
    p_payment_intent_id,
    p_livemode,
    p_refund_type,
    p_target_total_cents,
    v_requested_amount_cents,
    v_generation,
    CASE WHEN v_generation = 2 THEN v_predecessor.id ELSE NULL END,
    v_idempotency_key,
    v_lease_token,
    v_lease_expires_at,
    v_lease_expires_at,
    'reserved',
    v_now,
    v_now
  );

  -- Project only the accepted attempt lifecycle into operator-facing mirrors.
  -- Exact cash totals and payment_status remain evidence/reconciliation-owned.
  UPDATE public.intakes AS intake
     SET refund_status = 'pending'::public.refund_status,
         refund_error = NULL,
         updated_at = v_now
   WHERE intake.id = p_intake_id;

  UPDATE public.payments AS payment
     SET refund_status = 'processing',
         updated_at = v_now
   WHERE payment.intake_id = p_intake_id
     AND payment.stripe_payment_intent_id = p_payment_intent_id;

  RETURN pg_catalog.jsonb_build_object(
    'active', true,
    'matches_request', true,
    'outcome', 'reserved',
    'reserved', true,
    'attempt_id', v_attempt_id,
    'lease_token', v_lease_token,
    'idempotency_key', v_idempotency_key,
    'requested_amount_cents', v_requested_amount_cents
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_stripe_refund_attempt(
  uuid, uuid, text, boolean, text, integer
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_stripe_refund_attempt(
  uuid, uuid, text, boolean, text, integer
) TO service_role;

COMMENT ON FUNCTION public.reserve_stripe_refund_attempt(
  uuid, uuid, text, boolean, text, integer
) IS
  'Atomically reserves one exact remaining refund target and preserves support-role quotas before Stripe';

CREATE OR REPLACE FUNCTION public.complete_stripe_refund_attempt(
  p_attempt_id uuid,
  p_lease_token uuid,
  p_stripe_refund_id text,
  p_stripe_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_applied boolean := false;
  v_attempt public.stripe_refund_attempts%ROWTYPE;
  v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF p_attempt_id IS NULL
     OR p_lease_token IS NULL
     OR NULLIF(pg_catalog.btrim(p_stripe_refund_id), '') IS NULL
     OR NULLIF(pg_catalog.btrim(p_stripe_status), '') IS NULL
     OR p_stripe_status NOT IN (
       'pending', 'requires_action', 'succeeded', 'failed', 'canceled'
     ) THEN
    RAISE EXCEPTION 'Invalid Stripe refund attempt completion'
      USING ERRCODE = '22023';
  END IF;

  SELECT attempt.*
    INTO v_attempt
    FROM public.stripe_refund_attempts AS attempt
   WHERE attempt.id = p_attempt_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_attempt.stripe_refund_id IS NOT NULL
     AND v_attempt.stripe_refund_id <> p_stripe_refund_id THEN
    RAISE EXCEPTION 'Refund attempt is already bound to another Stripe refund'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.stripe_refund_attempts AS attempt
     SET stripe_refund_id = p_stripe_refund_id,
         stripe_status = p_stripe_status,
         -- Refund.create is request acceptance, never cash settlement. Keep
         -- this generation active until webhook/API evidence is durable.
         state = 'submitted',
         submitted_at = COALESCE(attempt.submitted_at, v_now),
         terminal_at = NULL,
         lease_token = NULL,
         lease_expires_at = NULL,
         next_check_at = v_now + INTERVAL '5 minutes',
         last_error = NULL,
         updated_at = v_now
   WHERE attempt.id = p_attempt_id
     AND attempt.lease_token = p_lease_token
     AND attempt.state IN ('reserved', 'submitted', 'unknown_outcome')
  RETURNING true INTO v_applied;

  RETURN COALESCE(v_applied, false);
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_stripe_refund_attempt(
  uuid, uuid, text, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_stripe_refund_attempt(
  uuid, uuid, text, text
) TO service_role;

COMMENT ON FUNCTION public.complete_stripe_refund_attempt(
  uuid, uuid, text, text
) IS
  'Attempt-and-lease CAS binding of a validated Stripe Refund.create response';

CREATE OR REPLACE FUNCTION public.complete_stripe_refund_attempt_error(
  p_attempt_id uuid,
  p_lease_token uuid,
  p_outcome text,
  p_error text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_applied boolean := false;
  v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF p_attempt_id IS NULL
     OR p_lease_token IS NULL
     OR NULLIF(pg_catalog.btrim(p_outcome), '') IS NULL
     OR p_outcome NOT IN ('unknown_outcome', 'manual_review')
     OR NULLIF(pg_catalog.btrim(p_error), '') IS NULL THEN
    RAISE EXCEPTION 'Invalid Stripe refund attempt error completion'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.stripe_refund_attempts AS attempt
     SET state = CASE
           WHEN attempt.state IN ('succeeded', 'failed', 'canceled')
             THEN attempt.state
           ELSE p_outcome
         END,
         last_error = pg_catalog.left(p_error, 1000),
         lease_token = NULL,
         lease_expires_at = NULL,
         next_check_at = CASE
           WHEN p_outcome = 'unknown_outcome' THEN v_now + INTERVAL '5 minutes'
           ELSE NULL
         END,
         downstream_manual_review_at = CASE
           WHEN attempt.state IN ('succeeded', 'failed', 'canceled')
             AND p_outcome = 'manual_review'
             THEN v_now
           ELSE attempt.downstream_manual_review_at
         END,
         updated_at = v_now
   WHERE attempt.id = p_attempt_id
     AND attempt.lease_token = p_lease_token
     AND (
       attempt.state IN ('reserved', 'submitted', 'unknown_outcome')
       OR (
         attempt.state IN ('succeeded', 'failed', 'canceled')
         AND attempt.stripe_refund_id IS NOT NULL
         AND attempt.downstream_finalized_at IS NULL
         AND attempt.downstream_manual_review_at IS NULL
       )
     )
  RETURNING true INTO v_applied;

  RETURN COALESCE(v_applied, false);
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_stripe_refund_attempt_error(
  uuid, uuid, text, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_stripe_refund_attempt_error(
  uuid, uuid, text, text
) TO service_role;

COMMENT ON FUNCTION public.complete_stripe_refund_attempt_error(
  uuid, uuid, text, text
) IS
  'Records ambiguous Stripe transport outcomes on only the exact leased attempt';

-- The webhook is independent evidence and may bind the attempt before the API
-- caller receives Refund.create. It cross-checks immutable identities but does
-- not need the creator lease.
CREATE OR REPLACE FUNCTION public.bind_stripe_refund_attempt_from_webhook(
  p_attempt_id uuid,
  p_stripe_refund_id text,
  p_stripe_status text,
  p_payment_intent_id text,
  p_livemode boolean,
  p_intake_id uuid,
  p_refund_type text,
  p_amount_cents integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_applied boolean := false;
  v_attempt public.stripe_refund_attempts%ROWTYPE;
  v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF p_attempt_id IS NULL
     OR NULLIF(pg_catalog.btrim(p_stripe_refund_id), '') IS NULL
     OR NULLIF(pg_catalog.btrim(p_payment_intent_id), '') IS NULL
     OR p_livemode IS NULL
     OR p_intake_id IS NULL
     OR NULLIF(pg_catalog.btrim(p_refund_type), '') IS NULL
     OR p_refund_type NOT IN (
       'admin_manual',
       'decline',
       'priority_breach',
       'standalone',
       'standalone_topup'
     )
     OR p_amount_cents IS NULL
     OR p_amount_cents <= 0
     OR NULLIF(pg_catalog.btrim(p_stripe_status), '') IS NULL
     OR p_stripe_status NOT IN (
       'pending', 'requires_action', 'succeeded', 'failed', 'canceled'
     ) THEN
    RAISE EXCEPTION 'Invalid Stripe refund webhook attempt binding'
      USING ERRCODE = '22023';
  END IF;

  SELECT attempt.*
    INTO v_attempt
    FROM public.stripe_refund_attempts AS attempt
   WHERE attempt.id = p_attempt_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_attempt.payment_intent_id <> p_payment_intent_id
     OR v_attempt.livemode <> p_livemode
     OR v_attempt.intake_id <> p_intake_id
     OR v_attempt.refund_type <> p_refund_type
     OR v_attempt.requested_amount_cents <> p_amount_cents THEN
    RAISE EXCEPTION 'refund_attempt_webhook_identity_conflict'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_attempt.stripe_refund_id IS NOT NULL
     AND v_attempt.stripe_refund_id <> p_stripe_refund_id THEN
    RAISE EXCEPTION 'Refund webhook id conflicts with attempt'
      USING ERRCODE = 'P0001';
  END IF;

  -- Bind-before-upsert must be replay-safe. A terminal attempt means an
  -- earlier delivery already persisted and reconciled exact evidence. The
  -- same immutable PI/refund identity is therefore an idempotent success;
  -- lifecycle ordering belongs to the append-only evidence view, not here.
  IF v_attempt.state IN ('succeeded', 'failed', 'canceled') THEN
    RETURN true;
  END IF;

  UPDATE public.stripe_refund_attempts AS attempt
     SET stripe_refund_id = p_stripe_refund_id,
         stripe_status = p_stripe_status,
         -- A webhook object is not durable until its evidence insert commits.
         state = 'submitted',
         submitted_at = COALESCE(attempt.submitted_at, v_now),
         terminal_at = NULL,
         lease_token = NULL,
         lease_expires_at = NULL,
         next_check_at = v_now + INTERVAL '5 minutes',
         last_error = NULL,
         updated_at = v_now
   WHERE attempt.id = p_attempt_id
     AND attempt.payment_intent_id = p_payment_intent_id
     AND attempt.livemode = p_livemode
     AND attempt.intake_id = p_intake_id
     AND attempt.refund_type = p_refund_type
     AND attempt.requested_amount_cents = p_amount_cents
     AND (
       attempt.stripe_refund_id IS NULL
       OR attempt.stripe_refund_id = p_stripe_refund_id
     )
     AND attempt.state IN (
       'reserved', 'submitted', 'unknown_outcome', 'manual_review'
     )
  RETURNING true INTO v_applied;

  RETURN COALESCE(v_applied, false);
END;
$function$;

REVOKE ALL ON FUNCTION public.bind_stripe_refund_attempt_from_webhook(
  uuid, text, text, text, boolean, uuid, text, integer
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bind_stripe_refund_attempt_from_webhook(
  uuid, text, text, text, boolean, uuid, text, integer
) TO service_role;

COMMENT ON FUNCTION public.bind_stripe_refund_attempt_from_webhook(
  uuid, text, text, text, boolean, uuid, text, integer
) IS
  'Lease-free webhook winner path that exact-matches the immutable refund-attempt mutation identity';

CREATE OR REPLACE FUNCTION public.finalize_stripe_refund_attempt(
  p_attempt_id uuid,
  p_livemode boolean,
  p_stripe_refund_id text,
  p_expected_outcome text,
  p_expected_refund_cash_at timestamptz,
  p_expected_refund_reversed_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_attempt public.stripe_refund_attempts%ROWTYPE;
  v_lifecycle public.stripe_refund_current_lifecycle%ROWTYPE;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_terminal_state text;
BEGIN
  IF p_attempt_id IS NULL
     OR p_livemode IS NULL
     OR NULLIF(pg_catalog.btrim(p_stripe_refund_id), '') IS NULL
     OR p_expected_outcome IS NULL
     OR p_expected_outcome NOT IN ('succeeded', 'failed')
     OR (
       p_expected_outcome = 'succeeded'
       AND (
         p_expected_refund_cash_at IS NULL
         OR p_expected_refund_reversed_at IS NOT NULL
       )
     )
     OR (
       p_expected_refund_reversed_at IS NOT NULL
       AND p_expected_refund_cash_at IS NULL
     ) THEN
    RAISE EXCEPTION 'Invalid Stripe refund attempt finalization'
      USING ERRCODE = '22023';
  END IF;

  SELECT attempt.*
    INTO v_attempt
    FROM public.stripe_refund_attempts AS attempt
   WHERE attempt.id = p_attempt_id
     AND attempt.livemode = p_livemode
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_attempt.stripe_refund_id IS NULL
     OR v_attempt.stripe_refund_id <> p_stripe_refund_id THEN
    RAISE EXCEPTION 'refund_attempt_finalize_identity_conflict'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT lifecycle.*
    INTO v_lifecycle
    FROM public.stripe_refund_current_lifecycle AS lifecycle
   WHERE lifecycle.livemode = p_livemode
     AND lifecycle.stripe_refund_id = p_stripe_refund_id
     AND lifecycle.is_consistent
     AND lifecycle.intake_id = v_attempt.intake_id
     AND lifecycle.payment_intent_id = v_attempt.payment_intent_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_lifecycle.refund_reversed_at IS NOT NULL
     OR v_lifecycle.refund_status IN ('failed', 'canceled') THEN
    v_terminal_state := 'failed';
  ELSIF v_lifecycle.refund_cash_at IS NOT NULL THEN
    v_terminal_state := 'succeeded';
  ELSE
    RETURN false;
  END IF;

  IF v_terminal_state <> p_expected_outcome
     OR v_lifecycle.refund_cash_at IS DISTINCT FROM p_expected_refund_cash_at
     OR v_lifecycle.refund_reversed_at IS DISTINCT FROM p_expected_refund_reversed_at THEN
    RETURN false;
  END IF;

  -- Reconciliation must establish exact money state first. This RPC only
  -- acknowledges that patient notification is durably complete for that state.
  IF v_attempt.state NOT IN ('succeeded', 'failed', 'canceled') THEN
    RETURN false;
  END IF;
  IF v_attempt.state = 'succeeded' AND v_terminal_state <> 'succeeded' THEN
    RETURN false;
  END IF;
  IF v_attempt.state IN ('failed', 'canceled')
     AND v_terminal_state = 'succeeded' THEN
    RETURN false;
  END IF;

  UPDATE public.stripe_refund_attempts AS attempt
     SET stripe_status = v_lifecycle.refund_status,
         lease_token = NULL,
         lease_expires_at = NULL,
         next_check_at = NULL,
         submitted_at = COALESCE(attempt.submitted_at, v_now),
         terminal_at = COALESCE(
           attempt.terminal_at,
           v_lifecycle.lifecycle_at,
           v_now
         ),
         downstream_finalized_at = COALESCE(
           attempt.downstream_finalized_at,
           v_now
         ),
         downstream_manual_review_at = NULL,
         last_error = CASE
           WHEN v_terminal_state = 'failed'
             THEN 'Stripe exact evidence reported terminal refund failure'
           ELSE NULL
         END,
         updated_at = v_now
   WHERE attempt.id = p_attempt_id;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.finalize_stripe_refund_attempt(
  uuid, boolean, text, text, timestamptz, timestamptz
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_stripe_refund_attempt(
  uuid, boolean, text, text, timestamptz, timestamptz
) TO service_role;

COMMENT ON FUNCTION public.finalize_stripe_refund_attempt(
  uuid, boolean, text, text, timestamptz, timestamptz
) IS
  'Marks durable patient notification complete for one exact terminal refund attempt';

CREATE OR REPLACE FUNCTION public.claim_stale_stripe_refund_attempts(
  p_livemode boolean,
  p_limit integer DEFAULT 25,
  p_lease_seconds integer DEFAULT 120
)
RETURNS TABLE (
  attempt_id uuid,
  created_at timestamptz,
  idempotency_key text,
  intake_id uuid,
  lease_token uuid,
  livemode boolean,
  payment_intent_id text,
  refund_type text,
  requested_amount_cents integer,
  state text,
  stripe_refund_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_claim_limit integer;
  v_claimed integer := 0;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_remaining integer;
  v_row_count integer := 0;
BEGIN
  IF p_livemode IS NULL
     OR p_limit IS NULL
     OR p_lease_seconds IS NULL
     OR p_lease_seconds <= 0 THEN
    RAISE EXCEPTION 'Invalid Stripe refund recovery claim bounds'
      USING ERRCODE = '22023';
  END IF;
  v_claim_limit := LEAST(GREATEST(p_limit, 1), 100);

  -- First resume active money generations and terminal attempts whose patient
  -- notification has not been durably finalized. Terminal rows retain their
  -- money state and therefore do not re-enter the active uniqueness indexes.
  RETURN QUERY
  WITH candidates AS MATERIALIZED (
    SELECT attempt.id
    FROM public.stripe_refund_attempts AS attempt
    WHERE attempt.livemode = p_livemode
      AND (
        attempt.state IN ('reserved', 'submitted', 'unknown_outcome')
        OR (
          attempt.state IN ('succeeded', 'failed', 'canceled')
          AND attempt.downstream_finalized_at IS NULL
          AND attempt.downstream_manual_review_at IS NULL
          AND attempt.stripe_refund_id IS NOT NULL
        )
      )
      AND (
        attempt.lease_expires_at IS NULL
        OR attempt.lease_expires_at <= v_now
      )
      AND COALESCE(
        attempt.next_check_at,
        attempt.lease_expires_at,
        attempt.updated_at
      ) <= v_now
    ORDER BY COALESCE(
      attempt.next_check_at,
      attempt.lease_expires_at,
      attempt.updated_at
    ), attempt.created_at, attempt.id
    LIMIT (v_claim_limit / 2)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.stripe_refund_attempts AS attempt
     SET lease_token = gen_random_uuid(),
         lease_expires_at = v_now + pg_catalog.make_interval(
           secs => LEAST(GREATEST(p_lease_seconds, 30), 900)
         ),
         next_check_at = NULL,
         updated_at = v_now
   FROM candidates
   WHERE attempt.id = candidates.id
  RETURNING
    attempt.id AS attempt_id,
    attempt.created_at,
    attempt.idempotency_key,
    attempt.intake_id,
    attempt.lease_token,
    attempt.livemode,
    attempt.payment_intent_id,
    attempt.refund_type,
    attempt.requested_amount_cents,
    attempt.state,
    attempt.stripe_refund_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_claimed := v_claimed + v_row_count;

  IF v_claimed >= v_claim_limit THEN
    RETURN;
  END IF;
  v_remaining := v_claim_limit - v_claimed;

  -- A terminal failure/reversal can reduce aggregate cash below a later,
  -- cumulative business obligation even when that obligation's own Refund had
  -- succeeded. Retry the highest exact unmet decline/priority target, not merely
  -- the Refund that reversed. One generation-2 row remains the structural cap.
  RETURN QUERY
  WITH successor_candidates AS MATERIALIZED (
    SELECT
      obligation.id AS predecessor_id,
      obligation.intake_id,
      obligation.actor_profile_id,
      obligation.payment_intent_id,
      obligation.refund_type,
      obligation.target_total_cents,
      (
        obligation.target_total_cents::bigint - cash.outstanding_cents
      )::integer AS requested_amount_cents
    FROM public.stripe_refund_attempts AS obligation
    JOIN public.intakes AS intake
      ON intake.id = obligation.intake_id
    LEFT JOIN public.profiles AS actor
      ON actor.id = obligation.actor_profile_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(sum(movement.amount_cents), 0)::bigint
        AS outstanding_cents
      FROM public.stripe_refund_cash_movements AS movement
      WHERE movement.livemode = p_livemode
        AND movement.currency = 'aud'
        AND movement.refund_reversed_at IS NULL
        AND (
          movement.intake_id = obligation.intake_id
          OR movement.payment_intent_id = obligation.payment_intent_id
        )
    ) AS cash ON true
    JOIN LATERAL (
      SELECT max(disrupted_lifecycle.lifecycle_at) AS trigger_at
      FROM public.stripe_refund_attempts AS disrupted
      JOIN public.stripe_refund_current_lifecycle AS disrupted_lifecycle
        ON disrupted_lifecycle.livemode = disrupted.livemode
       AND disrupted_lifecycle.stripe_refund_id = disrupted.stripe_refund_id
       AND disrupted_lifecycle.is_consistent
       AND (
         disrupted_lifecycle.refund_reversed_at IS NOT NULL
         OR disrupted_lifecycle.refund_status IN ('failed', 'canceled')
       )
      WHERE disrupted.livemode = obligation.livemode
        AND disrupted.intake_id = obligation.intake_id
        AND disrupted.state IN ('failed', 'canceled')
        AND disrupted.downstream_finalized_at IS NOT NULL
    ) AS disruption ON disruption.trigger_at IS NOT NULL
    WHERE obligation.livemode = p_livemode
      AND obligation.generation = 1
      AND obligation.state IN ('succeeded', 'failed', 'canceled')
      AND obligation.downstream_finalized_at IS NOT NULL
      AND obligation.refund_type IN ('decline', 'priority_breach')
      AND actor.role IS DISTINCT FROM 'support'::public.user_role
      AND disruption.trigger_at <= v_now - INTERVAL '15 minutes'
      AND COALESCE(intake.exclude_from_reporting, false) = false
      AND intake.refund_status IS DISTINCT FROM 'skipped_e2e'::public.refund_status
      AND intake.payment_status IN ('paid', 'partially_refunded')
      AND (
        obligation.refund_type <> 'decline'
        OR intake.refund_obligation_livemode = p_livemode
      )
      AND obligation.target_total_cents > cash.outstanding_cents
      AND NOT EXISTS (
        SELECT 1
          FROM public.stripe_refund_attempts AS successor
         WHERE successor.livemode = obligation.livemode
           AND successor.intake_id = obligation.intake_id
           AND successor.refund_type = obligation.refund_type
           AND successor.target_total_cents = obligation.target_total_cents
           AND successor.generation = 2
      )
      AND NOT EXISTS (
        SELECT 1
          FROM public.stripe_refund_attempts AS active
         WHERE active.livemode = obligation.livemode
           AND active.intake_id = obligation.intake_id
           AND active.state IN (
             'reserved', 'submitted', 'unknown_outcome', 'manual_review'
           )
      )
      AND NOT EXISTS (
        SELECT 1
          FROM public.stripe_refund_attempts AS unfinished_downstream
         WHERE unfinished_downstream.livemode = obligation.livemode
           AND unfinished_downstream.intake_id = obligation.intake_id
           AND unfinished_downstream.state IN ('succeeded', 'failed', 'canceled')
           AND unfinished_downstream.downstream_finalized_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1
          FROM public.stripe_refund_current_lifecycle AS pending_lifecycle
         WHERE pending_lifecycle.livemode = obligation.livemode
           AND pending_lifecycle.is_consistent
           AND (
             pending_lifecycle.intake_id = obligation.intake_id
             OR pending_lifecycle.payment_intent_id = obligation.payment_intent_id
           )
           AND pending_lifecycle.refund_status IN ('pending', 'requires_action')
           AND pending_lifecycle.refund_cash_at IS NULL
           AND pending_lifecycle.refund_reversed_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1
          FROM public.stripe_refund_attempts AS higher_obligation
         WHERE higher_obligation.livemode = obligation.livemode
           AND higher_obligation.intake_id = obligation.intake_id
           AND higher_obligation.generation = 1
           AND higher_obligation.refund_type IN ('decline', 'priority_breach')
           AND higher_obligation.state IN ('succeeded', 'failed', 'canceled')
           AND higher_obligation.target_total_cents > cash.outstanding_cents
           AND (
             higher_obligation.target_total_cents > obligation.target_total_cents
             OR (
               higher_obligation.target_total_cents = obligation.target_total_cents
               AND higher_obligation.refund_type = 'decline'
               AND obligation.refund_type <> 'decline'
             )
             OR (
               higher_obligation.target_total_cents = obligation.target_total_cents
               AND higher_obligation.refund_type = obligation.refund_type
               AND higher_obligation.created_at > obligation.created_at
             )
           )
      )
    ORDER BY disruption.trigger_at, obligation.target_total_cents DESC,
      obligation.created_at, obligation.id
    LIMIT (v_remaining / 2)
    FOR UPDATE OF obligation, intake SKIP LOCKED
  ),
  prepared_successors AS (
    SELECT gen_random_uuid() AS id, candidate.*
      FROM successor_candidates AS candidate
  )
  INSERT INTO public.stripe_refund_attempts (
    id,
    intake_id,
    actor_profile_id,
    payment_intent_id,
    livemode,
    refund_type,
    target_total_cents,
    requested_amount_cents,
    generation,
    retry_of_attempt_id,
    idempotency_key,
    lease_token,
    lease_expires_at,
    next_check_at,
    state,
    created_at,
    updated_at
  )
  SELECT
    successor.id,
    successor.intake_id,
    successor.actor_profile_id,
    successor.payment_intent_id,
    p_livemode,
    successor.refund_type,
    successor.target_total_cents,
    successor.requested_amount_cents,
    2,
    successor.predecessor_id,
    'refund-attempt:' || successor.id::text,
    gen_random_uuid(),
    v_now + pg_catalog.make_interval(
      secs => LEAST(GREATEST(p_lease_seconds, 30), 900)
    ),
    v_now + pg_catalog.make_interval(
      secs => LEAST(GREATEST(p_lease_seconds, 30), 900)
    ),
    'reserved',
    v_now,
    v_now
  FROM prepared_successors AS successor
  ON CONFLICT DO NOTHING
  RETURNING
    stripe_refund_attempts.id AS attempt_id,
    stripe_refund_attempts.created_at,
    stripe_refund_attempts.idempotency_key,
    stripe_refund_attempts.intake_id,
    stripe_refund_attempts.lease_token,
    stripe_refund_attempts.livemode,
    stripe_refund_attempts.payment_intent_id,
    stripe_refund_attempts.refund_type,
    stripe_refund_attempts.requested_amount_cents,
    stripe_refund_attempts.state,
    stripe_refund_attempts.stripe_refund_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_claimed := v_claimed + v_row_count;

  IF v_claimed >= v_claim_limit THEN
    RETURN;
  END IF;
  v_remaining := v_claim_limit - v_claimed;

  -- The declined intake is itself a durable full-refund obligation. If the
  -- action crashed before reservation, recover a unique PI from durable DB
  -- mirrors and atomically create/lease generation 1. Unsafe identity/amount
  -- cases stay visible in stripe_refund_recovery_issues instead of guessing.
  RETURN QUERY
  WITH obligation_candidates AS MATERIALIZED (
    SELECT
      intake.id AS intake_id,
      identity.payment_intent_id,
      intake.amount_cents AS target_total_cents,
      (
        intake.amount_cents::bigint - cash.outstanding_cents
      )::integer AS requested_amount_cents
    FROM public.intakes AS intake
    LEFT JOIN LATERAL (
      SELECT
        count(DISTINCT candidate.payment_intent_id)::integer AS identity_count,
        max(candidate.payment_intent_id) AS payment_intent_id
      FROM (
        SELECT NULLIF(pg_catalog.btrim(intake.stripe_payment_intent_id), '')
          AS payment_intent_id
        UNION ALL
        SELECT NULLIF(pg_catalog.btrim(payment.stripe_payment_intent_id), '')
        FROM public.payments AS payment
        WHERE payment.intake_id = intake.id
           OR (
             intake.payment_id IS NOT NULL
             AND payment.stripe_session_id = intake.payment_id
           )
      ) AS candidate
      WHERE candidate.payment_intent_id IS NOT NULL
    ) AS identity ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(sum(movement.amount_cents), 0)::bigint
        AS outstanding_cents
      FROM public.stripe_refund_cash_movements AS movement
      WHERE movement.livemode = p_livemode
        AND movement.currency = 'aud'
        AND movement.refund_reversed_at IS NULL
        AND (
          movement.intake_id = intake.id
          OR movement.payment_intent_id = identity.payment_intent_id
        )
    ) AS cash ON true
    WHERE intake.status = 'declined'
      AND intake.category IN ('medical_certificate', 'prescription', 'consult')
      AND COALESCE(intake.exclude_from_reporting, false) = false
      AND intake.refund_status IS DISTINCT FROM 'skipped_e2e'::public.refund_status
      AND intake.payment_status IN ('paid', 'partially_refunded')
      AND intake.refund_obligation_livemode = p_livemode
      AND intake.amount_cents IS NOT NULL
      AND intake.amount_cents > 0
      AND identity.identity_count = 1
      AND pg_catalog.left(identity.payment_intent_id, 3) = 'pi_'
      AND NOT EXISTS (
        SELECT 1
          FROM public.intakes AS other_intake
         WHERE other_intake.id <> intake.id
           AND (
             other_intake.stripe_payment_intent_id = identity.payment_intent_id
             OR EXISTS (
               SELECT 1
                 FROM public.payments AS other_payment
                WHERE other_payment.stripe_payment_intent_id = identity.payment_intent_id
                  AND (
                    other_payment.intake_id = other_intake.id
                    OR (
                      other_intake.payment_id IS NOT NULL
                      AND other_payment.stripe_session_id = other_intake.payment_id
                    )
                  )
             )
           )
        UNION ALL
        SELECT 1
          FROM public.stripe_refund_attempts AS bound_attempt
         WHERE bound_attempt.livemode = p_livemode
           AND bound_attempt.payment_intent_id = identity.payment_intent_id
           AND bound_attempt.intake_id <> intake.id
        UNION ALL
        SELECT 1
          FROM public.stripe_refund_events AS bound_evidence
         WHERE bound_evidence.livemode = p_livemode
           AND bound_evidence.payment_intent_id = identity.payment_intent_id
           AND bound_evidence.intake_id IS NOT NULL
           AND bound_evidence.intake_id <> intake.id
      )
      AND cash.outstanding_cents >= COALESCE(intake.refund_amount_cents, 0)
      AND intake.amount_cents > cash.outstanding_cents
      AND NOT EXISTS (
        SELECT 1
          FROM public.stripe_refund_attempts AS attempt
         WHERE attempt.livemode = p_livemode
           AND attempt.intake_id = intake.id
           AND attempt.refund_type = 'decline'
           AND attempt.target_total_cents = intake.amount_cents
      )
      AND NOT EXISTS (
        SELECT 1
          FROM public.stripe_refund_attempts AS active
         WHERE active.livemode = p_livemode
           AND active.intake_id = intake.id
           AND active.state IN (
             'reserved', 'submitted', 'unknown_outcome', 'manual_review'
           )
      )
      AND NOT EXISTS (
        SELECT 1
          FROM public.stripe_refund_attempts AS other_mode
         WHERE other_mode.livemode <> p_livemode
           AND (
             other_mode.intake_id = intake.id
             OR other_mode.payment_intent_id = identity.payment_intent_id
           )
        UNION ALL
        SELECT 1
          FROM public.stripe_refund_events AS other_mode_evidence
         WHERE other_mode_evidence.livemode <> p_livemode
           AND (
             other_mode_evidence.intake_id = intake.id
             OR other_mode_evidence.payment_intent_id = identity.payment_intent_id
           )
      )
    ORDER BY intake.updated_at, intake.id
    LIMIT v_remaining
    FOR UPDATE OF intake SKIP LOCKED
  ),
  prepared_obligations AS (
    SELECT gen_random_uuid() AS id, candidate.*
      FROM obligation_candidates AS candidate
  )
  INSERT INTO public.stripe_refund_attempts (
    id,
    intake_id,
    actor_profile_id,
    payment_intent_id,
    livemode,
    refund_type,
    target_total_cents,
    requested_amount_cents,
    generation,
    retry_of_attempt_id,
    idempotency_key,
    lease_token,
    lease_expires_at,
    next_check_at,
    state,
    created_at,
    updated_at
  )
  SELECT
    obligation.id,
    obligation.intake_id,
    NULL,
    obligation.payment_intent_id,
    p_livemode,
    'decline',
    obligation.target_total_cents,
    obligation.requested_amount_cents,
    1,
    NULL,
    'refund-attempt:' || obligation.id::text,
    gen_random_uuid(),
    v_now + pg_catalog.make_interval(
      secs => LEAST(GREATEST(p_lease_seconds, 30), 900)
    ),
    v_now + pg_catalog.make_interval(
      secs => LEAST(GREATEST(p_lease_seconds, 30), 900)
    ),
    'reserved',
    v_now,
    v_now
  FROM prepared_obligations AS obligation
  ON CONFLICT DO NOTHING
  RETURNING
    stripe_refund_attempts.id AS attempt_id,
    stripe_refund_attempts.created_at,
    stripe_refund_attempts.idempotency_key,
    stripe_refund_attempts.intake_id,
    stripe_refund_attempts.lease_token,
    stripe_refund_attempts.livemode,
    stripe_refund_attempts.payment_intent_id,
    stripe_refund_attempts.refund_type,
    stripe_refund_attempts.requested_amount_cents,
    stripe_refund_attempts.state,
    stripe_refund_attempts.stripe_refund_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_claimed := v_claimed + v_row_count;

  IF v_claimed >= v_claim_limit THEN
    RETURN;
  END IF;
  v_remaining := v_claim_limit - v_claimed;

  -- Use any capacity the obligation lanes did not need. This restores active
  -- retry throughput without allowing it to monopolize the whole batch.
  RETURN QUERY
  WITH candidates AS MATERIALIZED (
    SELECT attempt.id
      FROM public.stripe_refund_attempts AS attempt
     WHERE attempt.livemode = p_livemode
       AND (
         attempt.state IN ('reserved', 'submitted', 'unknown_outcome')
         OR (
           attempt.state IN ('succeeded', 'failed', 'canceled')
           AND attempt.downstream_finalized_at IS NULL
           AND attempt.downstream_manual_review_at IS NULL
           AND attempt.stripe_refund_id IS NOT NULL
         )
       )
       AND (
         attempt.lease_expires_at IS NULL
         OR attempt.lease_expires_at <= v_now
       )
       AND COALESCE(
         attempt.next_check_at,
         attempt.lease_expires_at,
         attempt.updated_at
       ) <= v_now
     ORDER BY COALESCE(
       attempt.next_check_at,
       attempt.lease_expires_at,
       attempt.updated_at
     ), attempt.created_at, attempt.id
     LIMIT v_remaining
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.stripe_refund_attempts AS attempt
     SET lease_token = gen_random_uuid(),
         lease_expires_at = v_now + pg_catalog.make_interval(
           secs => LEAST(GREATEST(p_lease_seconds, 30), 900)
         ),
         next_check_at = NULL,
         updated_at = v_now
    FROM candidates
   WHERE attempt.id = candidates.id
  RETURNING
    attempt.id AS attempt_id,
    attempt.created_at,
    attempt.idempotency_key,
    attempt.intake_id,
    attempt.lease_token,
    attempt.livemode,
    attempt.payment_intent_id,
    attempt.refund_type,
    attempt.requested_amount_cents,
    attempt.state,
    attempt.stripe_refund_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_stale_stripe_refund_attempts(boolean, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_stale_stripe_refund_attempts(boolean, integer, integer)
  TO service_role;

COMMENT ON FUNCTION public.claim_stale_stripe_refund_attempts(boolean, integer, integer) IS
  'Claims active attempts, one evidence-backed failed successor, and missing first decline obligations in bounded SKIP LOCKED batches';

-- Aggregate-only operator surface for obligations the recovery claim refuses
-- to guess. No patient identity, contact, clinical answer, or Stripe payload is
-- exposed; intake id is the internal remediation key.
CREATE OR REPLACE VIEW public.stripe_refund_recovery_issues
WITH (security_invoker = true)
AS
WITH declined_obligations AS (
  SELECT
    intake.id AS intake_id,
    intake.amount_cents AS target_total_cents,
    COALESCE(intake.refund_amount_cents, 0) AS mirrored_refund_cents,
    identity.identity_count,
    identity.payment_intent_id,
    (
      EXISTS (
        SELECT 1
          FROM public.intakes AS other_intake
         WHERE other_intake.id <> intake.id
           AND (
             other_intake.stripe_payment_intent_id = identity.payment_intent_id
             OR EXISTS (
               SELECT 1
                 FROM public.payments AS other_payment
                WHERE other_payment.stripe_payment_intent_id = identity.payment_intent_id
                  AND (
                    other_payment.intake_id = other_intake.id
                    OR (
                      other_intake.payment_id IS NOT NULL
                      AND other_payment.stripe_session_id = other_intake.payment_id
                    )
                  )
             )
           )
      )
      OR EXISTS (
        SELECT 1
          FROM public.stripe_refund_attempts AS bound_attempt
         WHERE bound_attempt.payment_intent_id = identity.payment_intent_id
           AND bound_attempt.intake_id <> intake.id
           AND (
             intake.refund_obligation_livemode IS NULL
             OR bound_attempt.livemode = intake.refund_obligation_livemode
           )
      )
      OR EXISTS (
        SELECT 1
          FROM public.stripe_refund_events AS bound_evidence
         WHERE bound_evidence.payment_intent_id = identity.payment_intent_id
           AND bound_evidence.intake_id IS NOT NULL
           AND bound_evidence.intake_id <> intake.id
           AND (
             intake.refund_obligation_livemode IS NULL
             OR bound_evidence.livemode = intake.refund_obligation_livemode
           )
      )
    ) AS has_cross_intake_binding,
    intake.refund_obligation_livemode AS livemode,
    modes.mode_count AS observed_mode_count,
    modes.livemode AS observed_livemode,
    COALESCE(cash.outstanding_cents, 0) AS outstanding_refund_cents
  FROM public.intakes AS intake
  LEFT JOIN LATERAL (
    SELECT
      count(DISTINCT candidate.payment_intent_id)::integer AS identity_count,
      max(candidate.payment_intent_id) AS payment_intent_id
    FROM (
      SELECT NULLIF(pg_catalog.btrim(intake.stripe_payment_intent_id), '')
        AS payment_intent_id
      UNION ALL
      SELECT NULLIF(pg_catalog.btrim(payment.stripe_payment_intent_id), '')
      FROM public.payments AS payment
      WHERE payment.intake_id = intake.id
         OR (
           intake.payment_id IS NOT NULL
           AND payment.stripe_session_id = intake.payment_id
         )
    ) AS candidate
    WHERE candidate.payment_intent_id IS NOT NULL
  ) AS identity ON true
  LEFT JOIN LATERAL (
    SELECT
      count(DISTINCT source.livemode)::integer AS mode_count,
      pg_catalog.bool_or(source.livemode) AS livemode
    FROM (
      SELECT attempt.livemode
      FROM public.stripe_refund_attempts AS attempt
      WHERE attempt.intake_id = intake.id
         OR attempt.payment_intent_id = identity.payment_intent_id
      UNION ALL
      SELECT evidence.livemode
      FROM public.stripe_refund_events AS evidence
      WHERE evidence.intake_id = intake.id
         OR evidence.payment_intent_id = identity.payment_intent_id
    ) AS source
  ) AS modes ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(sum(movement.amount_cents), 0)::bigint
      AS outstanding_cents
    FROM public.stripe_refund_cash_movements AS movement
    WHERE intake.refund_obligation_livemode IS NOT NULL
      AND movement.livemode = intake.refund_obligation_livemode
      AND movement.currency = 'aud'
      AND movement.refund_reversed_at IS NULL
      AND (
        movement.intake_id = intake.id
        OR movement.payment_intent_id = identity.payment_intent_id
      )
  ) AS cash ON true
  WHERE intake.status = 'declined'
    AND intake.category IN ('medical_certificate', 'prescription', 'consult')
    AND COALESCE(intake.exclude_from_reporting, false) = false
    AND intake.refund_status IS DISTINCT FROM 'skipped_e2e'::public.refund_status
    AND intake.payment_status IN ('paid', 'partially_refunded')
),
declined_issues AS (
  SELECT
    obligation.intake_id,
    obligation.livemode,
    CASE
      WHEN obligation.target_total_cents IS NULL
        OR obligation.target_total_cents <= 0
        THEN 'invalid_decline_refund_amount'
      WHEN obligation.identity_count = 0
        THEN 'missing_decline_payment_intent'
      WHEN obligation.identity_count > 1
        THEN 'ambiguous_decline_payment_intent'
      WHEN pg_catalog.left(obligation.payment_intent_id, 3) <> 'pi_'
        THEN 'invalid_decline_payment_intent'
      WHEN obligation.has_cross_intake_binding
        THEN 'decline_payment_intent_intake_conflict'
      WHEN obligation.livemode IS NULL
        THEN 'missing_decline_livemode'
      WHEN obligation.observed_mode_count > 1
        OR (
          obligation.observed_mode_count = 1
          AND obligation.observed_livemode IS DISTINCT FROM obligation.livemode
        )
        THEN 'decline_livemode_conflict'
      WHEN obligation.outstanding_refund_cents < obligation.mirrored_refund_cents
        THEN 'decline_refund_evidence_gap'
      ELSE NULL
    END AS issue_code,
    obligation.target_total_cents,
    obligation.outstanding_refund_cents,
    0::bigint AS attempt_count,
    pg_catalog.clock_timestamp() AS observed_at
  FROM declined_obligations AS obligation
),
exhausted_targets AS (
  SELECT
    obligation.intake_id,
    obligation.livemode,
    CASE
      WHEN actor.role = 'support'::public.user_role
        THEN 'refund_attempt_manual_retry_required'
      ELSE 'refund_attempt_retry_exhausted'
    END::text AS issue_code,
    obligation.target_total_cents,
    cash.outstanding_cents AS outstanding_refund_cents,
    (
      SELECT count(*)
        FROM public.stripe_refund_attempts AS generation
       WHERE generation.livemode = obligation.livemode
         AND generation.intake_id = obligation.intake_id
         AND generation.refund_type = obligation.refund_type
         AND generation.target_total_cents = obligation.target_total_cents
    )::bigint AS attempt_count,
    pg_catalog.clock_timestamp() AS observed_at
  FROM public.stripe_refund_attempts AS obligation
  JOIN public.intakes AS intake
    ON intake.id = obligation.intake_id
  LEFT JOIN public.profiles AS actor
    ON actor.id = obligation.actor_profile_id
  LEFT JOIN LATERAL (
    SELECT COALESCE(sum(movement.amount_cents), 0)::bigint
      AS outstanding_cents
    FROM public.stripe_refund_cash_movements AS movement
    WHERE movement.livemode = obligation.livemode
      AND movement.currency = 'aud'
      AND movement.refund_reversed_at IS NULL
      AND (
        movement.intake_id = obligation.intake_id
        OR movement.payment_intent_id = obligation.payment_intent_id
      )
  ) AS cash ON true
  WHERE obligation.generation = 1
    AND obligation.state IN ('succeeded', 'failed', 'canceled')
    AND obligation.downstream_finalized_at IS NOT NULL
    AND obligation.refund_type IN ('decline', 'priority_breach')
    AND obligation.target_total_cents > cash.outstanding_cents
    AND COALESCE(intake.exclude_from_reporting, false) = false
    AND intake.refund_status IS DISTINCT FROM 'skipped_e2e'::public.refund_status
    AND NOT EXISTS (
      SELECT 1
        FROM public.stripe_refund_attempts AS active
       WHERE active.livemode = obligation.livemode
         AND active.intake_id = obligation.intake_id
         AND active.state IN (
           'reserved', 'submitted', 'unknown_outcome', 'manual_review'
         )
    )
    AND NOT EXISTS (
      SELECT 1
        FROM public.stripe_refund_attempts AS unfinished_downstream
       WHERE unfinished_downstream.livemode = obligation.livemode
         AND unfinished_downstream.intake_id = obligation.intake_id
         AND unfinished_downstream.state IN ('succeeded', 'failed', 'canceled')
         AND unfinished_downstream.downstream_finalized_at IS NULL
    )
    AND NOT EXISTS (
      SELECT 1
        FROM public.stripe_refund_current_lifecycle AS pending_lifecycle
       WHERE pending_lifecycle.livemode = obligation.livemode
         AND pending_lifecycle.is_consistent
         AND (
           pending_lifecycle.intake_id = obligation.intake_id
           OR pending_lifecycle.payment_intent_id = obligation.payment_intent_id
         )
         AND pending_lifecycle.refund_status IN ('pending', 'requires_action')
         AND pending_lifecycle.refund_cash_at IS NULL
         AND pending_lifecycle.refund_reversed_at IS NULL
    )
    AND EXISTS (
      SELECT 1
        FROM public.stripe_refund_attempts AS disrupted
        JOIN public.stripe_refund_current_lifecycle AS disrupted_lifecycle
          ON disrupted_lifecycle.livemode = disrupted.livemode
         AND disrupted_lifecycle.stripe_refund_id = disrupted.stripe_refund_id
         AND disrupted_lifecycle.is_consistent
         AND (
           disrupted_lifecycle.refund_reversed_at IS NOT NULL
           OR disrupted_lifecycle.refund_status IN ('failed', 'canceled')
         )
       WHERE disrupted.livemode = obligation.livemode
         AND disrupted.intake_id = obligation.intake_id
         AND disrupted.state IN ('failed', 'canceled')
         AND disrupted.downstream_finalized_at IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1
        FROM public.stripe_refund_attempts AS higher_obligation
       WHERE higher_obligation.livemode = obligation.livemode
         AND higher_obligation.intake_id = obligation.intake_id
         AND higher_obligation.generation = 1
         AND higher_obligation.refund_type IN ('decline', 'priority_breach')
         AND higher_obligation.state IN ('succeeded', 'failed', 'canceled')
         AND higher_obligation.target_total_cents > cash.outstanding_cents
         AND (
           higher_obligation.target_total_cents > obligation.target_total_cents
           OR (
             higher_obligation.target_total_cents = obligation.target_total_cents
             AND higher_obligation.refund_type = 'decline'
             AND obligation.refund_type <> 'decline'
           )
           OR (
             higher_obligation.target_total_cents = obligation.target_total_cents
             AND higher_obligation.refund_type = obligation.refund_type
             AND higher_obligation.created_at > obligation.created_at
           )
         )
    )
    AND (
      actor.role = 'support'::public.user_role
      OR EXISTS (
        SELECT 1
          FROM public.stripe_refund_attempts AS successor
         WHERE successor.livemode = obligation.livemode
           AND successor.intake_id = obligation.intake_id
           AND successor.refund_type = obligation.refund_type
           AND successor.target_total_cents = obligation.target_total_cents
           AND successor.generation = 2
      )
    )
),
manual_review_attempts AS (
  SELECT
    attempt.intake_id,
    attempt.livemode,
    CASE
      WHEN attempt.state = 'manual_review'
        THEN 'refund_attempt_manual_review'
      WHEN attempt.downstream_manual_review_at IS NOT NULL
        THEN 'refund_attempt_downstream_manual_review'
      WHEN attempt.state = 'unknown_outcome'
        THEN 'refund_attempt_ambiguous_outcome'
      ELSE 'refund_attempt_downstream_unfinalized'
    END::text AS issue_code,
    attempt.target_total_cents,
    cash.outstanding_cents AS outstanding_refund_cents,
    attempt.generation::bigint AS attempt_count,
    pg_catalog.clock_timestamp() AS observed_at
  FROM public.stripe_refund_attempts AS attempt
  JOIN public.intakes AS intake
    ON intake.id = attempt.intake_id
  LEFT JOIN LATERAL (
    SELECT COALESCE(sum(movement.amount_cents), 0)::bigint
      AS outstanding_cents
    FROM public.stripe_refund_cash_movements AS movement
    WHERE movement.livemode = attempt.livemode
      AND movement.currency = 'aud'
      AND movement.refund_reversed_at IS NULL
      AND (
        movement.intake_id = attempt.intake_id
        OR movement.payment_intent_id = attempt.payment_intent_id
      )
  ) AS cash ON true
  WHERE (
      attempt.state = 'manual_review'
      OR (
        attempt.state = 'unknown_outcome'
        AND attempt.created_at <= pg_catalog.clock_timestamp() - INTERVAL '20 hours'
      )
      OR (
        attempt.state IN ('succeeded', 'failed', 'canceled')
        AND attempt.downstream_finalized_at IS NULL
        AND (
          attempt.downstream_manual_review_at IS NOT NULL
          OR COALESCE(attempt.terminal_at, attempt.updated_at)
            <= pg_catalog.clock_timestamp() - INTERVAL '20 hours'
        )
      )
    )
    AND COALESCE(intake.exclude_from_reporting, false) = false
    AND intake.refund_status IS DISTINCT FROM 'skipped_e2e'::public.refund_status
)
SELECT issue.*
  FROM declined_issues AS issue
 WHERE issue.issue_code IS NOT NULL
UNION ALL
SELECT exhausted.* FROM exhausted_targets AS exhausted
UNION ALL
SELECT review.* FROM manual_review_attempts AS review;

REVOKE ALL ON TABLE public.stripe_refund_recovery_issues
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.stripe_refund_recovery_issues TO service_role;

COMMENT ON VIEW public.stripe_refund_recovery_issues IS
  'Aggregate-only unsafe or exhausted refund obligations requiring operator attention';

CREATE OR REPLACE FUNCTION public.count_stripe_refund_recovery_issues(
  p_livemode boolean
)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_issue_count bigint;
BEGIN
  IF p_livemode IS NULL THEN
    RAISE EXCEPTION 'Stripe refund recovery issue mode is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::bigint
    INTO v_issue_count
    FROM public.stripe_refund_recovery_issues AS issue
   WHERE issue.livemode IS NULL
      OR issue.livemode = p_livemode;

  RETURN v_issue_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.count_stripe_refund_recovery_issues(boolean)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_stripe_refund_recovery_issues(boolean)
  TO service_role;

COMMENT ON FUNCTION public.count_stripe_refund_recovery_issues(boolean) IS
  'Returns only the aggregate recovery issue count for cron heartbeat/manual-review reporting';

-- The old NOT VALID CHECK still rejects every UPDATE to one of the three
-- historical general-consult rows. Preserve retirement for inserts and
-- transitions into general while allowing unrelated evidence reconciliation
-- on a row that was already legacy-general.
CREATE OR REPLACE FUNCTION public.enforce_general_consult_retirement_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF NEW.category = 'consult' AND NEW.subtype = 'general' THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'General consult subtype is retired'
        USING ERRCODE = '23514';
    ELSIF OLD.category IS DISTINCT FROM 'consult'
       OR OLD.subtype IS DISTINCT FROM 'general' THEN
      RAISE EXCEPTION 'General consult subtype is retired'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_general_consult_retirement_transition()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_general_consult_retirement_transition
  ON public.intakes;
CREATE TRIGGER enforce_general_consult_retirement_transition
  BEFORE INSERT OR UPDATE OF category, subtype ON public.intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_general_consult_retirement_transition();

ALTER TABLE public.intakes
  DROP CONSTRAINT IF EXISTS intakes_consult_subtype_not_general;

COMMENT ON FUNCTION public.enforce_general_consult_retirement_transition() IS
  'Rejects new general consults without blocking unrelated updates to pre-retirement rows';

-- Cash totals remain exact-balance-only. Refund lifecycle is now aggregated
-- from every per-refund current row and every unresolved attempt, so a pending
-- top-up cannot be poisoned by an earlier succeeded priority-fee refund (or
-- vice versa). p_trigger_status remains for call-site compatibility only.
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
  v_applied boolean := false;
  v_attempt_payment_intent_count integer := 0;
  v_candidate_payment_intent_id text;
  v_evidenced_refund_cents bigint := 0;
  v_failed_lifecycle_count bigint := 0;
  v_failed_target_count bigint := 0;
  v_intake public.intakes%ROWTYPE;
  v_latest_adjustment_at timestamptz;
  v_latest_refund_at timestamptz;
  v_lifecycle_payment_intent_count integer := 0;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_open_attempt_count bigint := 0;
  v_outstanding_dispute_cents bigint := 0;
  v_outstanding_refund_cents bigint := 0;
  v_payment_intent_id text;
  v_payment_status text;
  v_pending_lifecycle_count bigint := 0;
  v_priority_classification_complete boolean := true;
  v_priority_fee_refunded_at timestamptz;
  v_refund_mirror_id text;
  v_refund_status public.refund_status;
  v_requested_target_cents bigint := 0;
  v_succeeded_lifecycle_count bigint := 0;
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

  v_payment_intent_id := v_intake.stripe_payment_intent_id;

  SELECT
    count(DISTINCT attempt.payment_intent_id)::integer,
    max(attempt.payment_intent_id)
    INTO v_attempt_payment_intent_count, v_candidate_payment_intent_id
    FROM public.stripe_refund_attempts AS attempt
   WHERE attempt.intake_id = p_intake_id
     AND attempt.livemode = p_livemode;

  IF v_attempt_payment_intent_count > 1
     OR (
       v_payment_intent_id IS NOT NULL
       AND v_candidate_payment_intent_id IS NOT NULL
       AND v_payment_intent_id <> v_candidate_payment_intent_id
     ) THEN
    RAISE EXCEPTION 'Refund attempts conflict on PaymentIntent identity'
      USING ERRCODE = 'P0001';
  END IF;
  v_payment_intent_id := COALESCE(
    v_payment_intent_id,
    v_candidate_payment_intent_id
  );

  SELECT
    count(DISTINCT lifecycle.payment_intent_id)::integer,
    max(lifecycle.payment_intent_id)
    INTO v_lifecycle_payment_intent_count, v_candidate_payment_intent_id
    FROM public.stripe_refund_current_lifecycle AS lifecycle
   WHERE lifecycle.livemode = p_livemode
     AND lifecycle.intake_id = p_intake_id
     AND lifecycle.payment_intent_id IS NOT NULL;

  IF v_lifecycle_payment_intent_count > 1
     OR (
       v_payment_intent_id IS NOT NULL
       AND v_candidate_payment_intent_id IS NOT NULL
       AND v_payment_intent_id <> v_candidate_payment_intent_id
     ) THEN
    RAISE EXCEPTION 'Refund evidence conflicts on PaymentIntent identity'
      USING ERRCODE = 'P0001';
  END IF;
  v_payment_intent_id := COALESCE(
    v_payment_intent_id,
    v_candidate_payment_intent_id
  );

  IF v_payment_intent_id IS NULL THEN
    SELECT payment.stripe_payment_intent_id
      INTO v_payment_intent_id
      FROM public.payments AS payment
     WHERE payment.intake_id = p_intake_id
       AND payment.stripe_payment_intent_id IS NOT NULL
       AND (
         v_intake.payment_id IS NULL
         OR payment.stripe_session_id = v_intake.payment_id
       )
     ORDER BY payment.updated_at DESC, payment.id DESC
     LIMIT 1;
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
            AND (
              evidence.intake_id = p_intake_id
              OR (
                v_payment_intent_id IS NOT NULL
                AND evidence.payment_intent_id = v_payment_intent_id
              )
            )
       )
  ) THEN
    RAISE EXCEPTION 'Conflicting exact refund evidence'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.stripe_refund_current_lifecycle AS lifecycle
     WHERE lifecycle.livemode = p_livemode
       AND NOT lifecycle.is_consistent
       AND (
         lifecycle.intake_id = p_intake_id
         OR (
           v_payment_intent_id IS NOT NULL
           AND lifecycle.payment_intent_id = v_payment_intent_id
         )
       )
  ) THEN
    RAISE EXCEPTION 'Conflicting exact refund evidence'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_payment_intent_id IS NOT NULL AND EXISTS (
    SELECT 1
      FROM public.stripe_refund_current_lifecycle AS lifecycle
     WHERE lifecycle.livemode = p_livemode
       AND lifecycle.payment_intent_id = v_payment_intent_id
       AND lifecycle.intake_id IS NOT NULL
       AND lifecycle.intake_id <> p_intake_id
  ) THEN
    RAISE EXCEPTION 'Refund PaymentIntent is linked to another intake'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.stripe_refund_current_lifecycle AS lifecycle
     WHERE lifecycle.livemode = p_livemode
       AND lifecycle.is_consistent
       AND lifecycle.currency <> 'aud'
       AND (
         lifecycle.intake_id = p_intake_id
         OR (
           v_payment_intent_id IS NOT NULL
           AND lifecycle.payment_intent_id = v_payment_intent_id
         )
       )
  ) THEN
    RAISE EXCEPTION 'Non-AUD refund evidence cannot reconcile an AUD intake'
      USING ERRCODE = 'P0001';
  END IF;

  -- Evidence reconciliation owns cash mirrors, but durable patient notification
  -- must finish before an attempt loses recovery ownership. Optional Ads work
  -- has its own durable due queue and does not gate refund retry eligibility.
  -- Money state becomes terminal immediately from exact lifecycle evidence.
  -- A separate nullable marker keeps downstream work claimable without putting
  -- a terminal attempt back under the active-money uniqueness constraints.
  -- A later failure/reversal clears that marker on an earlier success.
  UPDATE public.stripe_refund_attempts AS attempt
     SET state = CASE
           WHEN lifecycle.refund_reversed_at IS NOT NULL
             OR lifecycle.refund_status IN ('failed', 'canceled') THEN 'failed'
           WHEN lifecycle.refund_cash_at IS NOT NULL THEN 'succeeded'
           ELSE 'submitted'
         END,
         stripe_status = lifecycle.refund_status,
         lease_token = NULL,
         lease_expires_at = NULL,
         next_check_at = v_now + INTERVAL '5 minutes',
         submitted_at = COALESCE(attempt.submitted_at, v_now),
         terminal_at = CASE
           WHEN lifecycle.refund_reversed_at IS NOT NULL
             OR lifecycle.refund_cash_at IS NOT NULL
             OR lifecycle.refund_status IN ('failed', 'canceled')
             THEN COALESCE(lifecycle.lifecycle_at, v_now)
           ELSE NULL
         END,
         downstream_finalized_at = NULL,
         last_error = CASE
           WHEN lifecycle.refund_reversed_at IS NOT NULL
             OR lifecycle.refund_status IN ('failed', 'canceled')
             THEN 'Stripe exact evidence reported refund failure; downstream finalization pending'
           ELSE NULL
         END,
         updated_at = v_now
    FROM public.stripe_refund_current_lifecycle AS lifecycle
   WHERE attempt.intake_id = p_intake_id
     AND attempt.livemode = p_livemode
     AND attempt.stripe_refund_id = lifecycle.stripe_refund_id
     AND lifecycle.livemode = attempt.livemode
     AND lifecycle.is_consistent
     AND (
       attempt.state IN (
         'reserved', 'submitted', 'unknown_outcome', 'manual_review'
       )
       OR (
         attempt.state = 'succeeded'
         AND (
           lifecycle.refund_reversed_at IS NOT NULL
           OR lifecycle.refund_status IN ('failed', 'canceled')
         )
       )
     );

  SELECT
    COALESCE(sum(movement.amount_cents), 0),
    COALESCE(sum(movement.amount_cents) FILTER (
      WHERE movement.refund_reversed_at IS NULL
    ), 0),
    max(movement.refund_cash_at) FILTER (
      WHERE movement.refund_reversed_at IS NULL
    ),
    max(COALESCE(
      movement.refund_reversed_at,
      movement.refund_cash_at
    )),
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
     AND movement.currency = 'aud'
     AND (
       movement.intake_id = p_intake_id
       OR (
         v_payment_intent_id IS NOT NULL
         AND movement.payment_intent_id = v_payment_intent_id
       )
     );

  IF v_evidenced_refund_cents < COALESCE(v_intake.refund_amount_cents, 0) THEN
    RAISE EXCEPTION 'Exact refund evidence does not cover cumulative intake refunds'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_outstanding_refund_cents > GREATEST(
    COALESCE(v_intake.amount_cents, 0),
    0
  ) THEN
    RAISE EXCEPTION 'Exact refund cash exceeds the authoritative charged amount'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT
    count(*) FILTER (
      WHERE lifecycle.refund_status IN ('pending', 'requires_action')
        AND lifecycle.refund_cash_at IS NULL
        AND lifecycle.refund_reversed_at IS NULL
    ),
    count(*) FILTER (
      WHERE lifecycle.refund_status IN ('failed', 'canceled')
         OR lifecycle.refund_reversed_at IS NOT NULL
    ),
    count(*) FILTER (
      WHERE lifecycle.refund_cash_at IS NOT NULL
        AND lifecycle.refund_reversed_at IS NULL
    )
    INTO
      v_pending_lifecycle_count,
      v_failed_lifecycle_count,
      v_succeeded_lifecycle_count
    FROM public.stripe_refund_current_lifecycle AS lifecycle
   WHERE lifecycle.livemode = p_livemode
     AND lifecycle.is_consistent
     AND (
       lifecycle.intake_id = p_intake_id
       OR (
         v_payment_intent_id IS NOT NULL
         AND lifecycle.payment_intent_id = v_payment_intent_id
       )
     );

  SELECT
    COALESCE(max(attempt.target_total_cents), 0),
    count(*) FILTER (
      WHERE attempt.state IN (
        'reserved', 'submitted', 'unknown_outcome', 'manual_review'
      )
    )
    INTO v_requested_target_cents, v_open_attempt_count
    FROM public.stripe_refund_attempts AS attempt
   WHERE attempt.intake_id = p_intake_id
     AND attempt.livemode = p_livemode;

  SELECT count(*)
    INTO v_failed_target_count
    FROM public.stripe_refund_attempts AS attempt
   WHERE attempt.intake_id = p_intake_id
     AND attempt.livemode = p_livemode
     AND attempt.target_total_cents = v_requested_target_cents
     AND attempt.state IN ('failed', 'canceled');

  SELECT (
    pg_catalog.array_agg(
      attempt.stripe_refund_id
      ORDER BY
        CASE
          WHEN attempt.state IN (
            'reserved', 'submitted', 'unknown_outcome', 'manual_review'
          ) THEN 0
          ELSE 1
        END,
        attempt.updated_at DESC,
        attempt.id DESC
    ) FILTER (WHERE attempt.stripe_refund_id IS NOT NULL)
  )[1]
    INTO v_refund_mirror_id
    FROM public.stripe_refund_attempts AS attempt
   WHERE attempt.intake_id = p_intake_id
     AND attempt.livemode = p_livemode;

  IF v_refund_mirror_id IS NULL THEN
    SELECT (
      pg_catalog.array_agg(
        lifecycle.stripe_refund_id
        ORDER BY lifecycle.lifecycle_at DESC NULLS LAST,
          lifecycle.stripe_refund_id DESC
      )
    )[1]
      INTO v_refund_mirror_id
      FROM public.stripe_refund_current_lifecycle AS lifecycle
     WHERE lifecycle.livemode = p_livemode
       AND lifecycle.is_consistent
       AND (
         lifecycle.intake_id = p_intake_id
         OR (
           v_payment_intent_id IS NOT NULL
           AND lifecycle.payment_intent_id = v_payment_intent_id
         )
       );
  END IF;

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
    WHEN v_open_attempt_count > 0 OR v_pending_lifecycle_count > 0
      THEN 'pending'::public.refund_status
    WHEN v_requested_target_cents > v_outstanding_refund_cents
      AND (v_failed_target_count > 0 OR v_failed_lifecycle_count > 0)
      THEN 'failed'::public.refund_status
    WHEN v_requested_target_cents > v_outstanding_refund_cents
      THEN 'pending'::public.refund_status
    WHEN v_outstanding_refund_cents > 0
      OR v_succeeded_lifecycle_count > 0
      THEN 'succeeded'::public.refund_status
    WHEN v_failed_lifecycle_count > 0
      THEN 'failed'::public.refund_status
    ELSE 'not_applicable'::public.refund_status
  END;

  UPDATE public.intakes AS intake
     SET stripe_payment_intent_id = COALESCE(
           intake.stripe_payment_intent_id,
           v_payment_intent_id
         ),
         payment_status = v_payment_status,
         refund_status = v_refund_status,
         refund_amount_cents = LEAST(
           v_outstanding_refund_cents,
           GREATEST(COALESCE(v_intake.amount_cents, 0), 0)
         )::integer,
         refund_stripe_id = COALESCE(
           v_refund_mirror_id,
           intake.refund_stripe_id
         ),
         refunded_at = v_latest_refund_at,
         priority_fee_refunded_at = CASE
           WHEN v_priority_classification_complete THEN v_priority_fee_refunded_at
           ELSE intake.priority_fee_refunded_at
         END,
         refund_error = CASE
           WHEN v_refund_status = 'failed'::public.refund_status
             THEN 'Latest requested Stripe refund target did not settle'
           ELSE NULL
         END,
         updated_at = v_now
   WHERE intake.id = p_intake_id;
  v_applied := FOUND;

  -- Payments are compatibility mirrors, not the refund ledger. A legacy
  -- intake can have duplicate same-intake rows for one PaymentIntent, while
  -- payments.stripe_refund_id remains globally unique. Update one canonical
  -- mirror only: the current Checkout Session row first, otherwise the newest
  -- exact-intake row. This leaves duplicate historical rows non-authoritative.
  WITH canonical_payment AS MATERIALIZED (
    SELECT payment.id
      FROM public.payments AS payment
     WHERE (
         v_payment_intent_id IS NOT NULL
         AND payment.stripe_payment_intent_id = v_payment_intent_id
         AND (
           payment.intake_id = p_intake_id
           OR (
             v_intake.payment_id IS NOT NULL
             AND payment.stripe_session_id = v_intake.payment_id
           )
         )
       )
       OR (
         v_payment_intent_id IS NULL
         AND payment.intake_id = p_intake_id
       )
     ORDER BY
       CASE
         WHEN v_intake.payment_id IS NOT NULL
           AND payment.stripe_session_id = v_intake.payment_id THEN 0
         ELSE 1
       END,
       payment.updated_at DESC NULLS LAST,
       payment.created_at DESC NULLS LAST,
       payment.id DESC
     LIMIT 1
     FOR UPDATE
  )
  UPDATE public.payments AS payment
     SET status = CASE
           WHEN v_outstanding_dispute_cents > 0 THEN 'disputed'
           WHEN v_outstanding_refund_cents > 0 THEN 'refunded'
           ELSE 'paid'
         END,
         refund_status = CASE
           WHEN v_refund_status = 'failed'::public.refund_status THEN 'failed'
           WHEN v_refund_status = 'pending'::public.refund_status THEN 'processing'
           WHEN v_refund_status = 'succeeded'::public.refund_status THEN 'refunded'
           ELSE 'not_applicable'
         END,
         refund_amount = LEAST(
           v_outstanding_refund_cents,
           GREATEST(COALESCE(v_intake.amount_cents, 0), 0)
         )::integer,
         stripe_refund_id = COALESCE(
           v_refund_mirror_id,
           payment.stripe_refund_id
         ),
         refunded_at = v_latest_refund_at,
         updated_at = v_now
    FROM canonical_payment
   WHERE payment.id = canonical_payment.id;

  RETURN pg_catalog.jsonb_build_object(
    'applied', v_applied,
    'intake_id', p_intake_id,
    'payment_intent_id', v_payment_intent_id,
    'refund_amount_cents', LEAST(
      v_outstanding_refund_cents,
      GREATEST(COALESCE(v_intake.amount_cents, 0), 0)
    ),
    'outstanding_dispute_cents', v_outstanding_dispute_cents,
    'open_refund_attempt_count', v_open_attempt_count,
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
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_intake_refund_cash_state(
  uuid, boolean, text
) TO service_role;

COMMENT ON FUNCTION public.reconcile_intake_refund_cash_state(
  uuid, boolean, text
) IS
  'Reconciles exact refund cash with per-refund lifecycle and durable open attempts; service role only';
