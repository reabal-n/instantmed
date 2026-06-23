-- The shared `consult` service row (the parent for the live ED / hair loss /
-- women's health consult subtypes) was still named "General Consult" — the label
-- of the publicly retired (2026-05-20) generic service. That misleading name made
-- a 2026-06-23 audit read it as a live retired-service leak. Rename to "Consult"
-- (short_name is already "Consult"). Surfaces patient-facing (tracking page H1,
-- complete-account) + admin; benign label only, no claim/availability change. The
-- row stays active — it backs the live consult subtypes (ed/hair_loss/womens_health).
UPDATE services SET name = 'Consult' WHERE slug = 'consult' AND name = 'General Consult';
