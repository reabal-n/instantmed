-- ============================================
-- INTAKE_ANSWERS: Questionnaire responses
-- ============================================

CREATE TABLE public.intake_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  
  -- Full answers JSON blob
  answers JSONB NOT NULL DEFAULT '{}',
  
  -- Normalized key fields for querying/rules (extracted from answers)
  -- Medical history flags
  has_allergies BOOLEAN,
  allergy_details TEXT,
  has_current_medications BOOLEAN,
  current_medications TEXT[],
  has_medical_conditions BOOLEAN,
  medical_conditions TEXT[],
  
  -- Specific clinical data (varies by service type)
  symptom_duration TEXT,
  symptom_severity TEXT CHECK (symptom_severity IN ('mild', 'moderate', 'severe')),
  pregnancy_status TEXT CHECK (pregnancy_status IN ('not_pregnant', 'pregnant', 'breastfeeding', 'trying', 'na')),
  
  -- Weight loss specific
  current_weight_kg DECIMAL(5,2),
  height_cm INTEGER,
  bmi DECIMAL(4,1) GENERATED ALWAYS AS (
    CASE WHEN height_cm > 0 THEN 
      ROUND((current_weight_kg / POWER(height_cm::DECIMAL / 100, 2))::NUMERIC, 1)
    END
  ) STORED,
  target_weight_kg DECIMAL(5,2),
  previous_weight_loss_attempts TEXT[],
  
  -- Men's health specific
  ed_frequency TEXT,
  ed_duration TEXT,
  cardiovascular_risk_factors TEXT[],
  
  -- Med cert specific
  absence_start_date DATE,
  absence_end_date DATE,
  absence_days INTEGER GENERATED ALWAYS AS (
    CASE WHEN absence_start_date IS NOT NULL AND absence_end_date IS NOT NULL THEN
      (absence_end_date - absence_start_date + 1)
    END
  ) STORED,
  employer_name TEXT,
  reason_category TEXT,
  
  -- Risk flags (populated by rules engine)
  red_flags TEXT[] DEFAULT '{}',
  yellow_flags TEXT[] DEFAULT '{}',
  
  -- Version tracking for questionnaire changes
  questionnaire_version TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_intake_answers_intake ON public.intake_answers(intake_id);
CREATE INDEX idx_intake_answers_red_flags ON public.intake_answers USING GIN(red_flags) WHERE array_length(red_flags, 1) > 0;
CREATE INDEX idx_intake_answers_bmi ON public.intake_answers(bmi) WHERE bmi IS NOT NULL;
CREATE INDEX idx_intake_answers_answers_gin ON public.intake_answers USING GIN(answers);

CREATE TRIGGER intake_answers_updated_at
  BEFORE UPDATE ON public.intake_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.intake_answers ENABLE ROW LEVEL SECURITY;

-- Patients can view their own intake answers
CREATE POLICY "Patients can view own intake answers"
  ON public.intake_answers FOR SELECT
  USING (
    intake_id IN (
      SELECT i.id FROM public.intakes i
      JOIN public.profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Patients can insert answers for their own intakes
CREATE POLICY "Patients can insert own intake answers"
  ON public.intake_answers FOR INSERT
  WITH CHECK (
    intake_id IN (
      SELECT i.id FROM public.intakes i
      JOIN public.profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Patients can update answers for draft intakes
CREATE POLICY "Patients can update own intake answers"
  ON public.intake_answers FOR UPDATE
  USING (
    intake_id IN (
      SELECT i.id FROM public.intakes i
      JOIN public.profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
      AND i.status IN ('draft', 'pending_payment', 'pending_info')
    )
  );

-- Admins can view all intake answers
CREATE POLICY "Admins can view all intake answers"
  ON public.intake_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Admins can update intake answers (for corrections)
CREATE POLICY "Admins can update intake answers"
  ON public.intake_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );
