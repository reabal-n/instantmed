-- Add category and subtype columns to requests table
-- Category groups the service type, subtype provides specific detail

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subtype text;

-- Add check constraint for category values
ALTER TABLE public.requests
  DROP CONSTRAINT IF EXISTS requests_category_check;

ALTER TABLE public.requests
  ADD CONSTRAINT requests_category_check 
  CHECK (category IS NULL OR category IN ('medical_certificate', 'prescription', 'referral', 'other'));

-- Update indexes for category/subtype queries
CREATE INDEX IF NOT EXISTS requests_category_idx ON public.requests(category);
CREATE INDEX IF NOT EXISTS requests_subtype_idx ON public.requests(subtype);

-- Backfill existing requests based on type field (optional)
UPDATE public.requests
SET category = CASE 
  WHEN type = 'med_cert' THEN 'medical_certificate'
  WHEN type = 'script' THEN 'prescription'
  WHEN type = 'referral' THEN 'referral'
  ELSE 'other'
END
WHERE category IS NULL;
