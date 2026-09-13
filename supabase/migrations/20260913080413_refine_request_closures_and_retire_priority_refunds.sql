-- Operator decision 2026-09-13: overdue priority review does not authorize a refund.
-- Preserve observation of already-submitted refunds; block new priority reservations
-- and automatic successor attempts. Administrative closures retain full-refund recovery.
-- Function bodies retain the existing locks, leases, cash evidence and ACLs.
BEGIN;

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
  IF p_refund_type = 'priority_breach' THEN
    RAISE EXCEPTION 'automatic_priority_refunds_disabled' USING ERRCODE = '22023';
  END IF;
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
      AND obligation.refund_type = 'decline'
      AND actor.role IS DISTINCT FROM 'support'
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
           AND higher_obligation.refund_type = 'decline'
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
    WHERE (intake.status = 'declined' OR (intake.status = 'cancelled' AND intake.decline_reason_code IN ('duplicate_request', 'patient_cancelled')))
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
  WHERE (intake.status = 'declined' OR (intake.status = 'cancelled' AND intake.decline_reason_code IN ('duplicate_request', 'patient_cancelled')))
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
      WHEN actor.role = 'support'
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
    AND obligation.refund_type = 'decline'
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
         AND higher_obligation.refund_type = 'decline'
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
      actor.role = 'support'
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



DROP INDEX public.idx_intakes_decline_refund_obligation_mode;
CREATE INDEX idx_intakes_decline_refund_obligation_mode
  ON public.intakes (refund_obligation_livemode, updated_at, id)
  WHERE (status = 'declined' OR (status = 'cancelled' AND decline_reason_code IN ('duplicate_request', 'patient_cancelled')))
    AND payment_status IN ('paid', 'partially_refunded');

COMMIT;
