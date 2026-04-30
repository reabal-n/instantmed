-- Production drift fix: some live projects no longer have public.consents.
-- Keep patient profile merge atomic, but treat that legacy table as optional.

CREATE OR REPLACE FUNCTION public.merge_patient_profiles(
  p_canonical_profile_id uuid,
  p_duplicate_profile_ids uuid[],
  p_merged_by uuid,
  p_merge_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  duplicate_ids uuid[];
  duplicate_count integer;
  moved_count integer;
  reference_counts jsonb := '{}'::jsonb;
BEGIN
  duplicate_ids := ARRAY(
    SELECT DISTINCT duplicate_id
    FROM unnest(p_duplicate_profile_ids) AS ids(duplicate_id)
    WHERE duplicate_id IS NOT NULL
  );

  IF coalesce(array_length(duplicate_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one duplicate profile to merge.';
  END IF;

  IF p_canonical_profile_id = ANY(duplicate_ids) THEN
    RAISE EXCEPTION 'Duplicate profiles cannot include the canonical profile.';
  END IF;

  PERFORM 1
  FROM public.profiles
  WHERE id = p_canonical_profile_id
    AND role = 'patient'
    AND merged_into_profile_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canonical patient profile was not found.';
  END IF;

  PERFORM 1
  FROM public.profiles
  WHERE id = ANY(duplicate_ids)
  FOR UPDATE;

  SELECT count(*)
  INTO duplicate_count
  FROM public.profiles
  WHERE id = ANY(duplicate_ids)
    AND role = 'patient'
    AND merged_into_profile_id IS NULL;

  IF duplicate_count <> array_length(duplicate_ids, 1) THEN
    RAISE EXCEPTION 'One or more duplicate patient profiles were not found.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = ANY(duplicate_ids)
      AND auth_user_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Signed-in duplicate profiles need manual review before merge.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.patient_health_profiles WHERE patient_id = p_canonical_profile_id
  ) AND EXISTS (
    SELECT 1 FROM public.patient_health_profiles WHERE patient_id = ANY(duplicate_ids)
  ) THEN
    RAISE EXCEPTION 'Both profiles have health profile rows. Review before merge.';
  END IF;

  UPDATE public.intakes
  SET patient_id = p_canonical_profile_id, updated_at = now()
  WHERE patient_id = ANY(duplicate_ids);
  GET DIAGNOSTICS moved_count = ROW_COUNT;
  reference_counts := reference_counts || jsonb_build_object('intakes', moved_count);

  UPDATE public.issued_certificates
  SET patient_id = p_canonical_profile_id, updated_at = now()
  WHERE patient_id = ANY(duplicate_ids);
  GET DIAGNOSTICS moved_count = ROW_COUNT;
  reference_counts := reference_counts || jsonb_build_object('issued_certificates', moved_count);

  UPDATE public.email_outbox
  SET patient_id = p_canonical_profile_id
  WHERE patient_id = ANY(duplicate_ids);
  GET DIAGNOSTICS moved_count = ROW_COUNT;
  reference_counts := reference_counts || jsonb_build_object('email_outbox', moved_count);

  UPDATE public.patient_notes
  SET patient_id = p_canonical_profile_id, updated_at = now()
  WHERE patient_id = ANY(duplicate_ids);
  GET DIAGNOSTICS moved_count = ROW_COUNT;
  reference_counts := reference_counts || jsonb_build_object('patient_notes', moved_count);

  UPDATE public.patient_health_profiles
  SET patient_id = p_canonical_profile_id, updated_at = now()
  WHERE patient_id = ANY(duplicate_ids);
  GET DIAGNOSTICS moved_count = ROW_COUNT;
  reference_counts := reference_counts || jsonb_build_object('patient_health_profiles', moved_count);

  IF to_regclass('public.consents') IS NOT NULL THEN
    EXECUTE 'UPDATE public.consents SET patient_id = $1 WHERE patient_id = ANY($2)'
    USING p_canonical_profile_id, duplicate_ids;
    GET DIAGNOSTICS moved_count = ROW_COUNT;
  ELSE
    moved_count := 0;
  END IF;
  reference_counts := reference_counts || jsonb_build_object('consents', moved_count);

  UPDATE public.patient_consents
  SET patient_id = p_canonical_profile_id
  WHERE patient_id = ANY(duplicate_ids);
  GET DIAGNOSTICS moved_count = ROW_COUNT;
  reference_counts := reference_counts || jsonb_build_object('patient_consents', moved_count);

  UPDATE public.intake_followups
  SET patient_id = p_canonical_profile_id, updated_at = now()
  WHERE patient_id = ANY(duplicate_ids);
  GET DIAGNOSTICS moved_count = ROW_COUNT;
  reference_counts := reference_counts || jsonb_build_object('intake_followups', moved_count);

  UPDATE public.repeat_rx_requests
  SET patient_id = p_canonical_profile_id, updated_at = now()
  WHERE patient_id = ANY(duplicate_ids);
  GET DIAGNOSTICS moved_count = ROW_COUNT;
  reference_counts := reference_counts || jsonb_build_object('repeat_rx_requests', moved_count);

  UPDATE public.referral_credits
  SET profile_id = p_canonical_profile_id
  WHERE profile_id = ANY(duplicate_ids);
  GET DIAGNOSTICS moved_count = ROW_COUNT;
  reference_counts := reference_counts || jsonb_build_object('referral_credits', moved_count);

  UPDATE public.profiles
  SET
    merged_into_profile_id = p_canonical_profile_id,
    merged_at = now(),
    merged_by = p_merged_by,
    merge_reason = NULLIF(btrim(p_merge_reason), ''),
    is_active = false,
    updated_at = now()
  WHERE id = ANY(duplicate_ids);

  INSERT INTO public.patient_profile_merge_audit (
    canonical_profile_id,
    duplicate_profile_ids,
    merged_by,
    merge_reason,
    reference_counts
  )
  VALUES (
    p_canonical_profile_id,
    duplicate_ids,
    p_merged_by,
    NULLIF(btrim(p_merge_reason), ''),
    reference_counts
  );

  INSERT INTO public.audit_logs (
    actor_id,
    actor_type,
    action,
    metadata,
    created_at
  )
  VALUES (
    p_merged_by,
    'admin',
    'patient_profiles_merged',
    jsonb_build_object(
      'canonical_profile_id', p_canonical_profile_id,
      'duplicate_profile_ids', duplicate_ids,
      'duplicate_count', array_length(duplicate_ids, 1),
      'reference_counts', reference_counts
    ),
    now()
  );

  RETURN jsonb_build_object(
    'canonicalProfileId', p_canonical_profile_id,
    'duplicateProfileIds', duplicate_ids,
    'mergedProfileCount', array_length(duplicate_ids, 1),
    'referenceCounts', reference_counts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_patient_profiles(uuid, uuid[], uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merge_patient_profiles(uuid, uuid[], uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.merge_patient_profiles(uuid, uuid[], uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.merge_patient_profiles(uuid, uuid[], uuid, text) TO service_role;
