-- Align the already-deployed manual-delivery reconciliation RPC with the
-- intake -> certificate row-lock order used by
-- revoke_auto_issued_certificate(). The original migration's opposite order
-- could deadlock if a legacy delivery attestation raced a certificate revoke.
--
-- Forward-only reconciliation hardening: no reconciliation rows, certificates,
-- intakes, delivery timestamps, provider state, or validity state are changed.

-- The ledger is append-only, so ON DELETE SET NULL cannot execute: its
-- referential UPDATE would be rejected by the mutation trigger. Preserve the
-- recorded actor instead and reject deletion of a referenced profile.
ALTER TABLE public.certificate_delivery_reconciliations
  DROP CONSTRAINT certificate_delivery_reconciliations_recorded_by_fkey;

ALTER TABLE public.certificate_delivery_reconciliations
  ADD CONSTRAINT certificate_delivery_reconciliations_recorded_by_fkey
  FOREIGN KEY (recorded_by)
  REFERENCES public.profiles(id)
  ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.record_manual_certificate_delivery_reconciliation(
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
  v_intake_id uuid;
  v_actor_role text;
  v_inserted_id uuid;
BEGIN
  SELECT profile.role::text
    INTO v_actor_role
    FROM public.profiles AS profile
   WHERE profile.id = p_recorded_by
     AND profile.auth_user_id IS NOT NULL;

  IF v_actor_role IS DISTINCT FROM 'admin' THEN
    RETURN 'actor_not_authorized';
  END IF;

  -- Resolve the immutable parent handle without a row lock, then take locks in
  -- the same order as revoke_auto_issued_certificate(): intake, certificate.
  SELECT certificate.intake_id
    INTO v_intake_id
    FROM public.issued_certificates AS certificate
   WHERE certificate.id = p_certificate_id;

  IF NOT FOUND THEN
    RETURN 'certificate_not_found';
  END IF;

  SELECT intake.id, intake.category, intake.status
    INTO v_intake
    FROM public.intakes AS intake
   WHERE intake.id = v_intake_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'intake_not_found';
  END IF;

  SELECT
    certificate.id,
    certificate.intake_id,
    certificate.status,
    certificate.created_at,
    left(
      encode(extensions.digest(certificate.storage_path, 'sha256'), 'hex'),
      32
    ) AS storage_version
    INTO v_certificate
    FROM public.issued_certificates AS certificate
   WHERE certificate.id = p_certificate_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'certificate_not_found';
  END IF;

  IF v_certificate.intake_id IS DISTINCT FROM v_intake.id THEN
    RETURN 'certificate_not_current_valid';
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
         AND (newer.created_at, newer.id) >
           (v_certificate.created_at, v_certificate.id)
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
  'Records admin-attested legacy manual delivery for the exact current valid certificate using the shared intake-then-certificate correction lock order; never rewrites provider, intake delivery, or certificate-validity state';

COMMENT ON CONSTRAINT certificate_delivery_reconciliations_recorded_by_fkey
  ON public.certificate_delivery_reconciliations IS
  'Preserves the actor on append-only manual-delivery evidence by rejecting deletion of referenced profiles';
