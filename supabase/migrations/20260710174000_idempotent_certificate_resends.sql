-- Reserve and finalize certificate resend attempts transactionally.
--
-- Reservation happens before the provider send, serializes the staff cap, and
-- supplies the idempotency key used by email_outbox. Finalization is safe to
-- retry after an ambiguous response and updates counters/status/audit exactly
-- once. Provider failures release the reservation without incrementing counts.

ALTER TABLE public.certificate_audit_log
  DROP CONSTRAINT IF EXISTS certificate_audit_log_actor_role_check;

ALTER TABLE public.certificate_audit_log
  ADD CONSTRAINT certificate_audit_log_actor_role_check
  CHECK (actor_role IN ('patient', 'doctor', 'admin', 'support', 'system'));

CREATE TABLE IF NOT EXISTS public.certificate_resend_attempts (
  id uuid PRIMARY KEY,
  certificate_id uuid NOT NULL REFERENCES public.issued_certificates(id) ON DELETE RESTRICT,
  certificate_storage_path text NOT NULL,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role text NOT NULL CHECK (actor_role IN ('patient', 'doctor', 'admin', 'support')),
  resend_reason text NOT NULL,
  count_toward_staff_limit boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'sent', 'failed')),
  email_outbox_id text,
  provider_message_id text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  finalized_at timestamptz
);

-- Safe for a preview database that saw an earlier draft of this migration.
ALTER TABLE public.certificate_resend_attempts
  ADD COLUMN IF NOT EXISTS certificate_storage_path text;
UPDATE public.certificate_resend_attempts AS attempt
SET certificate_storage_path = certificate.storage_path
FROM public.issued_certificates AS certificate
WHERE attempt.certificate_id = certificate.id
  AND attempt.certificate_storage_path IS NULL;
ALTER TABLE public.certificate_resend_attempts
  ALTER COLUMN certificate_storage_path SET NOT NULL;

ALTER TABLE public.certificate_resend_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.certificate_resend_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.certificate_resend_attempts TO service_role;

CREATE INDEX IF NOT EXISTS idx_certificate_resend_attempts_active
  ON public.certificate_resend_attempts (certificate_id, created_at)
  WHERE status = 'reserved' AND count_toward_staff_limit = true;

DROP INDEX IF EXISTS public.idx_certificate_resend_attempts_one_active_actor;
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificate_resend_attempts_one_active_version
  ON public.certificate_resend_attempts (certificate_id, certificate_storage_path)
  WHERE status = 'reserved';

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificate_audit_resend_attempt
  ON public.certificate_audit_log (
    certificate_id,
    (event_data->>'resend_attempt_id')
  )
  WHERE event_data->>'resend_attempt_id' IS NOT NULL
    AND event_type IN ('email_retry', 'email_failed');

CREATE OR REPLACE FUNCTION public.reserve_certificate_resend(
  p_attempt_id uuid,
  p_certificate_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_resend_reason text,
  p_count_toward_staff_limit boolean
)
RETURNS TABLE(success boolean, error_message text, attempt_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_certificate public.issued_certificates%ROWTYPE;
  v_attempt public.certificate_resend_attempts%ROWTYPE;
  v_active_reservations integer;
BEGIN
  IF p_attempt_id IS NULL
     OR p_actor_id IS NULL
     OR p_actor_role IS NULL
     OR p_actor_role NOT IN ('patient', 'doctor', 'admin', 'support')
     OR NULLIF(BTRIM(p_resend_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Invalid certificate resend reservation';
  END IF;

  SELECT * INTO v_attempt
  FROM public.certificate_resend_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_attempt.certificate_id <> p_certificate_id
       OR v_attempt.actor_id <> p_actor_id THEN
      RAISE EXCEPTION 'Resend attempt id conflicts with another request';
    END IF;
    RETURN QUERY SELECT TRUE, NULL::text, v_attempt.status;
    RETURN;
  END IF;

  SELECT * INTO v_certificate
  FROM public.issued_certificates
  WHERE id = p_certificate_id
  FOR UPDATE;

  IF NOT FOUND OR v_certificate.status <> 'valid' THEN
    RAISE EXCEPTION 'Current valid certificate not found';
  END IF;

  SELECT * INTO v_attempt
  FROM public.certificate_resend_attempts AS attempt
  WHERE attempt.certificate_id = p_certificate_id
    AND attempt.certificate_storage_path = v_certificate.storage_path
    AND attempt.status = 'reserved'
  ORDER BY attempt.created_at
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN QUERY SELECT
      FALSE,
      'A certificate resend is already queued for this certificate version'::text,
      'reserved'::text;
    RETURN;
  END IF;

  IF p_count_toward_staff_limit THEN
    SELECT COUNT(*)::integer INTO v_active_reservations
    FROM public.certificate_resend_attempts AS attempt
    WHERE attempt.certificate_id = p_certificate_id
      AND attempt.certificate_storage_path = v_certificate.storage_path
      AND attempt.status = 'reserved'
      AND attempt.count_toward_staff_limit = true;

    IF COALESCE(v_certificate.resend_count, 0) + v_active_reservations >= 3 THEN
      RETURN QUERY SELECT FALSE, 'Maximum resends reached'::text, NULL::text;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.certificate_resend_attempts (
    id,
    certificate_id,
    certificate_storage_path,
    actor_id,
    actor_role,
    resend_reason,
    count_toward_staff_limit
  ) VALUES (
    p_attempt_id,
    p_certificate_id,
    v_certificate.storage_path,
    p_actor_id,
    p_actor_role,
    p_resend_reason,
    p_count_toward_staff_limit
  );

  RETURN QUERY SELECT TRUE, NULL::text, 'reserved'::text;
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_attempt
    FROM public.certificate_resend_attempts
    WHERE id = p_attempt_id;
    IF v_attempt.id IS NOT NULL
       AND v_attempt.certificate_id = p_certificate_id
       AND v_attempt.actor_id = p_actor_id THEN
      RETURN QUERY SELECT TRUE, NULL::text, v_attempt.status;
    ELSE
      RETURN QUERY SELECT FALSE, 'Resend attempt conflict'::text, NULL::text;
    END IF;
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::text, NULL::text;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_certificate_resend(
  p_attempt_id uuid,
  p_delivery_succeeded boolean,
  p_email_outbox_id text DEFAULT NULL,
  p_provider_message_id text DEFAULT NULL,
  p_failure_reason text DEFAULT NULL
)
RETURNS TABLE(success boolean, error_message text, is_duplicate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_attempt public.certificate_resend_attempts%ROWTYPE;
  v_certificate public.issued_certificates%ROWTYPE;
  v_event_type public.certificate_event_type;
  v_delivery_succeeded boolean;
  v_failure_reason text;
BEGIN
  IF p_attempt_id IS NULL OR p_delivery_succeeded IS NULL THEN
    RAISE EXCEPTION 'Invalid certificate resend finalization';
  END IF;

  -- Read the immutable certificate reference first, then take locks in the
  -- same certificate -> attempt order used by reservation. Locking the attempt
  -- first here can deadlock with a concurrent reservation that already holds
  -- the certificate row and is checking the active attempt.
  SELECT * INTO v_attempt
  FROM public.certificate_resend_attempts
  WHERE id = p_attempt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate resend reservation not found';
  END IF;

  SELECT * INTO v_certificate
  FROM public.issued_certificates
  WHERE id = v_attempt.certificate_id
  FOR UPDATE;

  IF NOT FOUND OR v_certificate.status <> 'valid' THEN
    RAISE EXCEPTION 'Current valid certificate not found';
  END IF;

  SELECT * INTO v_attempt
  FROM public.certificate_resend_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND OR v_attempt.certificate_id <> v_certificate.id THEN
    RAISE EXCEPTION 'Certificate resend reservation changed during finalization';
  END IF;

  IF v_attempt.status = 'sent' AND p_delivery_succeeded THEN
    RETURN QUERY SELECT TRUE, NULL::text, TRUE;
    RETURN;
  END IF;
  IF v_attempt.status = 'failed' AND NOT p_delivery_succeeded THEN
    RETURN QUERY SELECT TRUE, NULL::text, TRUE;
    RETURN;
  END IF;
  IF v_attempt.status = 'failed'
     AND p_delivery_succeeded
     AND v_attempt.failure_reason = 'Certificate version changed before resend finalization' THEN
    RETURN QUERY SELECT TRUE, NULL::text, TRUE;
    RETURN;
  END IF;
  IF v_attempt.status <> 'reserved' THEN
    RAISE EXCEPTION 'Certificate resend already finalized with a different outcome';
  END IF;

  v_delivery_succeeded := p_delivery_succeeded;
  v_failure_reason := p_failure_reason;
  IF p_delivery_succeeded
     AND v_attempt.certificate_storage_path <> v_certificate.storage_path THEN
    -- A correction can replace the PDF after Resend accepted the old email but
    -- before bookkeeping finalized. Preserve the provider fact on the attempt,
    -- but never count that stale-version delivery or overwrite the corrected
    -- certificate's current delivery state.
    v_delivery_succeeded := FALSE;
    v_failure_reason := 'Certificate version changed before resend finalization';
  END IF;

  IF v_delivery_succeeded THEN
    UPDATE public.issued_certificates
    SET email_sent_at = NOW(),
        email_delivery_id = p_provider_message_id,
        email_failed_at = NULL,
        email_failure_reason = NULL,
        email_retry_count = COALESCE(issued_certificates.email_retry_count, 0) + 1,
        resend_count = COALESCE(issued_certificates.resend_count, 0)
          + CASE WHEN v_attempt.count_toward_staff_limit THEN 1 ELSE 0 END,
        email_opened_at = NULL,
        updated_at = NOW()
    WHERE id = v_attempt.certificate_id;

    UPDATE public.intakes
    SET document_sent_at = COALESCE(document_sent_at, NOW()),
        generated_document_type = 'medical_certificate',
        updated_at = NOW()
    WHERE id = v_certificate.intake_id;

    v_event_type := 'email_retry';
  ELSIF v_attempt.certificate_storage_path = v_certificate.storage_path THEN
    UPDATE public.issued_certificates
    SET email_failed_at = NOW(),
        email_failure_reason = v_failure_reason,
        updated_at = NOW()
    WHERE id = v_attempt.certificate_id;
  END IF;
  IF NOT v_delivery_succeeded THEN
    v_event_type := 'email_failed';
  END IF;

  INSERT INTO public.certificate_audit_log (
    certificate_id,
    event_type,
    actor_id,
    actor_role,
    event_data
  ) VALUES (
    v_attempt.certificate_id,
    v_event_type,
    v_attempt.actor_id,
    v_attempt.actor_role,
    jsonb_build_object(
      'resend_reason', v_attempt.resend_reason,
      'resend_attempt_id', v_attempt.id,
      'email_outbox_id', p_email_outbox_id,
      'provider_delivery_succeeded', p_delivery_succeeded,
      'certificate_storage_path', v_attempt.certificate_storage_path,
      'current_storage_path', v_certificate.storage_path
    )
  );

  UPDATE public.certificate_resend_attempts
  SET status = CASE WHEN v_delivery_succeeded THEN 'sent' ELSE 'failed' END,
      email_outbox_id = p_email_outbox_id,
      provider_message_id = p_provider_message_id,
      failure_reason = v_failure_reason,
      finalized_at = NOW()
  WHERE id = v_attempt.id
    AND status = 'reserved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate resend changed during finalization';
  END IF;

  RETURN QUERY SELECT TRUE, NULL::text, FALSE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::text, FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reconcile_certificate_resend_attempts(
  p_certificate_id uuid DEFAULT NULL
)
RETURNS TABLE(success boolean, error_message text, reconciled_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_attempt public.certificate_resend_attempts%ROWTYPE;
  v_outbox record;
  v_finalize_success boolean;
  v_finalize_error text;
  v_reconciled integer := 0;
BEGIN
  FOR v_attempt IN
    SELECT attempt.*
    FROM public.certificate_resend_attempts AS attempt
    WHERE attempt.status = 'reserved'
      AND (p_certificate_id IS NULL OR attempt.certificate_id = p_certificate_id)
    ORDER BY attempt.created_at
    LIMIT 100
  LOOP
    SELECT outbox.id,
           outbox.status,
           outbox.provider_message_id,
           outbox.error_message,
           outbox.retry_count
    INTO v_outbox
    FROM public.email_outbox AS outbox
    WHERE outbox.idempotency_key = 'certificate-resend:' || v_attempt.id::text
    ORDER BY outbox.created_at DESC
    LIMIT 1;

    IF v_outbox.id IS NOT NULL AND v_outbox.status = 'sent' THEN
      SELECT finalized.success, finalized.error_message
      INTO v_finalize_success, v_finalize_error
      FROM public.finalize_certificate_resend(
        v_attempt.id,
        TRUE,
        v_outbox.id::text,
        v_outbox.provider_message_id,
        NULL
      ) AS finalized
      LIMIT 1;
    ELSIF v_outbox.id IS NOT NULL
       AND v_outbox.status IN ('failed', 'skipped_e2e')
       AND COALESCE(v_outbox.retry_count, 0) >= 10 THEN
      SELECT finalized.success, finalized.error_message
      INTO v_finalize_success, v_finalize_error
      FROM public.finalize_certificate_resend(
        v_attempt.id,
        FALSE,
        v_outbox.id::text,
        NULL,
        COALESCE(v_outbox.error_message, 'Email delivery retries exhausted')
      ) AS finalized
      LIMIT 1;
    ELSIF v_outbox.id IS NULL
       AND v_attempt.created_at < NOW() - INTERVAL '15 minutes' THEN
      SELECT finalized.success, finalized.error_message
      INTO v_finalize_success, v_finalize_error
      FROM public.finalize_certificate_resend(
        v_attempt.id,
        FALSE,
        NULL,
        NULL,
        'Resend reservation expired before an outbox row was created'
      ) AS finalized
      LIMIT 1;
    ELSE
      CONTINUE;
    END IF;

    IF NOT COALESCE(v_finalize_success, FALSE) THEN
      RETURN QUERY SELECT
        FALSE,
        COALESCE(v_finalize_error, 'Certificate resend reconciliation failed'),
        v_reconciled;
      RETURN;
    END IF;
    v_reconciled := v_reconciled + 1;
  END LOOP;

  RETURN QUERY SELECT TRUE, NULL::text, v_reconciled;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::text, v_reconciled;
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_certificate_resend(
  uuid, uuid, uuid, text, text, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_certificate_resend(
  uuid, uuid, uuid, text, text, boolean
) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_certificate_resend(
  uuid, boolean, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_certificate_resend(
  uuid, boolean, text, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.reconcile_certificate_resend_attempts(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_certificate_resend_attempts(uuid)
  TO service_role;
