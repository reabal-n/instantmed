-- Allow anon (unauthenticated) users to read artg_products
-- This is public reference data from TGA for patient recall/search
CREATE POLICY "artg_products_select_anon" ON public.artg_products
    FOR SELECT TO anon USING (true);
