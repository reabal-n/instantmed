-- Patient profile merge support
-- Purpose: make duplicate-profile cleanup auditable, reversible by trail, and atomic.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS normalized_email text,
  ADD COLUMN IF NOT EXISTS normalized_phone text,
  ADD COLUMN IF NOT EXISTS merged_into_profile_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS merged_at timestamptz,
  ADD COLUMN IF NOT EXISTS merged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merge_reason text;

DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_not_merged_into_self
    CHECK (merged_into_profile_id IS NULL OR merged_into_profile_id <> id) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.normalize_au_phone(value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;

  digits := regexp_replace(value, '\D', '', 'g');
  IF digits = '' THEN
    RETURN NULL;
  END IF;

  IF left(digits, 4) = '0061' THEN
    digits := substring(digits FROM 3);
  END IF;

  IF left(digits, 2) = '61' AND length(digits) = 11 THEN
    RETURN '0' || substring(digits FROM 3);
  END IF;

  RETURN digits;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_profiles_identity_normalize()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.normalized_email := NULLIF(lower(btrim(NEW.email)), '');
  NEW.normalized_phone := public.normalize_au_phone(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_identity_normalize ON public.profiles;
CREATE TRIGGER profiles_identity_normalize
  BEFORE INSERT OR UPDATE OF email, phone ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_profiles_identity_normalize();

UPDATE public.profiles
SET
  normalized_email = NULLIF(lower(btrim(email)), ''),
  normalized_phone = public.normalize_au_phone(phone)
WHERE
  normalized_email IS DISTINCT FROM NULLIF(lower(btrim(email)), '')
  OR normalized_phone IS DISTINCT FROM public.normalize_au_phone(phone);

CREATE INDEX IF NOT EXISTS idx_profiles_normalized_email_active
  ON public.profiles(normalized_email)
  WHERE role = 'patient' AND merged_into_profile_id IS NULL AND normalized_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_normalized_phone_active
  ON public.profiles(normalized_phone)
  WHERE role = 'patient' AND merged_into_profile_id IS NULL AND normalized_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_merged_into
  ON public.profiles(merged_into_profile_id)
  WHERE merged_into_profile_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.patient_profile_merge_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  duplicate_profile_ids uuid[] NOT NULL,
  merged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  merge_reason text,
  reference_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_profile_merge_audit_canonical
  ON public.patient_profile_merge_audit(canonical_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_profile_merge_audit_created
  ON public.patient_profile_merge_audit(created_at DESC);

ALTER TABLE public.patient_profile_merge_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patient_profile_merge_audit_admin_select ON public.patient_profile_merge_audit;
CREATE POLICY patient_profile_merge_audit_admin_select
  ON public.patient_profile_merge_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS patient_profile_merge_audit_service_all ON public.patient_profile_merge_audit;
CREATE POLICY patient_profile_merge_audit_service_all
  ON public.patient_profile_merge_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

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

  UPDATE public.consents
  SET patient_id = p_canonical_profile_id
  WHERE patient_id = ANY(duplicate_ids);
  GET DIAGNOSTICS moved_count = ROW_COUNT;
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

COMMENT ON COLUMN public.profiles.merged_into_profile_id IS
  'Canonical patient profile this duplicate was merged into. Merged rows are retained for audit and rollback traceability.';
COMMENT ON TABLE public.patient_profile_merge_audit IS
  'Immutable operational record of patient profile merges and reference counts.';
COMMENT ON FUNCTION public.merge_patient_profiles(uuid, uuid[], uuid, text) IS
  'Atomically reassigns patient-owned records to a canonical profile, archives guest duplicate profiles, and writes audit rows.';
