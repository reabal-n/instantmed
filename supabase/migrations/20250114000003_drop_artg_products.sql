-- Migration: Drop ARTG products table and related objects
-- Reason: Replaced with PBS API for medication search
-- Date: 2025-01-14

-- Drop the search function first (depends on table)
DROP FUNCTION IF EXISTS public.search_artg_products(text, integer);

-- Drop indexes
DROP INDEX IF EXISTS public.idx_artg_products_artg_id;
DROP INDEX IF EXISTS public.idx_artg_products_product_name_trgm;
DROP INDEX IF EXISTS public.idx_artg_products_active_ingredients_trgm;

-- Drop RLS policies
DROP POLICY IF EXISTS "artg_products_select_authenticated" ON public.artg_products;
DROP POLICY IF EXISTS "artg_products_service_role" ON public.artg_products;
DROP POLICY IF EXISTS "artg_products_anon_select" ON public.artg_products;

-- Drop the table
DROP TABLE IF EXISTS public.artg_products;

-- Note: pg_trgm extension is kept as it may be used by other features
