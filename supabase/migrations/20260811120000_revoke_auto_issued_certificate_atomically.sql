-- Make auto-issued certificate correction one transaction.
--
-- The admin correction path (app/actions/revoke-ai-approval.ts) previously ran
-- as split service-role writes: revoke the certificate, then reopen the intake,
-- then insert the AI audit event — with no compensation between them. A failure
-- after the first write stranded a REVOKED certificate on an APPROVED intake
-- (the exact split-brain the 2026-07-11 trigger widening exists to police), and
-- a failed reopen returned before the ai_audit_log insert ever ran, so the
-- correction left no AI audit trail.
--
-- This RPC performs the whole correction in one transaction under FOR UPDATE
-- row locks: revoke the latest certificate, reopen the intake (the existing
-- validate_intake_status_transition trigger sees the revoked certificate in
-- the same transaction), and write both audit events — or none of it.
--
-- Narrow boundary: this is the admin-only HISTORICAL correction path for
-- auto-issued medical certificates. It is not ordinary certificate lifecycle
-- and not a protocol-issuance reactivation (issuance remains governance-paused
-- per lib/clinical/auto-approval-governance.ts).
--
-- Concurrency: the intake FOR UPDATE lock serializes concurrent calls; the
-- loser of the race observes in_review + revoked and returns the idempotent
-- 'already_reopened' outcome without duplicate audit rows.

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
  v_now timestamptz := now();
BEGIN
  v_reason := btrim(coalesce(p_reason, ''));
  IF length(v_reason) < 5 OR length(v_reason) > 2000 THEN
    RAISE EXCEPTION 'revocation reason must be 5-2000 characters'
      USING ERRCODE = '22023';
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

  SELECT c.id, c.status
    INTO v_certificate
    FROM public.issued_certificates AS c
   WHERE c.intake_id = p_intake_id
   ORDER BY c.created_at DESC
   LIMIT 1
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'certificate_not_found'::text, NULL::uuid, v_intake.patient_id;
    RETURN;
  END IF;

  -- Idempotent end state: a concurrent or repeated call finds the correction
  -- already complete and reports it without duplicate audits.
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

  -- The lifecycle trigger permits approved -> in_review only because the
  -- certificate row above is revoked inside this same transaction.
  UPDATE public.intakes
     SET status = 'in_review',
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

COMMENT ON FUNCTION public.revoke_auto_issued_certificate(uuid, uuid, text, text, text) IS
  'Admin-only historical correction: atomically revoke the latest certificate for an auto-issued medical-certificate intake and return it to in_review, with both audit events, in one transaction. Not ordinary certificate lifecycle; not a protocol-issuance reactivation.';

-- Service-role only. Browser roles must never execute a correction that takes
-- row locks on intakes and certificates.
REVOKE ALL ON FUNCTION public.revoke_auto_issued_certificate(uuid, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_auto_issued_certificate(uuid, uuid, text, text, text)
  TO service_role;
