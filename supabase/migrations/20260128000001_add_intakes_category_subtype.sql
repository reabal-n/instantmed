-- Add category and subtype columns to intakes table
-- Required for checkout session creation and retry pricing lookups

ALTER TABLE public.intakes ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.intakes ADD COLUMN IF NOT EXISTS subtype TEXT;

-- Add index for efficient category/subtype queries
CREATE INDEX IF NOT EXISTS idx_intakes_category ON public.intakes(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_intakes_subtype ON public.intakes(subtype) WHERE subtype IS NOT NULL;

COMMENT ON COLUMN public.intakes.category IS 'Service category: medical_certificate, prescription, consult';
COMMENT ON COLUMN public.intakes.subtype IS 'Service subtype: work, uni, carer (for med certs), repeat, chronic_review (for scripts), etc.';
