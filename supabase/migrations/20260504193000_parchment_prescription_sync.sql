-- Store Parchment-created prescriptions locally so the PMS can display them
-- even when a doctor prescribed from a patient record instead of an intake.

ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS parchment_reference text,
  ADD COLUMN IF NOT EXISTS parchment_url text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prescriptions_parchment_reference_unique
  ON public.prescriptions(parchment_reference);
