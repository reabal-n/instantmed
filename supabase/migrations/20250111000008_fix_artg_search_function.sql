-- Fix the search_artg_products function return type
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
) AS $$
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
    OR similarity(COALESCE(a.product_name, ''), search_query) > 0.15
    OR similarity(COALESCE(a.active_ingredients_raw, ''), search_query) > 0.15
  ORDER BY 
    GREATEST(
      similarity(COALESCE(a.product_name, ''), search_query),
      similarity(COALESCE(a.active_ingredients_raw, ''), search_query) * 0.8
    ) DESC,
    a.product_name ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.search_artg_products TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_artg_products TO anon;
