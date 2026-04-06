-- Security Fix: Set immutable search_path on search_artg_products function
-- Addresses: function_search_path_mutable warning from Supabase linter
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

DROP FUNCTION IF EXISTS public.search_artg_products(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.search_artg_products(
  search_query TEXT,
  result_limit INTEGER DEFAULT 15
)
RETURNS TABLE (
  artg_id TEXT,
  product_name TEXT,
  active_ingredients_raw TEXT,
  dosage_form TEXT,
  route TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.artg_id,
    a.product_name,
    a.active_ingredients_raw,
    a.dosage_form,
    a.route
  FROM public.artg_products a
  WHERE 
    a.product_name ILIKE '%' || search_query || '%'
    OR a.active_ingredients_raw ILIKE '%' || search_query || '%'
    OR public.similarity(COALESCE(a.product_name, ''), search_query) > 0.15
    OR public.similarity(COALESCE(a.active_ingredients_raw, ''), search_query) > 0.15
  ORDER BY 
    GREATEST(
      public.similarity(COALESCE(a.product_name, ''), search_query),
      public.similarity(COALESCE(a.active_ingredients_raw, ''), search_query) * 0.8
    ) DESC,
    a.product_name ASC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_artg_products(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_artg_products(TEXT, INTEGER) TO anon;

COMMENT ON FUNCTION public.search_artg_products IS 
  'Fuzzy search ARTG products with pg_trgm similarity ranking. Reference only - not for prescribing. Security hardened with empty search_path.';
