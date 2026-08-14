-- Give every application consumer of v_stuck_intakes the two source columns
-- required by filterReportableIntakes(). The view remains the canonical stuck
-- classification; System Health, Operations, and its Sentry warnings apply the
-- same reportability boundary rather than reimplementing exclusions.
--
-- Append the columns to preserve the existing view column order. CREATE OR
-- REPLACE also preserves dependencies and avoids a DROP/CREATE privilege gap.

CREATE OR REPLACE VIEW public.v_stuck_intakes
WITH (security_invoker = on) AS
WITH intake_with_timing AS (
  SELECT
    i.id,
    i.reference_number,
    i.status,
    i.payment_status,
    i.category,
    i.subtype,
    i.is_priority,
    i.created_at,
    i.paid_at,
    i.reviewed_at,
    i.approved_at,
    i.completed_at,
    i.patient_id,
    i.exclude_from_reporting,
    p.email AS patient_email,
    p.full_name AS patient_name,
    s.name AS service_name,
    s.type AS service_type,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(i.paid_at, i.created_at))) / 60 AS minutes_since_paid,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(i.reviewed_at, i.paid_at, i.created_at))) / 60 AS minutes_in_review,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(i.approved_at, i.created_at))) / 60 AS minutes_since_approved,
    CASE
      -- A correction replaces the current certificate in place and atomically
      -- clears its email markers. A revoke/reissue creates a new valid row.
      -- Only the latest valid certificate can prove delivery; the intake
      -- mirror and historical outbox rows are deliberately insufficient.
      WHEN i.category = 'medical_certificate'
      THEN current_certificate.email_sent_at IS NOT NULL
      ELSE (
        i.document_sent_at IS NOT NULL
        OR EXISTS (
          SELECT 1
          FROM public.email_outbox eo
          WHERE eo.intake_id = i.id
            AND eo.email_type IN ('request_approved', 'certificate_delivery', 'med_cert_patient', 'script_sent')
            AND eo.status IN ('sent', 'skipped_e2e')
        )
      )
    END AS delivery_email_sent,
    CASE
      WHEN i.category = 'medical_certificate' THEN (
        current_certificate.email_failed_at IS NOT NULL
        AND current_certificate.email_sent_at IS NULL
      )
      ELSE EXISTS (
        SELECT 1
        FROM public.email_outbox eo
        WHERE eo.intake_id = i.id
          AND eo.email_type IN ('request_approved', 'certificate_delivery', 'med_cert_patient', 'script_sent')
          AND eo.status = 'failed'
      )
    END AS delivery_email_failed
  FROM public.intakes i
  LEFT JOIN public.profiles p ON p.id = i.patient_id
  LEFT JOIN public.services s ON s.id = i.service_id
  LEFT JOIN LATERAL (
    SELECT
      ic.email_sent_at,
      ic.email_failed_at
    FROM public.issued_certificates ic
    WHERE ic.intake_id = i.id
      AND ic.status = 'valid'
    ORDER BY ic.created_at DESC, ic.id DESC
    LIMIT 1
  ) AS current_certificate ON true
  WHERE i.status NOT IN ('draft', 'pending_payment', 'completed', 'declined', 'cancelled', 'expired')
    AND i.payment_status IN ('paid', 'partially_refunded')
)
SELECT
  id,
  reference_number,
  status,
  payment_status,
  category,
  subtype,
  service_name,
  service_type,
  is_priority,
  patient_email,
  patient_name,
  created_at,
  paid_at,
  reviewed_at,
  approved_at,
  minutes_since_paid,
  minutes_in_review,
  minutes_since_approved,
  delivery_email_sent,
  delivery_email_failed,
  CASE
    WHEN status = 'paid'
      AND minutes_since_paid > 5
    THEN 'paid_no_review'

    WHEN status IN ('in_review', 'pending_info')
      AND minutes_in_review > 60
    THEN 'review_timeout'

    WHEN status = 'approved'
      AND delivery_email_failed
      AND NOT delivery_email_sent
    THEN 'delivery_failed'

    WHEN status = 'approved'
      AND minutes_since_approved > 10
      AND NOT delivery_email_sent
    THEN 'delivery_pending'

    ELSE NULL
  END AS stuck_reason,
  CASE
    WHEN status = 'paid' THEN minutes_since_paid
    WHEN status IN ('in_review', 'pending_info') THEN minutes_in_review
    WHEN status = 'approved' THEN minutes_since_approved
    ELSE 0
  END AS stuck_age_minutes,
  patient_id,
  exclude_from_reporting
FROM intake_with_timing
WHERE
  (
    (status = 'paid' AND minutes_since_paid > 5)
    OR (status IN ('in_review', 'pending_info') AND minutes_in_review > 60)
    OR (status = 'approved' AND delivery_email_failed AND NOT delivery_email_sent)
    OR (status = 'approved' AND minutes_since_approved > 10 AND NOT delivery_email_sent)
  );

ALTER VIEW public.v_stuck_intakes SET (security_invoker = on);
REVOKE ALL ON public.v_stuck_intakes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_stuck_intakes TO service_role;

COMMENT ON VIEW public.v_stuck_intakes IS
  'Real-time stuck-intake classification with private reportability filter keys for server-side operational reads';

-- Align the historical auto-issued correction with the certificate-first lock
-- order already used by ordinary revocation and in-place correction. The prior
-- implementation locked the intake first; combined with the delivery-mirror
-- trigger below, that inverse order could deadlock two clinical corrections.
CREATE OR REPLACE FUNCTION public.revoke_auto_issued_certificate(
  p_intake_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_actor_name text,
  p_reason text
)
RETURNS TABLE (outcome text, certificate_id uuid, patient_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_reason text;
  v_intake record;
  v_certificate record;
  v_latest_certificate record;
  v_now timestamptz := now();
BEGIN
  v_reason := btrim(coalesce(p_reason, ''));
  IF length(v_reason) < 5 OR length(v_reason) > 2000 THEN
    RAISE EXCEPTION 'revocation reason must be 5-2000 characters'
      USING ERRCODE = '22023';
  END IF;

  -- A non-locking preflight preserves the domain-specific refusal outcomes.
  -- Every predicate is repeated after both rows are locked, so it grants no
  -- authority and cannot become a time-of-check/time-of-use decision.
  SELECT i.id, i.status, i.ai_approved, i.category, i.patient_id
    INTO v_intake
    FROM public.intakes AS i
   WHERE i.id = p_intake_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'intake_not_found'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  IF v_intake.ai_approved IS NOT TRUE THEN
    RETURN QUERY SELECT 'not_auto_issued'::text, NULL::uuid, v_intake.patient_id;
    RETURN;
  END IF;

  IF v_intake.category <> 'medical_certificate' THEN
    RETURN QUERY SELECT 'wrong_category'::text, NULL::uuid, v_intake.patient_id;
    RETURN;
  END IF;

  SELECT c.id, c.status
    INTO v_certificate
    FROM public.issued_certificates AS c
   WHERE c.intake_id = p_intake_id
   ORDER BY c.created_at DESC, c.id DESC
   LIMIT 1
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'certificate_not_found'::text, NULL::uuid, v_intake.patient_id;
    RETURN;
  END IF;

  SELECT i.id, i.status, i.ai_approved, i.category, i.patient_id
    INTO v_intake
    FROM public.intakes AS i
   WHERE i.id = p_intake_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'intake_not_found'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  IF v_intake.ai_approved IS NOT TRUE THEN
    RETURN QUERY SELECT 'not_auto_issued'::text, NULL::uuid, v_intake.patient_id;
    RETURN;
  END IF;

  IF v_intake.category <> 'medical_certificate' THEN
    RETURN QUERY SELECT 'wrong_category'::text, NULL::uuid, v_intake.patient_id;
    RETURN;
  END IF;

  -- Approval serializes on the intake row before inserting a certificate.
  -- Re-read after acquiring that lock: if an approval committed a newer row
  -- while this function waited, refuse rather than revoking the stale row.
  SELECT c.id, c.status
    INTO v_latest_certificate
    FROM public.issued_certificates AS c
   WHERE c.intake_id = p_intake_id
   ORDER BY c.created_at DESC, c.id DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'certificate_not_found'::text, NULL::uuid, v_intake.patient_id;
    RETURN;
  END IF;

  IF v_latest_certificate.id <> v_certificate.id THEN
    RETURN QUERY SELECT 'certificate_not_revocable'::text, v_latest_certificate.id, v_intake.patient_id;
    RETURN;
  END IF;

  IF v_intake.status = 'in_review' AND v_certificate.status = 'revoked' THEN
    RETURN QUERY SELECT 'already_reopened'::text, v_certificate.id, v_intake.patient_id;
    RETURN;
  END IF;

  IF v_intake.status <> 'approved' THEN
    RETURN QUERY SELECT 'wrong_status'::text, v_certificate.id, v_intake.patient_id;
    RETURN;
  END IF;

  IF v_certificate.status NOT IN ('valid', 'revoked') THEN
    RETURN QUERY SELECT 'certificate_not_revocable'::text, v_certificate.id, v_intake.patient_id;
    RETURN;
  END IF;

  IF v_certificate.status = 'valid' THEN
    UPDATE public.issued_certificates
       SET status = 'revoked',
           revoked_at = v_now,
           revoked_by = p_actor_id,
           revocation_reason = '[AI Review Revocation] ' || v_reason,
           updated_at = v_now
     WHERE id = v_certificate.id;

    INSERT INTO public.certificate_audit_log (
      certificate_id, event_type, actor_id, actor_role, event_data
    ) VALUES (
      v_certificate.id,
      'revoked',
      p_actor_id,
      coalesce(nullif(p_actor_role, ''), 'doctor'),
      jsonb_build_object(
        'reason', '[AI Review Revocation] ' || v_reason,
        'revoked_at', v_now,
        'via', 'revoke_auto_issued_certificate'
      )
    );
  END IF;

  -- Revocation is no longer fulfilment. Clear the mirror while the intake is
  -- locked so neither reapproval nor review-request timing can inherit it.
  UPDATE public.intakes
     SET status = 'in_review',
         document_sent_at = NULL,
         updated_at = v_now
   WHERE id = p_intake_id;

  INSERT INTO public.ai_audit_log (
    intake_id, action, draft_type, draft_id, actor_id, actor_type, reason, metadata
  ) VALUES (
    p_intake_id,
    'reject',
    'med_cert',
    NULL,
    p_actor_id,
    'doctor',
    v_reason,
    jsonb_build_object(
      'revoked_by', p_actor_name,
      'original_status', 'approved',
      'event', 'auto_issued_revoked_to_review'
    )
  );

  RETURN QUERY SELECT 'revoked_and_reopened'::text, v_certificate.id, v_intake.patient_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.revoke_auto_issued_certificate(uuid, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_auto_issued_certificate(uuid, uuid, text, text, text)
  TO service_role;

COMMENT ON FUNCTION public.revoke_auto_issued_certificate(uuid, uuid, text, text, text) IS
  'Admin-only historical correction with certificate-first locking: atomically revoke, clear delivery proof, reopen for manual review, and write both audit events';

-- A revoked certificate is no longer patient fulfilment. Clear the legacy
-- intake mirror in the same transaction so a later reapproval cannot inherit
-- the old document's delivery timestamp and become eligible for a review ask
-- before the replacement certificate is actually sent.
CREATE OR REPLACE FUNCTION public.clear_med_cert_delivery_mirror_on_revocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF OLD.status = 'valid' AND NEW.status = 'revoked' THEN
    UPDATE public.intakes i
    SET document_sent_at = NULL,
        updated_at = now()
    WHERE i.id = NEW.intake_id
      AND i.category = 'medical_certificate'
      AND i.document_sent_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.issued_certificates newer
        WHERE newer.intake_id = NEW.intake_id
          AND newer.status = 'valid'
          AND (newer.created_at, newer.id) > (NEW.created_at, NEW.id)
      );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS clear_med_cert_delivery_mirror_on_revocation
  ON public.issued_certificates;
CREATE TRIGGER clear_med_cert_delivery_mirror_on_revocation
  AFTER UPDATE OF status ON public.issued_certificates
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.clear_med_cert_delivery_mirror_on_revocation();

REVOKE ALL ON FUNCTION public.clear_med_cert_delivery_mirror_on_revocation()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.clear_med_cert_delivery_mirror_on_revocation() IS
  'Clears legacy med-cert delivery proof atomically whenever the current certificate is revoked';

-- Provider delivery reconciliation previously updated issued_certificates and
-- intakes in separate PostgREST calls. A revocation between those calls could
-- clear the mirror and then have the old send restore it. Keep the exact
-- storage-version CAS and both writes in one certificate-first transaction.
CREATE OR REPLACE FUNCTION public.reconcile_certificate_email_status(
  p_certificate_id uuid,
  p_expected_storage_path text,
  p_status text,
  p_delivery_id text DEFAULT NULL,
  p_failure_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_intake_id uuid;
  v_locked_intake_id uuid;
  v_now timestamptz := now();
BEGIN
  IF p_status NOT IN ('sent', 'failed')
     OR NULLIF(btrim(p_expected_storage_path), '') IS NULL THEN
    RETURN false;
  END IF;

  SELECT ic.intake_id
  INTO v_intake_id
  FROM public.issued_certificates ic
  WHERE ic.id = p_certificate_id
    AND ic.storage_path = p_expected_storage_path
    AND ic.status = 'valid'
    AND NOT EXISTS (
      SELECT 1
      FROM public.issued_certificates newer
      WHERE newer.intake_id = ic.intake_id
        AND newer.status = 'valid'
        AND (newer.created_at, newer.id) > (ic.created_at, ic.id)
    )
  FOR UPDATE OF ic;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_status = 'sent' THEN
    SELECT i.id
    INTO v_locked_intake_id
    FROM public.intakes i
    WHERE i.id = v_intake_id
      AND i.category = 'medical_certificate'
      AND i.status IN ('approved', 'completed')
    FOR UPDATE OF i;

    IF NOT FOUND THEN
      RETURN false;
    END IF;

    UPDATE public.issued_certificates
    SET email_sent_at = v_now,
        email_delivery_id = p_delivery_id,
        email_failed_at = NULL,
        email_failure_reason = NULL,
        updated_at = v_now
    WHERE id = p_certificate_id;

    UPDATE public.intakes i
    SET document_sent_at = COALESCE(i.document_sent_at, v_now),
        generated_document_type = 'medical_certificate',
        updated_at = v_now
    WHERE i.id = v_locked_intake_id;
  ELSE
    UPDATE public.issued_certificates
    SET email_failed_at = v_now,
        email_failure_reason = p_failure_reason,
        updated_at = v_now
    WHERE id = p_certificate_id;
  END IF;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_certificate_email_status(uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_certificate_email_status(uuid, text, text, text, text)
  TO service_role;

COMMENT ON FUNCTION public.reconcile_certificate_email_status(uuid, text, text, text, text) IS
  'Version-locked atomic certificate email status and intake delivery-mirror reconciliation';

-- Repair the legacy intake-level delivery mirror without allowing an older
-- email for an in-place-corrected certificate to become current evidence.
-- Every certificate mutation in this migration locks certificate -> intake,
-- so repair can wait normally and then revalidate the exact storage version.
CREATE OR REPLACE FUNCTION public.repair_certificate_document_sent_at(
  p_intake_id uuid,
  p_certificate_id uuid,
  p_outbox_id uuid,
  p_expected_storage_version text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_locked_intake_id uuid;
  v_storage_path text;
  v_document_sent_at timestamptz;
  v_updated_rows integer;
BEGIN
  IF p_expected_storage_version !~ '^[0-9a-f]{32}$' THEN
    RETURN false;
  END IF;

  SELECT ic.storage_path
  INTO v_storage_path
  FROM public.issued_certificates ic
  WHERE ic.id = p_certificate_id
    AND ic.intake_id = p_intake_id
    AND ic.status = 'valid'
    AND NOT EXISTS (
      SELECT 1
      FROM public.issued_certificates newer
      WHERE newer.intake_id = ic.intake_id
        AND newer.status = 'valid'
        AND (newer.created_at, newer.id) > (ic.created_at, ic.id)
    )
  FOR UPDATE OF ic;

  IF NOT FOUND
     OR left(encode(extensions.digest(v_storage_path, 'sha256'), 'hex'), 32)
        <> p_expected_storage_version THEN
    RETURN false;
  END IF;

  SELECT i.id
  INTO v_locked_intake_id
  FROM public.intakes i
  WHERE i.id = p_intake_id
    AND i.category = 'medical_certificate'
    AND i.status IN ('approved', 'completed')
    AND i.document_sent_at IS NULL
    AND COALESCE(i.exclude_from_reporting, false) = false
  FOR UPDATE OF i;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT COALESCE(eo.sent_at, eo.updated_at, eo.created_at)
  INTO v_document_sent_at
  FROM public.email_outbox eo
  WHERE eo.id = p_outbox_id
    AND eo.intake_id = p_intake_id
    AND eo.certificate_id = p_certificate_id
    AND eo.email_type = 'med_cert_patient'
    AND eo.status = 'sent'
    AND eo.metadata->>'certificate_storage_version' = p_expected_storage_version;

  IF v_document_sent_at IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.intakes i
  SET document_sent_at = v_document_sent_at,
      generated_document_type = 'medical_certificate',
      updated_at = now()
  WHERE i.id = v_locked_intake_id
    AND i.category = 'medical_certificate'
    AND i.status IN ('approved', 'completed')
    AND i.document_sent_at IS NULL
    AND COALESCE(i.exclude_from_reporting, false) = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  RETURN v_updated_rows = 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.repair_certificate_document_sent_at(uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.repair_certificate_document_sent_at(uuid, uuid, uuid, text)
  TO service_role;

COMMENT ON FUNCTION public.repair_certificate_document_sent_at(uuid, uuid, uuid, text) IS
  'Version-locked service-role repair for the legacy med-cert document_sent_at mirror';
