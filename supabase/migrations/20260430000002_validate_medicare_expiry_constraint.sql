-- Validated after confirming existing rows store Medicare expiry at month granularity.
-- The completeness constraint remains NOT VALID until legacy partial Medicare rows
-- are corrected through the prescribing identity operations queue.

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_medicare_expiry_month_chk;
