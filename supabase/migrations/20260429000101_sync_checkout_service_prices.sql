-- Keep active checkout service rows aligned with canonical Stripe/app prices.
-- Checkout now stores request-derived amounts, but these rows still feed service
-- lookup, pricing API fallbacks, admin views, and referral calculations on old
-- pending intakes.

UPDATE public.services
SET
  price_cents = 1995,
  updated_at = now()
WHERE slug IN ('med-cert-sick', 'med-cert-carer');

UPDATE public.services
SET
  price_cents = 2995,
  updated_at = now()
WHERE slug = 'common-scripts';

UPDATE public.services
SET
  price_cents = 4995,
  is_active = true,
  updated_at = now()
WHERE slug = 'consult';
