-- Security Fix: Move pg_trgm extension from public to extensions schema
-- Addresses: extension_in_public warning from Supabase linter
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
--
-- Extensions in the public schema can be a security risk as they might be
-- modified by users with public schema access. Moving to extensions schema
-- is the recommended practice.

-- Create the extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop dependent indexes first (they use pg_trgm operators)
DROP INDEX IF EXISTS public.idx_artg_products_product_name_trgm;
DROP INDEX IF EXISTS public.idx_artg_products_active_ingredients_trgm;

-- Drop the extension from public and recreate in extensions
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Recreate the indexes using the extension from its new schema
CREATE INDEX IF NOT EXISTS idx_artg_products_product_name_trgm 
  ON public.artg_products USING gin (product_name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_artg_products_active_ingredients_trgm 
  ON public.artg_products USING gin (active_ingredients_raw extensions.gin_trgm_ops);

-- Update the search function to use the new extension location
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
    OR extensions.similarity(COALESCE(a.product_name, ''), search_query) > 0.15
    OR extensions.similarity(COALESCE(a.active_ingredients_raw, ''), search_query) > 0.15
  ORDER BY 
    GREATEST(
      extensions.similarity(COALESCE(a.product_name, ''), search_query),
      extensions.similarity(COALESCE(a.active_ingredients_raw, ''), search_query) * 0.8
    ) DESC,
    a.product_name ASC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_artg_products(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_artg_products(TEXT, INTEGER) TO anon;

COMMENT ON FUNCTION public.search_artg_products IS 
  'Fuzzy search ARTG products with pg_trgm similarity ranking. Reference only - not for prescribing.';
