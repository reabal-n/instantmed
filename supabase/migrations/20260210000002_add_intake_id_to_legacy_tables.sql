-- =============================================================
-- Migration: Add intake_id columns to tables that only have request_id
-- This enables forward compatibility while keeping legacy data intact
-- =============================================================

-- 1. PAYMENTS: Add intake_id column with FK to intakes
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS intake_id UUID REFERENCES public.intakes(id);
CREATE INDEX IF NOT EXISTS idx_payments_intake_id ON public.payments(intake_id);

-- 2. DOCUMENTS: Add intake_id column with FK to intakes
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS intake_id UUID REFERENCES public.intakes(id);
CREATE INDEX IF NOT EXISTS idx_documents_intake_id ON public.documents(intake_id);

-- 3. DOCUMENT_VERIFICATIONS: Add intake_id column with FK to intakes
ALTER TABLE public.document_verifications
  ADD COLUMN IF NOT EXISTS intake_id UUID REFERENCES public.intakes(id);
CREATE INDEX IF NOT EXISTS idx_document_verifications_intake_id ON public.document_verifications(intake_id);

-- 4. FRAUD_FLAGS: Add intake_id column with FK to intakes
ALTER TABLE public.fraud_flags
  ADD COLUMN IF NOT EXISTS intake_id UUID REFERENCES public.intakes(id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_intake_id ON public.fraud_flags(intake_id);

-- 5. PRIORITY_UPSELL_CONVERSIONS: Add intake_id column with FK to intakes
ALTER TABLE public.priority_upsell_conversions
  ADD COLUMN IF NOT EXISTS intake_id UUID REFERENCES public.intakes(id);
CREATE INDEX IF NOT EXISTS idx_priority_upsell_conversions_intake_id ON public.priority_upsell_conversions(intake_id);
