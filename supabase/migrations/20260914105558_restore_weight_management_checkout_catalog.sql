-- Repair the already-launched weight-management checkout catalog (PR #447).
-- Authenticated checkout and safety rules use this canonical slug. The retired
-- weight-loss row stays untouched, including its disabled state and historical IDs.
-- Apply only as the reviewed checkout recovery; this does not enable advertising.
INSERT INTO public.services (
  slug, name, short_name, type, category, price_cents, description,
  is_active, requires_id_verification, requires_medicare, min_age
) VALUES (
  'weight-management', 'Weight management assessment', 'Weight management',
  'weight_loss', 'consult', 8995,
  'One-off weight management assessment reviewed by a doctor.',
  true, false, false, 18
)
ON CONFLICT (slug) DO NOTHING;

-- Never silently reactivate or overwrite a conflicting operator configuration.
-- Medicare-or-IHI and full prescribing identity remain server-enforced; the
-- legacy requires_medicare flag cannot express the accepted IHI alternative.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.services
    WHERE slug = 'weight-management'
      AND type = 'weight_loss'
      AND price_cents = 8995
      AND is_active IS TRUE
      AND min_age = 18
      AND requires_id_verification IS FALSE
      AND requires_medicare IS FALSE
  ) THEN
    RAISE EXCEPTION 'Weight management catalog conflicts with approved checkout configuration; review before applying';
  END IF;
END
$$;
