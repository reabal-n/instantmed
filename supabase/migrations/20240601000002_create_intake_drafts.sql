-- ============================================
-- INTAKE DRAFTS TABLE
-- Stores in-progress flow state for resume capability
-- ============================================

CREATE TABLE IF NOT EXISTS public.intake_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  session_id TEXT NOT NULL,             -- Anonymous session ID from localStorage
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- Linked after auth
  
  -- Flow state
  service_slug TEXT NOT NULL,
  current_step TEXT DEFAULT 'service',
  current_group_index INTEGER DEFAULT 0,
  
  -- Form data (all answers stored as JSONB)
  data JSONB DEFAULT '{}',
  
  -- Safety evaluation results
  safety_outcome TEXT,                  -- ALLOW, REQUEST_MORE_INFO, REQUIRES_CALL, DECLINE
  safety_risk_tier TEXT,                -- low, medium, high, critical
  safety_triggered_rules TEXT[],        -- Array of rule IDs
  safety_evaluated_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'converted')),
  
  -- Tracking
  claimed_at TIMESTAMPTZ,               -- When anonymous draft was claimed by user
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Conversion tracking
  intake_id UUID,                       -- Reference to final intake when converted
  request_id UUID                       -- Reference to request when converted
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intake_drafts_session ON public.intake_drafts (session_id);
CREATE INDEX IF NOT EXISTS idx_intake_drafts_user ON public.intake_drafts (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_intake_drafts_status ON public.intake_drafts (status);
CREATE INDEX IF NOT EXISTS idx_intake_drafts_service ON public.intake_drafts (service_slug);
CREATE INDEX IF NOT EXISTS idx_intake_drafts_created ON public.intake_drafts (created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.intake_drafts ENABLE ROW LEVEL SECURITY;

-- Users can see their own drafts
CREATE POLICY "intake_drafts_user_select" ON public.intake_drafts
  FOR SELECT USING (
    user_id = auth.uid() OR
    -- Also allow by session_id for anonymous users (checked at app level)
    session_id IS NOT NULL
  );

-- Users can insert their own drafts
CREATE POLICY "intake_drafts_user_insert" ON public.intake_drafts
  FOR INSERT WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

-- Users can update their own drafts
CREATE POLICY "intake_drafts_user_update" ON public.intake_drafts
  FOR UPDATE USING (
    user_id = auth.uid() OR
    (user_id IS NULL AND session_id IS NOT NULL)
  );

-- Admins and doctors can view all drafts for support
CREATE POLICY "intake_drafts_staff_select" ON public.intake_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'doctor')
    )
  );

-- ============================================
-- AUDIT LOG FOR SAFETY EVALUATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.safety_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  draft_id UUID REFERENCES public.intake_drafts(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  service_slug TEXT NOT NULL,
  
  -- Evaluation result
  outcome TEXT NOT NULL,
  risk_tier TEXT NOT NULL,
  triggered_rule_ids TEXT[],
  
  -- Snapshot of data at evaluation time
  answers_snapshot JSONB NOT NULL,
  additional_info_provided JSONB,
  
  -- Metadata
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  evaluation_duration_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  
  -- If re-evaluated
  is_re_evaluation BOOLEAN DEFAULT FALSE,
  previous_evaluation_id UUID REFERENCES public.safety_audit_log(id)
);

CREATE INDEX IF NOT EXISTS idx_safety_audit_draft ON public.safety_audit_log (draft_id);
CREATE INDEX IF NOT EXISTS idx_safety_audit_session ON public.safety_audit_log (session_id);
CREATE INDEX IF NOT EXISTS idx_safety_audit_outcome ON public.safety_audit_log (outcome);
CREATE INDEX IF NOT EXISTS idx_safety_audit_risk ON public.safety_audit_log (risk_tier);

-- RLS for safety audit log
ALTER TABLE public.safety_audit_log ENABLE ROW LEVEL SECURITY;

-- Only staff can view audit logs
CREATE POLICY "safety_audit_staff_select" ON public.safety_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'doctor')
    )
  );

-- System can insert (via service role)
CREATE POLICY "safety_audit_insert" ON public.safety_audit_log
  FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCTION TO LOG SAFETY EVALUATION
-- ============================================

CREATE OR REPLACE FUNCTION log_safety_evaluation(
  p_draft_id UUID,
  p_session_id TEXT,
  p_service_slug TEXT,
  p_outcome TEXT,
  p_risk_tier TEXT,
  p_triggered_rules TEXT[],
  p_answers JSONB,
  p_additional_info JSONB DEFAULT NULL,
  p_evaluation_duration_ms INTEGER DEFAULT NULL,
  p_is_re_evaluation BOOLEAN DEFAULT FALSE,
  p_previous_eval_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.safety_audit_log (
    draft_id,
    session_id,
    service_slug,
    outcome,
    risk_tier,
    triggered_rule_ids,
    answers_snapshot,
    additional_info_provided,
    evaluation_duration_ms,
    is_re_evaluation,
    previous_evaluation_id
  ) VALUES (
    p_draft_id,
    p_session_id,
    p_service_slug,
    p_outcome,
    p_risk_tier,
    p_triggered_rules,
    p_answers,
    p_additional_info,
    p_evaluation_duration_ms,
    p_is_re_evaluation,
    p_previous_eval_id
  )
  RETURNING id INTO v_log_id;
  
  -- Also update the draft with safety info
  IF p_draft_id IS NOT NULL THEN
    UPDATE public.intake_drafts
    SET 
      safety_outcome = p_outcome,
      safety_risk_tier = p_risk_tier,
      safety_triggered_rules = p_triggered_rules,
      safety_evaluated_at = NOW(),
      updated_at = NOW()
    WHERE id = p_draft_id;
  END IF;
  
  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_safety_evaluation TO anon, authenticated;

-- ============================================
-- CLEANUP FUNCTION FOR OLD DRAFTS
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_drafts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.intake_drafts
    WHERE 
      status = 'in_progress'
      AND updated_at < NOW() - INTERVAL '30 days'
      AND user_id IS NULL  -- Only cleanup anonymous drafts
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  
  -- Also mark old authenticated drafts as abandoned
  UPDATE public.intake_drafts
  SET 
    status = 'abandoned',
    updated_at = NOW()
  WHERE 
    status = 'in_progress'
    AND updated_at < NOW() - INTERVAL '90 days';
  
  RETURN v_deleted;
END;
$$;
