-- Bounded Medical Director review lane for the nine reportable medical
-- certificates that were auto-issued before AI-draft requiresReview became a
-- pre-issuance block. This is a fixed historical exception, not a revived
-- post-approval attestation workflow.
--
-- The append-only cohort snapshot preserves the decision-time evidence boundary:
--   * the fixed 90-day window ending at the #442 enforcement commit;
--   * reportable, non-E2E auto-issued medical certificates only;
--   * the latest ready AI clinical note at approval required review, or the
--     latest eligibility audit at approval recorded the same soft flag; and
--   * no dependency on risk_flags backfilled after the clinical decision.
--
-- ai_audit_log is described as immutable but service_role currently has FOR
-- ALL and the table has no anti-mutation trigger. Snapshotting the derived
-- handles here makes cohort membership genuinely append-only without changing
-- or relying on the mutable source tables. A clean database may derive zero
-- rows; the read surface then reports drift and both mutations fail closed.
--
-- A no-correction receipt is append-only compliance evidence bound to the
-- exact current certificate storage version. It never changes the intake,
-- certificate, draft, delivery, or provider state. Correction continues to use
-- revoke_auto_issued_certificate(), which invalidates and reopens atomically.

CREATE TABLE public.historical_auto_issued_review_cohort (
  intake_id uuid PRIMARY KEY,
  source_draft_id uuid,
  source_ai_audit_id uuid,
  decision_evidence text NOT NULL CHECK (
    decision_evidence IN (
      'draft_requires_review',
      'ai_audit_soft_flag',
      'draft_and_audit'
    )
  ),
  snapshotted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_draft_id IS NOT NULL OR source_ai_audit_id IS NOT NULL)
);

CREATE FUNCTION public.prevent_historical_auto_issued_review_cohort_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
  RAISE EXCEPTION 'historical auto-issued review cohort is append-only';
END;
$function$;

CREATE TRIGGER historical_auto_issued_review_cohort_append_only
  BEFORE UPDATE OR DELETE ON public.historical_auto_issued_review_cohort
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_historical_auto_issued_review_cohort_mutation();

REVOKE ALL ON FUNCTION public.prevent_historical_auto_issued_review_cohort_mutation()
  FROM PUBLIC, anon, authenticated;

WITH decision_candidates AS (
  SELECT
    i.id AS intake_id,
    latest_draft.id AS source_draft_id,
    latest_draft.content #>> '{flags,requiresReview}' = 'true' AS draft_requires_review,
    latest_decision_audit.id AS source_ai_audit_id,
    (
      latest_decision_audit.metadata ->> 'eligible' = 'true'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(latest_decision_audit.metadata -> 'softFlags') = 'array'
              THEN latest_decision_audit.metadata -> 'softFlags'
            ELSE '[]'::jsonb
          END
        ) AS audit_soft_flag(value)
        WHERE audit_soft_flag.value = 'draft_review_flag'
           OR audit_soft_flag.value LIKE 'draft_review_flag:%'
      )
    ) AS audit_requires_review
  FROM public.intakes AS i
  LEFT JOIN LATERAL (
    SELECT draft.id, draft.content
    FROM public.document_drafts AS draft
    WHERE draft.intake_id = i.id
      AND draft.type = 'clinical_note'
      AND draft.is_ai_generated IS TRUE
      AND draft.status = 'ready'
      AND draft.created_at <= i.ai_approved_at
    ORDER BY draft.created_at DESC, draft.id DESC
    LIMIT 1
  ) AS latest_draft ON true
  LEFT JOIN LATERAL (
    SELECT decision_audit.id, decision_audit.metadata
    FROM public.ai_audit_log AS decision_audit
    WHERE decision_audit.intake_id = i.id
      AND decision_audit.action = 'auto_approve'
      AND decision_audit.metadata ? 'eligible'
      AND decision_audit.created_at <= i.ai_approved_at
    ORDER BY decision_audit.created_at DESC, decision_audit.id DESC
    LIMIT 1
  ) AS latest_decision_audit ON true
  WHERE i.ai_approved IS TRUE
    AND i.category = 'medical_certificate'
    AND i.ai_approved_at >= '2026-05-12T13:35:54Z'::timestamptz
    AND i.ai_approved_at < '2026-08-10T13:35:54Z'::timestamptz
    AND coalesce(i.exclude_from_reporting, false) IS FALSE
    AND i.patient_id NOT IN (
      'e2e00000-0000-0000-0000-000000000002'::uuid,
      'e2e00000-0000-0000-0000-000000000090'::uuid,
      'e2e00000-0000-0000-0000-0000000000a1'::uuid,
      'e2e00000-0000-0000-0000-0000000000a2'::uuid,
      'e2e00000-0000-0000-0000-0000000000a3'::uuid
    )
    AND coalesce(i.reference_number, '') !~* '^E2E-'
), snapshot_rows AS (
  SELECT
    intake_id,
    source_draft_id,
    source_ai_audit_id,
    CASE
      WHEN draft_requires_review AND audit_requires_review THEN 'draft_and_audit'
      WHEN audit_requires_review THEN 'ai_audit_soft_flag'
      ELSE 'draft_requires_review'
    END AS decision_evidence
  FROM decision_candidates
  WHERE draft_requires_review OR audit_requires_review
)
INSERT INTO public.historical_auto_issued_review_cohort (
  intake_id,
  source_draft_id,
  source_ai_audit_id,
  decision_evidence
)
SELECT
  intake_id,
  source_draft_id,
  source_ai_audit_id,
  decision_evidence
FROM snapshot_rows
ON CONFLICT (intake_id) DO NOTHING;

ALTER TABLE public.historical_auto_issued_review_cohort ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.historical_auto_issued_review_cohort
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.historical_auto_issued_review_cohort TO service_role;

COMMENT ON TABLE public.historical_auto_issued_review_cohort IS
  'Append-only PHI-free handles for the migration-derived pre-enforcement Medical Director retrospective; mutations separately require an exact nine-row global cohort';

CREATE VIEW public.v_historical_auto_issued_review_source
WITH (security_invoker = on) AS
SELECT
  i.id AS intake_id,
  i.reference_number,
  i.ai_approved_at,
  i.status AS intake_status,
  cohort.source_draft_id,
  latest_certificate.id AS current_certificate_id,
  latest_certificate.status AS current_certificate_status,
  latest_certificate.created_at AS certificate_created_at,
  CASE
    WHEN nullif(latest_certificate.storage_path, '') IS NULL THEN NULL
    ELSE left(
      encode(extensions.digest(latest_certificate.storage_path, 'sha256'), 'hex'),
      32
    )
  END AS current_certificate_storage_version,
  EXISTS (
    SELECT 1
    FROM public.ai_audit_log AS correction
    WHERE correction.intake_id = i.id
      AND correction.action = 'reject'
      AND correction.metadata ->> 'event' = 'auto_issued_revoked_to_review'
  ) AS correction_started,
  EXISTS (
    SELECT 1
    FROM public.compliance_audit_log AS receipt
    WHERE receipt.intake_id = i.id
      AND receipt.event_type = 'clinician_reviewed_request'
      AND receipt.is_human_action IS TRUE
      AND receipt.event_data ->> 'review_context' =
        'historical_auto_issued_draft_review'
      AND receipt.event_data ->> 'review_outcome' =
        'no_correction_required'
      AND receipt.event_data ->> 'certificate_id' =
        latest_certificate.id::text
      AND receipt.event_data ->> 'certificate_storage_version' =
        CASE
          WHEN nullif(latest_certificate.storage_path, '') IS NULL THEN NULL
          ELSE left(
            encode(extensions.digest(latest_certificate.storage_path, 'sha256'), 'hex'),
            32
          )
        END
  ) AS no_correction_recorded
FROM public.historical_auto_issued_review_cohort AS cohort
JOIN public.intakes AS i ON i.id = cohort.intake_id
LEFT JOIN LATERAL (
  SELECT certificate.id,
         certificate.status,
         certificate.storage_path,
         certificate.created_at
  FROM public.issued_certificates AS certificate
  WHERE certificate.intake_id = i.id
  ORDER BY certificate.created_at DESC, certificate.id DESC
  LIMIT 1
) AS latest_certificate ON true;

ALTER VIEW public.v_historical_auto_issued_review_source
  SET (security_invoker = on);
REVOKE ALL ON public.v_historical_auto_issued_review_source
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_historical_auto_issued_review_source TO service_role;

COMMENT ON VIEW public.v_historical_auto_issued_review_source IS
  'PHI-minimized current state for the append-only pre-enforcement auto-issued certificate review cohort';

-- One no-correction receipt per intake and exact certificate version. A later
-- certificate version cannot inherit the earlier human review.
CREATE UNIQUE INDEX compliance_historical_auto_issued_review_receipt_unique
  ON public.compliance_audit_log (
    intake_id,
    ((event_data ->> 'certificate_id')),
    ((event_data ->> 'certificate_storage_version'))
  )
  WHERE event_type = 'clinician_reviewed_request'
    AND is_human_action IS TRUE
    AND event_data ->> 'review_context' =
      'historical_auto_issued_draft_review'
    AND event_data ->> 'review_outcome' = 'no_correction_required';

CREATE FUNCTION public.get_historical_auto_issued_review_lane()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  WITH classified AS (
    SELECT
      source.*,
      (
        source.correction_started
        OR source.no_correction_recorded
      ) AS resolved,
      (
        source.intake_status = 'approved'
        AND source.current_certificate_status = 'valid'
        AND source.current_certificate_id IS NOT NULL
        AND source.current_certificate_storage_version IS NOT NULL
      ) AS ready_for_review
    FROM public.v_historical_auto_issued_review_source AS source
  )
  SELECT jsonb_build_object(
    'expectedCount', 9,
    'cohortCount', count(*),
    'resolvedCount', count(*) FILTER (WHERE resolved),
    'unresolvedCount', count(*) FILTER (WHERE NOT resolved),
    'cases', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'intakeId', intake_id,
          'referenceNumber', reference_number,
          'aiApprovedAt', ai_approved_at,
          'certificateCreatedAt', certificate_created_at,
          'state', CASE
            WHEN ready_for_review THEN 'ready_for_review'
            ELSE 'state_changed'
          END
        )
        ORDER BY ai_approved_at ASC, intake_id ASC
      ) FILTER (WHERE NOT resolved),
      '[]'::jsonb
    )
  )
  FROM classified;
$function$;

REVOKE ALL ON FUNCTION public.get_historical_auto_issued_review_lane()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_historical_auto_issued_review_lane()
  TO service_role;

COMMENT ON FUNCTION public.get_historical_auto_issued_review_lane() IS
  'Returns only PHI-minimized progress and unresolved rows for the fixed nine-case Medical Director retrospective; service role only';

CREATE FUNCTION public.open_historical_auto_issued_review_case(
  p_intake_id uuid,
  p_actor_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_role text;
  v_cohort_count integer;
  v_source record;
BEGIN
  SELECT profile.role::text
    INTO v_actor_role
    FROM public.profiles AS profile
   WHERE profile.id = p_actor_id
     AND profile.auth_user_id IS NOT NULL;

  IF v_actor_role IS DISTINCT FROM 'admin' THEN
    RETURN 'actor_not_authorized';
  END IF;

  SELECT count(*)::integer
    INTO v_cohort_count
    FROM public.v_historical_auto_issued_review_source;

  IF v_cohort_count <> 9 THEN
    RETURN 'cohort_mismatch';
  END IF;

  SELECT source.*
    INTO v_source
    FROM public.v_historical_auto_issued_review_source AS source
   WHERE source.intake_id = p_intake_id;

  IF NOT FOUND THEN
    RETURN 'case_not_found';
  END IF;

  IF v_source.correction_started OR v_source.no_correction_recorded THEN
    RETURN 'already_resolved';
  END IF;

  IF v_source.intake_status <> 'approved'
     OR v_source.current_certificate_status <> 'valid'
     OR v_source.current_certificate_id IS NULL
     OR v_source.current_certificate_storage_version IS NULL THEN
    RETURN 'case_state_changed';
  END IF;

  -- Recheck immediately before the audit mutation. Clean/preview databases
  -- with no historical production rows remain migratable but cannot write.
  SELECT count(*)::integer
    INTO v_cohort_count
    FROM public.v_historical_auto_issued_review_source;

  IF v_cohort_count <> 9 THEN
    RETURN 'cohort_mismatch';
  END IF;

  INSERT INTO public.compliance_audit_log (
    event_type,
    intake_id,
    request_type,
    actor_id,
    actor_role,
    is_human_action,
    event_data
  ) VALUES (
    'clinician_opened_request',
    p_intake_id,
    'med_cert',
    p_actor_id,
    'clinician',
    true,
    jsonb_build_object(
      'review_context', 'historical_auto_issued_draft_review',
      'certificate_id', v_source.current_certificate_id,
      'certificate_storage_version', v_source.current_certificate_storage_version,
      'source_draft_id', v_source.source_draft_id
    )
  );

  RETURN 'opened';
END;
$function$;

REVOKE ALL ON FUNCTION public.open_historical_auto_issued_review_case(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_historical_auto_issued_review_case(uuid, uuid)
  TO service_role;

COMMENT ON FUNCTION public.open_historical_auto_issued_review_case(uuid, uuid) IS
  'Records a contextual same-version clinician open for one unresolved fixed-cohort case; admin Medical Director and service role only';

CREATE FUNCTION public.record_historical_auto_issued_no_correction(
  p_intake_id uuid,
  p_actor_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_role text;
  v_cohort_count integer;
  v_preflight record;
  v_locked_certificate record;
  v_locked_intake record;
  v_source record;
  v_open_event record;
BEGIN
  SELECT profile.role::text
    INTO v_actor_role
    FROM public.profiles AS profile
   WHERE profile.id = p_actor_id
     AND profile.auth_user_id IS NOT NULL;

  IF v_actor_role IS DISTINCT FROM 'admin' THEN
    RETURN 'actor_not_authorized';
  END IF;

  SELECT count(*)::integer
    INTO v_cohort_count
    FROM public.v_historical_auto_issued_review_source;

  IF v_cohort_count <> 9 THEN
    RETURN 'cohort_mismatch';
  END IF;

  -- Non-locking preflight preserves useful refusal outcomes. Every source and
  -- current-version predicate is repeated after both rows are locked.
  SELECT source.*
    INTO v_preflight
    FROM public.v_historical_auto_issued_review_source AS source
   WHERE source.intake_id = p_intake_id;

  IF NOT FOUND THEN
    RETURN 'case_not_found';
  END IF;

  IF v_preflight.correction_started THEN
    RETURN 'correction_started';
  END IF;

  IF v_preflight.no_correction_recorded THEN
    RETURN 'already_recorded';
  END IF;

  IF v_preflight.intake_status <> 'approved'
     OR v_preflight.current_certificate_status <> 'valid'
     OR v_preflight.current_certificate_id IS NULL
     OR v_preflight.current_certificate_storage_version IS NULL THEN
    RETURN 'case_state_changed';
  END IF;

  -- Match the deployed revoke_auto_issued_certificate(): certificate first,
  -- then intake. Every exact-version predicate is re-read after both locks.
  SELECT certificate.id,
         certificate.intake_id,
         certificate.status,
         certificate.storage_path
    INTO v_locked_certificate
    FROM public.issued_certificates AS certificate
   WHERE certificate.id = v_preflight.current_certificate_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'case_state_changed';
  END IF;

  IF v_locked_certificate.intake_id IS DISTINCT FROM p_intake_id THEN
    RETURN 'case_state_changed';
  END IF;

  SELECT intake.id, intake.status
    INTO v_locked_intake
    FROM public.intakes AS intake
   WHERE intake.id = p_intake_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'case_not_found';
  END IF;

  SELECT source.*
    INTO v_source
    FROM public.v_historical_auto_issued_review_source AS source
   WHERE source.intake_id = p_intake_id;

  IF NOT FOUND THEN
    RETURN 'case_not_found';
  END IF;

  IF v_source.current_certificate_id IS DISTINCT FROM v_locked_certificate.id
     OR v_source.current_certificate_storage_version IS DISTINCT FROM
       left(encode(extensions.digest(v_locked_certificate.storage_path, 'sha256'), 'hex'), 32)
     OR v_source.intake_status <> 'approved'
     OR v_source.current_certificate_status <> 'valid' THEN
    RETURN 'case_state_changed';
  END IF;

  IF v_source.correction_started THEN
    RETURN 'correction_started';
  END IF;

  IF v_source.no_correction_recorded THEN
    RETURN 'already_recorded';
  END IF;

  SELECT count(*)::integer
    INTO v_cohort_count
    FROM public.v_historical_auto_issued_review_source;

  IF v_cohort_count <> 9 THEN
    RETURN 'cohort_mismatch';
  END IF;

  SELECT opened.id, opened.created_at
    INTO v_open_event
    FROM public.compliance_audit_log AS opened
   WHERE opened.intake_id = p_intake_id
     AND opened.event_type = 'clinician_opened_request'
     AND opened.actor_id = p_actor_id
     AND opened.is_human_action IS TRUE
     AND opened.event_data ->> 'review_context' =
       'historical_auto_issued_draft_review'
     AND opened.event_data ->> 'certificate_storage_version' =
       v_source.current_certificate_storage_version
     AND opened.event_data ->> 'certificate_id' =
       v_source.current_certificate_id::text
   ORDER BY opened.created_at DESC, opened.id DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'case_not_opened';
  END IF;

  BEGIN
    INSERT INTO public.compliance_audit_log (
      event_type,
      intake_id,
      request_type,
      actor_id,
      actor_role,
      is_human_action,
      event_data
    ) VALUES (
      'clinician_reviewed_request',
      p_intake_id,
      'med_cert',
      p_actor_id,
      'clinician',
      true,
      jsonb_build_object(
        'review_context', 'historical_auto_issued_draft_review',
        'review_outcome', 'no_correction_required',
        'certificate_id', v_source.current_certificate_id,
        'certificate_storage_version', v_source.current_certificate_storage_version,
        'source_draft_id', v_source.source_draft_id,
        'opened_event_id', v_open_event.id,
        'opened_at', v_open_event.created_at
      )
    );
  EXCEPTION
    WHEN unique_violation THEN
      RETURN 'already_recorded';
  END;

  RETURN 'recorded';
END;
$function$;

REVOKE ALL ON FUNCTION public.record_historical_auto_issued_no_correction(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_historical_auto_issued_no_correction(uuid, uuid)
  TO service_role;

COMMENT ON FUNCTION public.record_historical_auto_issued_no_correction(uuid, uuid) IS
  'Records one human no-correction receipt after a same-actor contextual open of the exact current certificate version; never changes clinical, certificate, delivery, or provider state';
