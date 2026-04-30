-- A Parchment user_id represents one external prescriber identity.
-- Multiple local profiles sharing it makes webhook attribution ambiguous.

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_parchment_user_id_unique
  ON public.profiles (parchment_user_id)
  WHERE parchment_user_id IS NOT NULL;
