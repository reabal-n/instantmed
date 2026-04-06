-- ============================================
-- CLINICAL SUMMARIES: Versioned summary storage
-- ============================================

CREATE TABLE IF NOT EXISTS public.clinical_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  summary_text TEXT NOT NULL,
  summary_data JSONB NOT NULL DEFAULT '{}',
  generated_by_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_intake_version UNIQUE (intake_id, version)
);

-- Indexes
CREATE INDEX idx_clinical_summaries_intake ON public.clinical_summaries(intake_id);
CREATE INDEX idx_clinical_summaries_version ON public.clinical_summaries(intake_id, version DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.clinical_summaries ENABLE ROW LEVEL SECURITY;

-- Only admins can view summaries
CREATE POLICY "Admins can view clinical summaries"
  ON public.clinical_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can insert summaries
CREATE POLICY "Admins can insert clinical summaries"
  ON public.clinical_summaries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Helper function to create table if called
CREATE OR REPLACE FUNCTION public.create_clinical_summaries_table()
RETURNS void AS $$
BEGIN
  -- Table already exists via migration, this is a no-op
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
