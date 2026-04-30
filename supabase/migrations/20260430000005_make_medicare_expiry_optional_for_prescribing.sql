-- Medicare card expiry is optional for Parchment patient sync.
-- Keep Medicare number + IRN complete, but stop blocking prescription intake
-- when the card expiry is absent.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_prescribing_medicare_complete_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_prescribing_medicare_complete_chk
  CHECK (
    (medicare_number IS NULL AND medicare_irn IS NULL AND medicare_expiry IS NULL)
    OR (
      medicare_number IS NOT NULL
      AND medicare_irn BETWEEN 1 AND 9
    )
  ) NOT VALID;

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_prescribing_medicare_complete_chk;
