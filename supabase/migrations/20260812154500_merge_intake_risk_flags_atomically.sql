-- Atomically merge normalized doctor-visible intake flags.
--
-- A read-merge-write in application code can erase a flag written between the
-- read and update. The protocol issuance worker raises multiple independent
-- flags (duplicate identity, clinical soft signal, unsupported purpose), so the
-- merge belongs inside one row-locked database transaction.

CREATE OR REPLACE FUNCTION public.merge_intake_risk_flags(
  p_intake_id uuid,
  p_incoming_flags jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_raw jsonb;
  v_existing jsonb;
  v_merged jsonb;
  v_changed boolean;
BEGIN
  IF p_incoming_flags IS NULL OR jsonb_typeof(p_incoming_flags) <> 'array' THEN
    RAISE EXCEPTION 'p_incoming_flags must be a JSON array';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_incoming_flags) AS incoming(flag)
     WHERE NOT COALESCE(
       jsonb_typeof(incoming.flag) = 'object'
       AND jsonb_typeof(incoming.flag -> 'code') = 'string'
       AND jsonb_typeof(incoming.flag -> 'label') = 'string'
       AND incoming.flag ->> 'severity' IN ('attention', 'info')
       AND incoming.flag ->> 'source' IN ('intake', 'auto_approval', 'clinical'),
       false
     )
  ) THEN
    RAISE EXCEPTION 'incoming flags must be normalized IntakeFlag objects';
  END IF;

  SELECT risk_flags
    INTO v_existing_raw
    FROM public.intakes
   WHERE id = p_intake_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'intake % not found', p_intake_id;
  END IF;

  v_existing := CASE
    WHEN jsonb_typeof(v_existing_raw) = 'array' THEN v_existing_raw
    WHEN v_existing_raw IS NULL THEN '[]'::jsonb
    ELSE jsonb_build_array(v_existing_raw)
  END;

  WITH combined AS (
    SELECT
      entry.flag,
      entry.ordinality,
      COALESCE(
        jsonb_typeof(entry.flag) = 'object'
        AND jsonb_typeof(entry.flag -> 'code') = 'string'
        AND jsonb_typeof(entry.flag -> 'label') = 'string'
        AND entry.flag ->> 'severity' IN ('attention', 'info')
        AND entry.flag ->> 'source' IN ('intake', 'auto_approval', 'clinical'),
        false
      ) AS is_normalized
      FROM jsonb_array_elements(v_existing || p_incoming_flags)
        WITH ORDINALITY AS entry(flag, ordinality)
  ), ranked AS (
    SELECT
      flag,
      ordinality,
      row_number() OVER (
        PARTITION BY flag ->> 'code'
        ORDER BY
          CASE flag ->> 'severity' WHEN 'attention' THEN 2 ELSE 1 END DESC,
          ordinality ASC
      ) AS priority
    FROM combined
    WHERE is_normalized
  ), legacy_entries AS (
    -- Never erase an older/unrecognized risk entry merely because the active
    -- worker adds a normalized flag. Readers may ignore it, but the source
    -- record remains intact for audit and later migration.
    SELECT flag, ordinality
      FROM combined
     WHERE NOT is_normalized
  ), retained AS (
    SELECT flag, ordinality
      FROM ranked
     WHERE priority = 1
    UNION ALL
    SELECT flag, ordinality
      FROM legacy_entries
  )
  SELECT COALESCE(jsonb_agg(flag ORDER BY ordinality), '[]'::jsonb)
    INTO v_merged
    FROM retained;

  v_changed := v_merged IS DISTINCT FROM v_existing_raw;

  IF v_changed THEN
    UPDATE public.intakes
       SET risk_flags = v_merged
     WHERE id = p_intake_id;
  END IF;

  RETURN jsonb_build_object(
    'changed', v_changed,
    'flags', v_merged
  );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_intake_risk_flags(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merge_intake_risk_flags(uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.merge_intake_risk_flags(uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.merge_intake_risk_flags(uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.merge_intake_risk_flags(uuid, jsonb) IS
  'Row-locked, severity-preserving merge for normalized intakes.risk_flags; service role only.';
