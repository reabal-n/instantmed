ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS landing_page text,
  ADD COLUMN IF NOT EXISTS attribution_captured_at timestamptz;

COMMENT ON COLUMN public.intakes.utm_content IS 'First-touch UTM content captured before checkout.';
COMMENT ON COLUMN public.intakes.utm_term IS 'First-touch UTM term captured before checkout.';
COMMENT ON COLUMN public.intakes.referrer IS 'Sanitized first-touch referrer URL without query string or fragment.';
COMMENT ON COLUMN public.intakes.landing_page IS 'Sanitized first-touch InstantMed landing path without query string or fragment.';
COMMENT ON COLUMN public.intakes.attribution_captured_at IS 'Timestamp when browser attribution was captured before checkout.';
