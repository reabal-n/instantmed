-- Keep the support refund quota callable when profiles.role is stored as text.
-- The original function selected text into the historical user_role enum,
-- which plpgsql_check correctly flagged as lacking an assignment cast.

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
  v_actor_role text;
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

  IF NOT FOUND OR v_actor_role IS DISTINCT FROM 'support' THEN
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
