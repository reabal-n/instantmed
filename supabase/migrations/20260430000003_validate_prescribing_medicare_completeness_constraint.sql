-- Legacy partial Medicare rows were cleaned before this validation.
-- New writes were already protected by the NOT VALID constraint added in
-- 20260430000001_prescribing_identity_constraints.sql.

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_prescribing_medicare_complete_chk;
