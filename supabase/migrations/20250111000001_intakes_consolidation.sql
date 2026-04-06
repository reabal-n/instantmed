-- ============================================
-- INTAKES CONSOLIDATION MIGRATION
-- Migrating from requests to intakes as canonical case object
-- Adding script tracking + patient encounter notes
-- ============================================

-- 1. Add script tracking fields to intakes (from requests schema)
ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS script_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS script_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS script_notes TEXT,
  ADD COLUMN IF NOT EXISTS parchment_reference TEXT;

-- 2. Add decision tracking fields (from requests schema)
ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS decision TEXT CHECK (decision IN ('approved', 'declined')),
  ADD COLUMN IF NOT EXISTS decline_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS decline_reason_note TEXT,
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;

-- 3. Add doctor review tracking (from requests schema)
ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS doctor_notes TEXT,
  ADD COLUMN IF NOT EXISTS flagged_for_followup BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS followup_reason TEXT;

-- 4. Add priority review flag for payment upsell
ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS priority_review BOOLEAN DEFAULT FALSE;

-- Index for script tracking queries
CREATE INDEX IF NOT EXISTS idx_intakes_script_sent 
  ON public.intakes(script_sent) WHERE script_sent = FALSE AND status = 'approved';

-- ============================================
-- PATIENT NOTES: Longitudinal encounter notes per patient
-- ============================================

CREATE TABLE IF NOT EXISTS public.patient_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Patient reference (required)
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Optional link to specific intake/case
  intake_id UUID REFERENCES public.intakes(id) ON DELETE SET NULL,
  
  -- Note content
  note_type TEXT NOT NULL DEFAULT 'encounter' CHECK (note_type IN (
    'encounter',      -- Clinical encounter note
    'general',        -- General note about patient
    'allergy',        -- Allergy documentation
    'medication',     -- Medication note
    'history',        -- Medical history note
    'admin'           -- Administrative note
  )),
  title TEXT,
  content TEXT NOT NULL,
  
  -- Structured data for specific note types
  metadata JSONB DEFAULT '{}',
  
  -- Author (the doctor - you)
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for patient notes
CREATE INDEX IF NOT EXISTS idx_patient_notes_patient ON public.patient_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_notes_intake ON public.patient_notes(intake_id) WHERE intake_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_notes_type ON public.patient_notes(patient_id, note_type);
CREATE INDEX IF NOT EXISTS idx_patient_notes_created ON public.patient_notes(patient_id, created_at DESC);

-- Updated at trigger
CREATE TRIGGER patient_notes_updated_at
  BEFORE UPDATE ON public.patient_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- RLS POLICIES FOR PATIENT NOTES
-- ============================================

ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;

-- Patients can view their own notes (non-admin notes only)
CREATE POLICY "Patients can view own notes"
  ON public.patient_notes FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
    AND note_type != 'admin'
  );

-- Admins/doctors can view all notes
CREATE POLICY "Admins can view all patient notes"
  ON public.patient_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'doctor')
    )
  );

-- Admins/doctors can create notes
CREATE POLICY "Admins can create patient notes"
  ON public.patient_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'doctor')
    )
  );

-- Admins/doctors can update notes they created
CREATE POLICY "Admins can update own patient notes"
  ON public.patient_notes FOR UPDATE
  USING (
    created_by IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================
-- UPDATE INTAKE STATUS ENUM (add awaiting_script if not exists)
-- ============================================

-- Check if awaiting_script exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'awaiting_script' 
    AND enumtypid = 'public.intake_status'::regtype
  ) THEN
    ALTER TYPE public.intake_status ADD VALUE IF NOT EXISTS 'awaiting_script' AFTER 'approved';
  END IF;
END$$;

-- ============================================
-- HELPER FUNCTION: Get patient's notes
-- ============================================

CREATE OR REPLACE FUNCTION get_patient_notes(
  p_patient_id UUID,
  p_note_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  intake_id UUID,
  note_type TEXT,
  title TEXT,
  content TEXT,
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pn.id,
    pn.intake_id,
    pn.note_type,
    pn.title,
    pn.content,
    pn.metadata,
    pn.created_by,
    pn.created_at
  FROM public.patient_notes pn
  WHERE pn.patient_id = p_patient_id
    AND (p_note_type IS NULL OR pn.note_type = p_note_type)
  ORDER BY pn.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_patient_notes TO authenticated;
