-- Keep the canonical general consult service payable.
-- Checkout maps consult requests to services.slug = 'consult' before creating
-- a Stripe Checkout Session; an inactive row blocks payment before Stripe.

INSERT INTO public.services (
  slug,
  name,
  short_name,
  type,
  price_cents,
  description,
  display_order,
  requires_id_verification,
  is_active
)
VALUES (
  'consult',
  'General Consult',
  'Consult',
  'consult',
  4995,
  'Online consultation for general health concerns, new prescriptions, referrals, and complex requests',
  9,
  false,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  type = EXCLUDED.type,
  price_cents = EXCLUDED.price_cents,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  requires_id_verification = EXCLUDED.requires_id_verification,
  is_active = true,
  updated_at = now();
