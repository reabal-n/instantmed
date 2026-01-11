-- Medication search improvements
-- Per MEDICATION_SEARCH_SPEC.md

-- Create a function for ranked fuzzy search using pg_trgm similarity
CREATE OR REPLACE FUNCTION public.search_artg_products(
  search_query TEXT,
  result_limit INTEGER DEFAULT 15
)
RETURNS TABLE (
  artg_id TEXT,
  product_name TEXT,
  active_ingredients_raw TEXT,
  dosage_form TEXT,
  route TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.artg_id,
    a.product_name,
    a.active_ingredients_raw,
    a.dosage_form,
    a.route,
    GREATEST(
      similarity(LOWER(a.product_name), LOWER(search_query)),
      similarity(LOWER(a.active_ingredients_raw), LOWER(search_query)) * 0.8
    ) AS relevance
  FROM public.artg_products a
  WHERE 
    a.product_name ILIKE '%' || search_query || '%'
    OR a.active_ingredients_raw ILIKE '%' || search_query || '%'
    OR similarity(a.product_name, search_query) > 0.2
    OR similarity(a.active_ingredients_raw, search_query) > 0.2
  ORDER BY relevance DESC, a.product_name ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute to authenticated and anon for search
GRANT EXECUTE ON FUNCTION public.search_artg_products TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_artg_products TO anon;

COMMENT ON FUNCTION public.search_artg_products IS 'Fuzzy search ARTG products with pg_trgm similarity ranking. Reference only - not for prescribing.';
