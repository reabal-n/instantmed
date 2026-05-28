-- Allow prescription patients without Medicare to provide an Individual
-- Healthcare Identifier (IHI) instead. Medicare remains accepted, but Parchment
-- can also create/update patients with ihi_number.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ihi_number TEXT,
  ADD COLUMN IF NOT EXISTS ihi_number_encrypted TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_ihi_number_format_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_ihi_number_format_chk
  CHECK (
    ihi_number IS NULL
    OR ihi_number ~ '^\d{16}$'
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_prescribing_medicare_complete_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_prescribing_medicare_complete_chk
  CHECK (
    (
      medicare_number IS NULL
      AND medicare_irn IS NULL
      AND medicare_expiry IS NULL
    )
    OR (
      medicare_number IS NOT NULL
      AND medicare_irn BETWEEN 1 AND 9
    )
    OR ihi_number IS NOT NULL
  );

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_ihi_number_format_chk;

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_prescribing_medicare_complete_chk;
