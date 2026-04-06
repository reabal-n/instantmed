-- ============================================
-- ADMIN_ACTIONS: Admin workflow tracking
-- ============================================

CREATE TABLE public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Action details
  action_type public.admin_action_type NOT NULL,
  
  -- Context
  previous_status public.intake_status,
  new_status public.intake_status,
  
  -- Content
  notes TEXT, -- Admin notes/reason
  internal_notes TEXT, -- Notes only visible to other admins
  
  -- For info requests
  questions_asked JSONB, -- Structured questions for patient
  
  -- For approvals/declines
  clinical_notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Client info
  client_ip TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admin_actions_intake ON public.admin_actions(intake_id);
CREATE INDEX idx_admin_actions_admin ON public.admin_actions(admin_id);
CREATE INDEX idx_admin_actions_type ON public.admin_actions(action_type);
CREATE INDEX idx_admin_actions_created ON public.admin_actions(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Patients can view non-internal actions on their intakes
CREATE POLICY "Patients can view admin actions on own intakes"
  ON public.admin_actions FOR SELECT
  USING (
    intake_id IN (
      SELECT i.id FROM public.intakes i
      JOIN public.profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
    -- Exclude internal notes
    AND internal_notes IS NULL
  );

-- Admins can view all admin actions
CREATE POLICY "Admins can view all admin actions"
  ON public.admin_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Admins can create admin actions
CREATE POLICY "Admins can create admin actions"
  ON public.admin_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
    AND admin_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Function to record admin action and update intake
CREATE OR REPLACE FUNCTION public.record_admin_action(
  p_intake_id UUID,
  p_action_type public.admin_action_type,
  p_new_status public.intake_status DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL,
  p_clinical_notes TEXT DEFAULT NULL,
  p_questions JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_admin_id UUID;
  v_action_id UUID;
  v_previous_status public.intake_status;
BEGIN
  -- Get admin profile ID
  SELECT id INTO v_admin_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid() AND role = 'admin';
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized: admin access required';
  END IF;
  
  -- Get current intake status
  SELECT status INTO v_previous_status
  FROM public.intakes
  WHERE id = p_intake_id;
  
  -- Insert admin action
  INSERT INTO public.admin_actions (
    intake_id,
    admin_id,
    action_type,
    previous_status,
    new_status,
    notes,
    internal_notes,
    clinical_notes,
    questions_asked,
    metadata
  ) VALUES (
    p_intake_id,
    v_admin_id,
    p_action_type,
    v_previous_status,
    p_new_status,
    p_notes,
    p_internal_notes,
    p_clinical_notes,
    p_questions,
    p_metadata
  )
  RETURNING id INTO v_action_id;
  
  -- Update intake status if provided
  IF p_new_status IS NOT NULL THEN
    UPDATE public.intakes
    SET 
      status = p_new_status,
      admin_notes = COALESCE(p_clinical_notes, admin_notes),
      decline_reason = CASE WHEN p_action_type = 'declined' THEN p_notes ELSE decline_reason END
    WHERE id = p_intake_id;
  END IF;
  
  -- Handle assignment
  IF p_action_type = 'assigned' THEN
    UPDATE public.intakes
    SET assigned_admin_id = v_admin_id, assigned_at = NOW()
    WHERE id = p_intake_id;
  ELSIF p_action_type = 'unassigned' THEN
    UPDATE public.intakes
    SET assigned_admin_id = NULL, assigned_at = NULL
    WHERE id = p_intake_id;
  END IF;
  
  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
