-- ============================================================================
-- Lint-safe optional legacy tables
--
-- plpgsql_check inspects static EXECUTE strings. Build optional legacy table
-- references at runtime so missing retired tables do not fail remote lint.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.merge_guest_profile(
  p_guest_profile_id uuid,
  p_authenticated_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_requests_table regclass;
  v_sql text;
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

  v_requests_table := to_regclass('public.' || 'requests');
  IF v_requests_table IS NOT NULL THEN
    v_sql := format('UPDATE %s SET patient_id = $1 WHERE patient_id = $2', v_requests_table);
    EXECUTE v_sql USING p_authenticated_profile_id, p_guest_profile_id;
  END IF;

  DELETE FROM public.profiles
  WHERE id = p_guest_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_guest_profile(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_guest_profile(uuid, uuid) TO service_role;

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
DECLARE
  v_artg_table regclass;
  v_sql text;
BEGIN
  v_artg_table := to_regclass('public.' || 'artg_products');
  IF v_artg_table IS NULL THEN
    RETURN;
  END IF;

  v_sql := format(
    'SELECT
       a.artg_id,
       a.product_name,
       a.active_ingredients_raw,
       a.dosage_form,
       a.route
     FROM %s a
     WHERE
       a.product_name ILIKE ''%%'' || $1 || ''%%''
       OR a.active_ingredients_raw ILIKE ''%%'' || $1 || ''%%''
       OR extensions.similarity(COALESCE(a.product_name, ''''), $1) > 0.15
       OR extensions.similarity(COALESCE(a.active_ingredients_raw, ''''), $1) > 0.15
     ORDER BY
       GREATEST(
         extensions.similarity(COALESCE(a.product_name, ''''), $1),
         extensions.similarity(COALESCE(a.active_ingredients_raw, ''''), $1) * 0.8
       ) DESC,
       a.product_name ASC
     LIMIT $2',
    v_artg_table
  );

  RETURN QUERY EXECUTE v_sql USING search_query, result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_artg_products(text, integer) TO anon, authenticated, service_role;
