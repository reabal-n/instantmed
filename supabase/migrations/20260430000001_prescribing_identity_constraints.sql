-- Prescribing identity hardening for Parchment/ePrescribing readiness.
-- NOT VALID avoids blocking deploy on old partial profile rows while enforcing
-- the constraint for new/updated rows immediately.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_prescribing_medicare_complete_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_prescribing_medicare_complete_chk
  CHECK (
    (medicare_number IS NULL AND medicare_irn IS NULL AND medicare_expiry IS NULL)
    OR (
      medicare_number IS NOT NULL
      AND medicare_irn BETWEEN 1 AND 9
      AND medicare_expiry IS NOT NULL
    )
  ) NOT VALID;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_medicare_expiry_month_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_medicare_expiry_month_chk
  CHECK (
    medicare_expiry IS NULL
    OR medicare_expiry = date_trunc('month', medicare_expiry)::date
  ) NOT VALID;
