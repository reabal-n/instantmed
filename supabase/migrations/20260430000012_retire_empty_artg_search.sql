-- ============================================================================
-- Retire empty ARTG search without lint noise
--
-- InstantMed no longer ships ARTG reference data in production. Keep the legacy
-- RPC contract available, but return an explicit empty result set so schema lint
-- is clean and callers degrade safely.
-- ============================================================================

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
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    NULL::text AS artg_id,
    NULL::text AS product_name,
    NULL::text AS active_ingredients_raw,
    NULL::text AS dosage_form,
    NULL::text AS route
  WHERE false
$$;

GRANT EXECUTE ON FUNCTION public.search_artg_products(text, integer) TO anon, authenticated, service_role;
