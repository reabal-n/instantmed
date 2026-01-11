-- Add GP Consult service for new prescriptions and complex health concerns
-- This service is separate from common-scripts (repeat prescriptions) and has different pricing

INSERT INTO public.services (slug, name, short_name, type, price_cents, description, display_order, requires_id_verification) 
VALUES (
  'gp-consult', 
  'General Consultation', 
  'GP Consult', 
  'consults', 
  4995, 
  'Online consultation for new prescriptions, dose changes, referrals, and complex health concerns', 
  9, 
  false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  type = EXCLUDED.type,
  price_cents = EXCLUDED.price_cents,
  description = EXCLUDED.description;

-- Add service type to enum if not exists (for consults)
DO $$ 
BEGIN
  -- Check if 'consults' type exists by checking if any service uses it
  -- The services.type column accepts any text, so we just need the service entry
  NULL;
END $$;
