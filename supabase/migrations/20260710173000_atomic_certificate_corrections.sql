-- Make corrected medical-certificate PDFs rollback-safe and auditable.
--
-- The PDF is first uploaded to a unique object path. This RPC then switches the
-- live certificate row to that object and appends the required correction audit
-- event in one database transaction. If validation or the audit insert fails,
-- the row update is rolled back and the caller removes only the new object.
-- Delivery state is reset for the new PDF version; prior-version delivery and
-- resend counters must never make a corrected document appear delivered.

-- The original intake-events constraint predates patient date corrections.
-- Preserve every existing allowed lifecycle event and add the two correction
-- events used by the request/atomic approval workflow.
ALTER TABLE public.intake_events
  DROP CONSTRAINT IF EXISTS intake_events_event_type_check;

ALTER TABLE public.intake_events
  ADD CONSTRAINT intake_events_event_type_check CHECK (event_type IN (
    'status_change',
    'payment_received',
    'document_generated',
    'email_sent',
    'email_failed',
    'script_sent',
    'refund_processed',
    'escalated',
    'claimed',
    'unclaimed',
    'date_correction_requested',
    'date_correction_approved'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS idx_intake_events_one_pending_date_correction
  ON public.intake_events (intake_id)
  WHERE event_type = 'date_correction_requested'
    AND metadata->>'status' = 'pending';

-- Bind every new patient request to the exact certificate version they saw.
-- Taking the certificate row lock here serializes request creation against the
-- correction RPC, which locks the same row first: an already-pending request
-- blocks a manual correction, while a correction that wins the race makes the
-- stale request version fail instead of leaving an orphaned pending event.
CREATE OR REPLACE FUNCTION public.validate_date_correction_request_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_current_certificate public.issued_certificates%ROWTYPE;
  v_expected_storage_path text;
BEGIN
  IF NEW.event_type <> 'date_correction_requested' THEN
    RETURN NEW;
  END IF;

  IF NEW.metadata->>'status' IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Date correction requests must start pending';
  END IF;

  v_expected_storage_path := NULLIF(
    BTRIM(NEW.metadata->>'certificate_storage_path'),
    ''
  );
  IF v_expected_storage_path IS NULL THEN
    RAISE EXCEPTION 'Date correction request is missing certificate version';
  END IF;

  SELECT certificate.*
  INTO v_current_certificate
  FROM public.issued_certificates AS certificate
  WHERE certificate.intake_id = NEW.intake_id
    AND certificate.status = 'valid'
  ORDER BY certificate.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND
     OR v_current_certificate.storage_path <> v_expected_storage_path THEN
    RAISE EXCEPTION 'Certificate changed before correction request was saved';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_date_correction_request_version()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_date_correction_request_version
  ON public.intake_events;
CREATE TRIGGER validate_date_correction_request_version
BEFORE INSERT ON public.intake_events
FOR EACH ROW
EXECUTE FUNCTION public.validate_date_correction_request_version();

-- If an earlier draft of this migration was applied in a preview environment,
-- remove its shorter overload before creating the event-aware signature.
DROP FUNCTION IF EXISTS public.commit_certificate_correction(
  uuid, text, text, text, jsonb, date, text, date, date, text, integer, uuid, text
);

CREATE OR REPLACE FUNCTION public.commit_certificate_correction(
  p_certificate_id uuid,
  p_expected_storage_path text,
  p_new_storage_path text,
  p_patient_name text,
  p_patient_name_enc jsonb,
  p_patient_dob date,
  p_certificate_type text,
  p_start_date date,
  p_end_date date,
  p_pdf_hash text,
  p_file_size_bytes integer,
  p_actor_id uuid,
  p_actor_role text,
  p_pending_correction_event_id uuid DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  error_message text,
  correction_count integer,
  previous_storage_path text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_certificate public.issued_certificates%ROWTYPE;
  v_correction_count integer;
  v_document_rows integer;
  v_correction_event_metadata jsonb;
  v_correction_event_rows integer;
BEGIN
  IF p_actor_id IS NULL
     OR p_actor_role IS NULL
     OR p_actor_role NOT IN ('doctor', 'admin') THEN
    RAISE EXCEPTION 'Invalid correction actor role';
  END IF;

  IF p_certificate_type NOT IN ('work', 'study', 'carer') THEN
    RAISE EXCEPTION 'Invalid certificate type';
  END IF;

  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Invalid certificate date range';
  END IF;

  IF NULLIF(BTRIM(p_new_storage_path), '') IS NULL
     OR p_new_storage_path = p_expected_storage_path THEN
    RAISE EXCEPTION 'Correction requires a unique storage path';
  END IF;

  SELECT *
  INTO v_certificate
  FROM public.issued_certificates
  WHERE id = p_certificate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate not found';
  END IF;

  IF v_certificate.status <> 'valid' THEN
    RAISE EXCEPTION 'Certificate is no longer valid';
  END IF;

  IF v_certificate.storage_path <> p_expected_storage_path THEN
    RAISE EXCEPTION 'Certificate changed during correction';
  END IF;

  IF p_pending_correction_event_id IS NOT NULL THEN
    SELECT event.metadata
    INTO v_correction_event_metadata
    FROM public.intake_events AS event
    WHERE event.id = p_pending_correction_event_id
      AND event.intake_id = v_certificate.intake_id
      AND event.event_type = 'date_correction_requested'
      AND event.metadata->>'status' = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pending date correction request not found';
    END IF;
  ELSIF p_pending_correction_event_id IS NULL THEN
    -- A manual correction must never bypass a patient request rendered in the
    -- same staff view. Lock and reject it so the clinician must approve or
    -- decline that request explicitly.
    SELECT event.metadata
    INTO v_correction_event_metadata
    FROM public.intake_events AS event
    WHERE event.intake_id = v_certificate.intake_id
      AND event.event_type = 'date_correction_requested'
      AND event.metadata->>'status' = 'pending'
    ORDER BY event.created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      RAISE EXCEPTION 'Pending date correction must be resolved first';
    END IF;
  END IF;

  SELECT COUNT(*)::integer
  INTO v_correction_count
  FROM public.certificate_audit_log AS audit
  WHERE audit.certificate_id = p_certificate_id
    AND audit.event_type = 'superseded'
    AND audit.event_data @> '{"reissue_reason":"doctor_correction"}'::jsonb;

  IF v_correction_count >= 3 THEN
    RAISE EXCEPTION 'Maximum corrections reached (3)';
  END IF;

  UPDATE public.issued_certificates
  SET patient_name = p_patient_name,
      patient_name_enc = p_patient_name_enc,
      patient_dob = p_patient_dob,
      certificate_type = p_certificate_type,
      start_date = p_start_date,
      end_date = p_end_date,
      storage_path = p_new_storage_path,
      pdf_hash = p_pdf_hash,
      file_size_bytes = p_file_size_bytes,
      email_sent_at = NULL,
      email_delivery_id = NULL,
      email_failed_at = NULL,
      email_failure_reason = NULL,
      email_retry_count = 0,
      email_opened_at = NULL,
      resend_count = 0,
      updated_at = NOW()
  WHERE id = p_certificate_id
    AND status = 'valid';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate changed during correction';
  END IF;

  UPDATE public.intakes
  SET document_sent_at = NULL,
      updated_at = NOW()
  WHERE id = v_certificate.intake_id;

  -- intake_documents is a legacy current-alias registry, not a version table.
  -- Switch exactly the alias created by atomic approval; zero or duplicate
  -- matches indicate drift and must roll the whole correction back.
  UPDATE public.intake_documents
  SET storage_path = p_new_storage_path,
      file_size_bytes = p_file_size_bytes,
      metadata = COALESCE(intake_documents.metadata, '{}'::jsonb) || jsonb_build_object(
        'patient_name', p_patient_name,
        'certificate_type', p_certificate_type,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'pdf_hash', p_pdf_hash
      ),
      updated_at = NOW()
  WHERE intake_id = v_certificate.intake_id
    AND document_type = 'med_cert'
    AND certificate_number = v_certificate.certificate_number
    AND storage_path = p_expected_storage_path;

  GET DIAGNOSTICS v_document_rows = ROW_COUNT;
  IF v_document_rows <> 1 THEN
    RAISE EXCEPTION 'Certificate document alias mismatch';
  END IF;

  IF p_pending_correction_event_id IS NOT NULL THEN
    UPDATE public.intake_events
    SET metadata = v_correction_event_metadata || jsonb_build_object(
      'status', 'approved',
      'approved_by', p_actor_id,
      'approved_at', NOW()
    )
    WHERE id = p_pending_correction_event_id
      AND intake_id = v_certificate.intake_id
      AND event_type = 'date_correction_requested'
      AND metadata->>'status' = 'pending';

    GET DIAGNOSTICS v_correction_event_rows = ROW_COUNT;
    IF v_correction_event_rows <> 1 THEN
      RAISE EXCEPTION 'Date correction request changed during approval';
    END IF;

    INSERT INTO public.intake_events (
      intake_id,
      event_type,
      actor_id,
      actor_role,
      metadata
    ) VALUES (
      v_certificate.intake_id,
      'date_correction_approved',
      p_actor_id,
      p_actor_role,
      jsonb_build_object(
        'correction_event_id', p_pending_correction_event_id,
        'new_start_date', p_start_date,
        'new_end_date', p_end_date,
        'certificate_id', p_certificate_id
      )
    );
  END IF;

  INSERT INTO public.certificate_audit_log (
    certificate_id,
    event_type,
    actor_id,
    actor_role,
    event_data
  ) VALUES (
    p_certificate_id,
    'superseded',
    p_actor_id,
    p_actor_role,
    jsonb_build_object(
      'reissue_reason', 'doctor_correction',
      'correction_number', v_correction_count + 1,
      'previous_storage_path', v_certificate.storage_path,
      'new_storage_path', p_new_storage_path,
      'field_changes', jsonb_build_object(
        'patient_name_changed', v_certificate.patient_name IS DISTINCT FROM p_patient_name,
        'patient_dob_changed', v_certificate.patient_dob IS DISTINCT FROM p_patient_dob,
        'certificate_type_changed', v_certificate.certificate_type IS DISTINCT FROM p_certificate_type,
        'start_date_changed', v_certificate.start_date IS DISTINCT FROM p_start_date,
        'end_date_changed', v_certificate.end_date IS DISTINCT FROM p_end_date
      ),
      'previous_pdf_hash', v_certificate.pdf_hash,
      'new_pdf_hash', p_pdf_hash,
      'phi_encrypted', (p_patient_name_enc IS NOT NULL)
    )
  );

  RETURN QUERY SELECT
    TRUE,
    NULL::text,
    v_correction_count + 1,
    v_certificate.storage_path;
EXCEPTION
  WHEN OTHERS THEN
    -- PL/pgSQL rolls back updates made inside this block before entering the
    -- handler, so an audit failure cannot leave the row pointing at the new PDF.
    RETURN QUERY SELECT
      FALSE,
      SQLERRM::text,
      NULL::integer,
      NULL::text;
END;
$function$;

COMMENT ON FUNCTION public.commit_certificate_correction(
  uuid, text, text, text, jsonb, date, text, date, date, text, integer, uuid, text, uuid
) IS 'Atomically commits a versioned certificate correction and its durable audit event; service role only.';

REVOKE ALL ON FUNCTION public.commit_certificate_correction(
  uuid, text, text, text, jsonb, date, text, date, date, text, integer, uuid, text, uuid
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.commit_certificate_correction(
  uuid, text, text, text, jsonb, date, text, date, date, text, integer, uuid, text, uuid
) FROM anon;
REVOKE ALL ON FUNCTION public.commit_certificate_correction(
  uuid, text, text, text, jsonb, date, text, date, date, text, integer, uuid, text, uuid
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.commit_certificate_correction(
  uuid, text, text, text, jsonb, date, text, date, date, text, integer, uuid, text, uuid
) TO service_role;

-- The application inserts audit rows with its service-role client. The legacy
-- SECURITY DEFINER helper must not remain callable by untrusted API roles.
REVOKE ALL ON FUNCTION public.log_certificate_event(
  uuid, public.certificate_event_type, uuid, text, jsonb, inet, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_certificate_event(
  uuid, public.certificate_event_type, uuid, text, jsonb, inet, text
) FROM anon;
REVOKE ALL ON FUNCTION public.log_certificate_event(
  uuid, public.certificate_event_type, uuid, text, jsonb, inet, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_certificate_event(
  uuid, public.certificate_event_type, uuid, text, jsonb, inet, text
) TO service_role;
