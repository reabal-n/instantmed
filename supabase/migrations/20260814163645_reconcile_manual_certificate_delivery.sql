-- Preserve honest delivery evidence for legacy certificates that were sent
-- outside the provider-tracked email path. This ledger is deliberately
-- separate from issued_certificates.email_sent_at and intakes.document_sent_at:
-- an operator attestation must not masquerade as provider acceptance, provider
-- delivery, or an exact historical send timestamp.

CREATE TABLE public.certificate_delivery_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL
    REFERENCES public.issued_certificates(id) ON DELETE RESTRICT,
  intake_id uuid NOT NULL
    REFERENCES public.intakes(id) ON DELETE RESTRICT,
  certificate_storage_version text NOT NULL
    CHECK (certificate_storage_version ~ '^[0-9a-f]{32}$'),
  evidence_kind text NOT NULL
    CHECK (evidence_kind = 'operator_attested_manual_delivery'),
  delivery_occurred_at timestamptz,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certificate_delivery_reconciliations_one_per_version
    UNIQUE (certificate_id, certificate_storage_version),
  CONSTRAINT certificate_delivery_reconciliations_known_time_not_future
    CHECK (delivery_occurred_at IS NULL OR delivery_occurred_at <= recorded_at)
);

CREATE INDEX certificate_delivery_reconciliations_intake_idx
  ON public.certificate_delivery_reconciliations (intake_id, recorded_at DESC);

ALTER TABLE public.certificate_delivery_reconciliations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.certificate_delivery_reconciliations
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.certificate_delivery_reconciliations TO service_role;

COMMENT ON TABLE public.certificate_delivery_reconciliations IS
  'Append-only, non-PHI evidence that an exact current certificate was manually delivered outside provider-tracked email';
COMMENT ON COLUMN public.certificate_delivery_reconciliations.delivery_occurred_at IS
  'Actual historical delivery time when independently known; NULL means the operator confirmed delivery but the exact time is unknown';

CREATE FUNCTION public.reject_certificate_delivery_reconciliation_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  RAISE EXCEPTION 'certificate delivery reconciliations are append-only'
    USING ERRCODE = '55000';
END;
$function$;

CREATE TRIGGER certificate_delivery_reconciliations_append_only
  BEFORE UPDATE OR DELETE ON public.certificate_delivery_reconciliations
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_certificate_delivery_reconciliation_mutation();

REVOKE ALL ON FUNCTION public.reject_certificate_delivery_reconciliation_mutation()
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.record_manual_certificate_delivery_reconciliation(
  p_certificate_id uuid,
  p_recorded_by uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_certificate record;
  v_intake record;
  v_actor_role text;
  v_inserted_id uuid;
BEGIN
  SELECT p.role::text
    INTO v_actor_role
    FROM public.profiles AS p
   WHERE p.id = p_recorded_by
     AND p.auth_user_id IS NOT NULL;

  IF v_actor_role IS DISTINCT FROM 'admin' THEN
    RETURN 'actor_not_authorized';
  END IF;

  -- Match the certificate -> intake lock order used by certificate correction
  -- and revocation. The current-valid predicate is repeated after both locks.
  SELECT
    c.id,
    c.intake_id,
    c.status,
    c.created_at,
    left(encode(extensions.digest(c.storage_path, 'sha256'), 'hex'), 32)
      AS storage_version
    INTO v_certificate
    FROM public.issued_certificates AS c
   WHERE c.id = p_certificate_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'certificate_not_found';
  END IF;

  SELECT i.id, i.category, i.status
    INTO v_intake
    FROM public.intakes AS i
   WHERE i.id = v_certificate.intake_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'intake_not_found';
  END IF;

  IF v_intake.category <> 'medical_certificate'
     OR v_intake.status NOT IN ('approved', 'completed') THEN
    RETURN 'intake_not_reconcilable';
  END IF;

  IF v_certificate.status <> 'valid'
     OR EXISTS (
       SELECT 1
       FROM public.issued_certificates AS newer
       WHERE newer.intake_id = v_certificate.intake_id
         AND newer.status = 'valid'
         AND (newer.created_at, newer.id) > (v_certificate.created_at, v_certificate.id)
     ) THEN
    RETURN 'certificate_not_current_valid';
  END IF;

  INSERT INTO public.certificate_delivery_reconciliations (
    certificate_id,
    intake_id,
    certificate_storage_version,
    evidence_kind,
    delivery_occurred_at,
    recorded_by
  ) VALUES (
    v_certificate.id,
    v_certificate.intake_id,
    v_certificate.storage_version,
    'operator_attested_manual_delivery',
    NULL,
    p_recorded_by
  )
  ON CONFLICT (certificate_id, certificate_storage_version) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN 'already_reconciled';
  END IF;

  RETURN 'reconciled';
END;
$function$;

REVOKE ALL ON FUNCTION public.record_manual_certificate_delivery_reconciliation(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_manual_certificate_delivery_reconciliation(uuid, uuid)
  TO service_role;

COMMENT ON FUNCTION public.record_manual_certificate_delivery_reconciliation(uuid, uuid) IS
  'Records an admin-attested legacy manual delivery only for the exact current valid certificate; never rewrites provider, intake delivery, or certificate-validity state';

-- Keep the existing view contract stable while allowing an exact current-valid
-- reconciliation row to satisfy the operational delivery check. An intake
-- whose only certificate is revoked or superseded still has no current
-- certificate and remains an integrity escalation.
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
      WHEN i.category = 'medical_certificate'
      THEN (
        current_certificate.email_sent_at IS NOT NULL
        OR COALESCE(current_certificate.delivery_reconciled, false)
      )
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
        AND NOT COALESCE(current_certificate.delivery_reconciled, false)
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
      ic.email_failed_at,
      EXISTS (
        SELECT 1
        FROM public.certificate_delivery_reconciliations AS reconciliation
        WHERE reconciliation.certificate_id = ic.id
          AND reconciliation.intake_id = i.id
          AND reconciliation.certificate_storage_version =
            left(encode(extensions.digest(ic.storage_path, 'sha256'), 'hex'), 32)
      ) AS delivery_reconciled
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
  'Real-time stuck-intake classification; exact current-valid manual-delivery reconciliations satisfy delivery without rewriting provider state';
