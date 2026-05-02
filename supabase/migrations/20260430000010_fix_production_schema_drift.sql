-- ============================================================================
-- Production schema drift hardening
--
-- Remote lint found legacy functions compiled against tables/columns that no
-- longer exist in production. Keep the public RPC contracts stable, but point
-- them at the current schema and make retired lookup functions degrade safely.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Medication search: current table shape is name/brand/category/forms based.
-- The previous live RPC expected generic_name/strength/form/pbs_listed/s8_drug
-- columns that are not present in production.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.search_medications(text, integer);

CREATE OR REPLACE FUNCTION public.search_medications(
  search_query text,
  limit_results integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  brand_names text[],
  category text,
  category_label text,
  schedule text,
  forms jsonb,
  default_form text,
  default_strength text,
  is_common boolean,
  rank real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.name,
    COALESCE(m.brand_names, '{}'::text[]) AS brand_names,
    m.category,
    m.category_label,
    m.schedule,
    COALESCE(m.forms, '[]'::jsonb) AS forms,
    m.default_form,
    m.default_strength,
    COALESCE(m.is_common, false) AS is_common,
    ts_rank(m.search_vector, websearch_to_tsquery('english', search_query)) AS rank
  FROM public.medications m
  WHERE COALESCE(m.is_active, true) = true
    AND (
      m.search_vector @@ websearch_to_tsquery('english', search_query)
      OR m.name ILIKE '%' || search_query || '%'
      OR m.category_label ILIKE '%' || search_query || '%'
      OR EXISTS (
        SELECT 1
        FROM unnest(COALESCE(m.brand_names, '{}'::text[])) AS bn
        WHERE bn ILIKE '%' || search_query || '%'
      )
    )
  ORDER BY
    COALESCE(m.is_common, false) DESC,
    ts_rank(m.search_vector, websearch_to_tsquery('english', search_query)) DESC,
    COALESCE(m.display_order, 100) ASC,
    m.name ASC
  LIMIT limit_results;
END;
$$;

REVOKE ALL ON FUNCTION public.search_medications(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_medications(text, integer) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Safety audit compatibility: legacy overloads are not used by client code, but
-- keeping them valid prevents production lint failures and preserves service
-- role compatibility for old server paths.
-- ---------------------------------------------------------------------------
ALTER TABLE public.safety_audit_log
  ADD COLUMN IF NOT EXISTS request_id uuid,
  ADD COLUMN IF NOT EXISTS evaluation_type text,
  ADD COLUMN IF NOT EXISTS medication_name text,
  ADD COLUMN IF NOT EXISTS result text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS flags text[],
  ADD COLUMN IF NOT EXISTS input_data jsonb,
  ADD COLUMN IF NOT EXISTS output_data jsonb,
  ADD COLUMN IF NOT EXISTS risk_score integer,
  ADD COLUMN IF NOT EXISTS requires_review boolean,
  ADD COLUMN IF NOT EXISTS details text;

DROP FUNCTION IF EXISTS public.log_safety_evaluation(uuid, text, jsonb, text, text);
CREATE OR REPLACE FUNCTION public.log_safety_evaluation(
  p_request_id uuid,
  p_evaluation_type text,
  p_input_data jsonb,
  p_result text,
  p_details text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.safety_audit_log (
    draft_id,
    session_id,
    service_slug,
    outcome,
    risk_tier,
    triggered_rule_ids,
    answers_snapshot,
    request_id,
    evaluation_type,
    input_data,
    result,
    details
  )
  VALUES (
    NULL,
    COALESCE(p_request_id::text, 'legacy'),
    'legacy_safety_evaluation',
    COALESCE(NULLIF(p_result, ''), 'unknown'),
    'unknown',
    ARRAY[]::text[],
    COALESCE(p_input_data, '{}'::jsonb),
    p_request_id,
    p_evaluation_type,
    COALESCE(p_input_data, '{}'::jsonb),
    p_result,
    p_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

DROP FUNCTION IF EXISTS public.log_safety_evaluation(uuid, text, text, text, text, text[], jsonb, jsonb, integer, boolean, uuid);
CREATE OR REPLACE FUNCTION public.log_safety_evaluation(
  p_request_id uuid,
  p_evaluation_type text,
  p_medication_name text,
  p_result text,
  p_reason text,
  p_flags text[],
  p_input_data jsonb,
  p_output_data jsonb,
  p_risk_score integer,
  p_requires_review boolean,
  p_previous_evaluation_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.safety_audit_log (
    draft_id,
    session_id,
    service_slug,
    outcome,
    risk_tier,
    triggered_rule_ids,
    answers_snapshot,
    previous_evaluation_id,
    request_id,
    evaluation_type,
    medication_name,
    result,
    reason,
    flags,
    input_data,
    output_data,
    risk_score,
    requires_review
  )
  VALUES (
    NULL,
    COALESCE(p_request_id::text, 'legacy'),
    'legacy_safety_evaluation',
    COALESCE(NULLIF(p_result, ''), 'unknown'),
    CASE WHEN COALESCE(p_requires_review, false) THEN 'review' ELSE 'low' END,
    COALESCE(p_flags, ARRAY[]::text[]),
    COALESCE(p_input_data, '{}'::jsonb),
    p_previous_evaluation_id,
    p_request_id,
    p_evaluation_type,
    p_medication_name,
    p_result,
    p_reason,
    COALESCE(p_flags, ARRAY[]::text[]),
    COALESCE(p_input_data, '{}'::jsonb),
    COALESCE(p_output_data, '{}'::jsonb),
    p_risk_score,
    p_requires_review
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_safety_evaluation(uuid, text, jsonb, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_safety_evaluation(uuid, text, text, text, text, text[], jsonb, jsonb, integer, boolean, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_safety_evaluation(uuid, text, jsonb, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_safety_evaluation(uuid, text, text, text, text, text[], jsonb, jsonb, integer, boolean, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Intake claim functions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_intake_claim(
  p_intake_id uuid,
  p_doctor_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.intakes
  SET claimed_by = NULL,
      claimed_at = NULL,
      updated_at = now()
  WHERE id = p_intake_id
    AND (claimed_by = p_doctor_id OR claimed_by IS NULL);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_intake_for_review(
  p_intake_id uuid,
  p_doctor_id uuid,
  p_force boolean DEFAULT false
)
RETURNS TABLE (
  success boolean,
  error_message text,
  current_claimant text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_intake record;
  v_timeout_minutes integer := 30;
BEGIN
  SELECT i.*, p.full_name AS claimant_name
  INTO v_intake
  FROM public.intakes i
  LEFT JOIN public.profiles p ON i.claimed_by = p.id
  WHERE i.id = p_intake_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Intake not found'::text, NULL::text;
    RETURN;
  END IF;

  IF v_intake.status NOT IN ('paid', 'in_review') THEN
    RETURN QUERY SELECT false,
      format('Cannot claim intake in ''%s'' status', v_intake.status)::text,
      NULL::text;
    RETURN;
  END IF;

  IF v_intake.claimed_by IS NOT NULL AND v_intake.claimed_by != p_doctor_id THEN
    IF v_intake.claimed_at < now() - (v_timeout_minutes || ' minutes')::interval OR p_force THEN
      UPDATE public.intakes
      SET claimed_by = p_doctor_id,
          claimed_at = now(),
          updated_at = now()
      WHERE id = p_intake_id
        AND status IN ('paid', 'in_review');

      IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Intake status changed during takeover'::text, v_intake.claimant_name;
        RETURN;
      END IF;

      RETURN QUERY SELECT true, NULL::text, v_intake.claimant_name;
      RETURN;
    END IF;

    RETURN QUERY SELECT false,
      format(
        'Already claimed by %s (%s minutes remaining)',
        v_intake.claimant_name,
        CEIL(EXTRACT(EPOCH FROM (v_intake.claimed_at + (v_timeout_minutes || ' minutes')::interval - now())) / 60)::integer
      )::text,
      v_intake.claimant_name;
    RETURN;
  END IF;

  UPDATE public.intakes
  SET claimed_by = p_doctor_id,
      claimed_at = now(),
      updated_at = now()
  WHERE id = p_intake_id
    AND status IN ('paid', 'in_review');

  IF NOT FOUND THEN
    RETURN QUERY SELECT false,
      format('Cannot claim intake in ''%s'' status', v_intake.status)::text,
      NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_intake_claim(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_intake_for_review(uuid, uuid, boolean) TO service_role;

-- ---------------------------------------------------------------------------
-- Legacy guest merge: requests table no longer exists; intakes are canonical.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merge_guest_profile(
  p_guest_profile_id uuid,
  p_authenticated_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_guest_profile_id IS NULL OR p_authenticated_profile_id IS NULL THEN
    RAISE EXCEPTION 'Both profile IDs are required';
  END IF;

  IF p_guest_profile_id = p_authenticated_profile_id THEN
    RAISE EXCEPTION 'Cannot merge a profile with itself';
  END IF;

  UPDATE public.intakes
  SET patient_id = p_authenticated_profile_id,
      updated_at = now()
  WHERE patient_id = p_guest_profile_id;

  UPDATE public.notifications
  SET user_id = p_authenticated_profile_id
  WHERE user_id = p_guest_profile_id;

  IF to_regclass('public.requests') IS NOT NULL THEN
    EXECUTE 'UPDATE public.requests SET patient_id = $1 WHERE patient_id = $2'
    USING p_authenticated_profile_id, p_guest_profile_id;
  END IF;

  DELETE FROM public.profiles
  WHERE id = p_guest_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_guest_profile(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_guest_profile(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- ARTG search: the reference data table is optional in this product. Return an
-- empty result set when the table is absent instead of keeping an invalid RPC.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_artg_products(
  search_query text,
  result_limit integer DEFAULT 15
)
RETURNS TABLE (
  artg_id text,
  product_name text,
  active_ingredients_raw text,
  dosage_form text,
  route text
)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF to_regclass('public.artg_products') IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY EXECUTE $dynamic$
    SELECT
      a.artg_id,
      a.product_name,
      a.active_ingredients_raw,
      a.dosage_form,
      a.route
    FROM public.artg_products a
    WHERE
      a.product_name ILIKE '%' || $1 || '%'
      OR a.active_ingredients_raw ILIKE '%' || $1 || '%'
      OR extensions.similarity(COALESCE(a.product_name, ''), $1) > 0.15
      OR extensions.similarity(COALESCE(a.active_ingredients_raw, ''), $1) > 0.15
    ORDER BY
      GREATEST(
        extensions.similarity(COALESCE(a.product_name, ''), $1),
        extensions.similarity(COALESCE(a.active_ingredients_raw, ''), $1) * 0.8
      ) DESC,
      a.product_name ASC
    LIMIT $2
  $dynamic$ USING search_query, result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_artg_products(text, integer) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Audit archive support: the archive table was referenced by a retention RPC
-- but never created in production.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs_archive (
  id uuid PRIMARY KEY,
  action text NOT NULL,
  request_id uuid,
  actor_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz,
  ip_address text,
  user_agent text,
  archived_at timestamptz NOT NULL DEFAULT now(),
  original_retention_tier text
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_created_at
  ON public.audit_logs_archive(created_at DESC);

CREATE OR REPLACE FUNCTION public.archive_old_audit_logs(
  retention_days integer DEFAULT 730
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  archived_count integer;
  cutoff_date timestamptz;
BEGIN
  cutoff_date := now() - (retention_days || ' days')::interval;

  WITH moved AS (
    DELETE FROM public.audit_logs
    WHERE created_at < cutoff_date
      AND archived_at IS NULL
    RETURNING *
  )
  INSERT INTO public.audit_logs_archive (
    id,
    action,
    request_id,
    actor_id,
    metadata,
    created_at,
    ip_address,
    user_agent,
    archived_at,
    original_retention_tier
  )
  SELECT
    id,
    action,
    request_id,
    actor_id,
    COALESCE(metadata, '{}'::jsonb),
    created_at,
    ip_address,
    user_agent,
    now(),
    retention_tier
  FROM moved
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_old_audit_logs(integer) TO service_role;

-- ---------------------------------------------------------------------------
-- Stripe DLQ compatibility: current table uses intake_id, not request_id.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_to_webhook_dead_letter(
  p_event_id text,
  p_event_type text,
  p_session_id text,
  p_request_id uuid,
  p_error_message text,
  p_error_code text DEFAULT NULL,
  p_payload jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.stripe_webhook_dead_letter (
    event_id,
    event_type,
    session_id,
    intake_id,
    error_message,
    error_code,
    payload
  )
  VALUES (
    p_event_id,
    p_event_type,
    p_session_id,
    p_request_id,
    p_error_message,
    p_error_code,
    p_payload
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_to_webhook_dead_letter(text, text, text, uuid, text, text, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- Draft approval/rejection: document_drafts.type is text in production, while
-- ai_audit_log expects draft_type enum. Cast only supported values.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_draft(
  p_draft_id uuid,
  p_doctor_id uuid,
  p_edited_content jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_intake_id uuid;
  v_draft_type public.draft_type;
BEGIN
  SELECT intake_id, type::public.draft_type
  INTO v_intake_id, v_draft_type
  FROM public.document_drafts
  WHERE id = p_draft_id
    AND type IN ('clinical_note', 'med_cert');

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.document_drafts
  SET approved_by = p_doctor_id,
      approved_at = now(),
      edited_content = COALESCE(p_edited_content, edited_content),
      updated_at = now()
  WHERE id = p_draft_id
    AND approved_at IS NULL
    AND rejected_at IS NULL;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM public.log_ai_audit(
    v_intake_id,
    'approve'::public.ai_audit_action,
    v_draft_type,
    p_draft_id,
    p_doctor_id,
    'doctor'::public.ai_actor_type,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    jsonb_build_object('has_edits', p_edited_content IS NOT NULL),
    NULL
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_draft(
  p_draft_id uuid,
  p_doctor_id uuid,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_intake_id uuid;
  v_draft_type public.draft_type;
BEGIN
  SELECT intake_id, type::public.draft_type
  INTO v_intake_id, v_draft_type
  FROM public.document_drafts
  WHERE id = p_draft_id
    AND type IN ('clinical_note', 'med_cert');

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.document_drafts
  SET rejected_by = p_doctor_id,
      rejected_at = now(),
      rejection_reason = p_reason,
      updated_at = now()
  WHERE id = p_draft_id
    AND approved_at IS NULL
    AND rejected_at IS NULL;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM public.log_ai_audit(
    v_intake_id,
    'reject'::public.ai_audit_action,
    v_draft_type,
    p_draft_id,
    p_doctor_id,
    'doctor'::public.ai_actor_type,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '{}'::jsonb,
    p_reason
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_draft(uuid, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_draft(uuid, uuid, text) TO service_role;
