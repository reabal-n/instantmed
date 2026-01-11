-- Migration: Create artg_products table for TGA ARTG medication reference data
-- Purpose: Reference-only metadata for patient recall/search (NOT prescribing)

-- Enable pg_trgm extension for fuzzy text search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create the artg_products table
CREATE TABLE IF NOT EXISTS public.artg_products (
    artg_id TEXT PRIMARY KEY,
    product_name TEXT,
    sponsor_name TEXT,
    active_ingredients_raw TEXT,
    dosage_form TEXT,
    route TEXT,
    indications_raw TEXT,
    product_type TEXT,
    status TEXT,
    source TEXT DEFAULT 'TGA_ARTG',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_artg_products_artg_id ON public.artg_products USING btree (artg_id);
CREATE INDEX IF NOT EXISTS idx_artg_products_product_name_trgm ON public.artg_products USING gin (product_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_artg_products_active_ingredients_trgm ON public.artg_products USING gin (active_ingredients_raw gin_trgm_ops);

-- Add comment for documentation
COMMENT ON TABLE public.artg_products IS 'TGA ARTG product reference data for patient medication recall/search. Reference only - not for prescribing decisions.';

-- RLS: Enable but allow public read access (reference data)
ALTER TABLE public.artg_products ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "artg_products_select_authenticated" ON public.artg_products
    FOR SELECT TO authenticated USING (true);

-- Allow service role full access for imports
CREATE POLICY "artg_products_service_role" ON public.artg_products
    FOR ALL TO service_role USING (true) WITH CHECK (true);
