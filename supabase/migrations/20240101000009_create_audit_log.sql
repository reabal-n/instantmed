-- ============================================
-- AUDIT_LOG: Immutable event log for compliance
-- ============================================

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  event_type public.audit_event_type NOT NULL,
  
  -- Related entities
  intake_id UUID REFERENCES public.intakes(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_action_id UUID REFERENCES public.admin_actions(id) ON DELETE SET NULL,
  
  -- Actor
  actor_id UUID REFERENCES public.profiles(id), -- Who performed the action
  actor_type TEXT NOT NULL CHECK (actor_type IN ('patient', 'admin', 'system', 'webhook')),
  
  -- Event details
  description TEXT NOT NULL,
  
  -- Before/after state (for state changes)
  previous_state JSONB,
  new_state JSONB,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Client/request info
  client_ip TEXT,
  client_user_agent TEXT,
  request_id TEXT, -- For tracing
  
  -- Immutable timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX idx_audit_log_intake ON public.audit_log(intake_id) WHERE intake_id IS NOT NULL;
CREATE INDEX idx_audit_log_profile ON public.audit_log(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_audit_log_actor ON public.audit_log(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_log_event_type ON public.audit_log(event_type);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);

-- Composite index for intake history
CREATE INDEX idx_audit_log_intake_history ON public.audit_log(intake_id, created_at ASC) 
  WHERE intake_id IS NOT NULL;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Patients can view audit logs for their own intakes (limited fields)
CREATE POLICY "Patients can view own audit logs"
  ON public.audit_log FOR SELECT
  USING (
    intake_id IN (
      SELECT i.id FROM public.intakes i
      JOIN public.profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
    -- Only show certain event types to patients
    AND event_type IN ('intake_created', 'intake_submitted', 'payment_received', 'status_changed', 'document_generated', 'document_sent')
  );

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Only system can insert (via security definer functions)
-- No direct INSERT policy for users

-- Prevent updates and deletes (immutable)
-- No UPDATE or DELETE policies

-- ============================================
-- LOGGING FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_event_type public.audit_event_type,
  p_description TEXT,
  p_intake_id UUID DEFAULT NULL,
  p_profile_id UUID DEFAULT NULL,
  p_admin_action_id UUID DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'system',
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_client_ip TEXT DEFAULT NULL,
  p_client_user_agent TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_actor_id UUID;
  v_audit_id UUID;
BEGIN
  -- Get actor ID if authenticated
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO v_actor_id
    FROM public.profiles
    WHERE auth_user_id = auth.uid();
  END IF;
  
  INSERT INTO public.audit_log (
    event_type,
    intake_id,
    profile_id,
    admin_action_id,
    actor_id,
    actor_type,
    description,
    previous_state,
    new_state,
    metadata,
    client_ip,
    client_user_agent,
    request_id
  ) VALUES (
    p_event_type,
    p_intake_id,
    p_profile_id,
    p_admin_action_id,
    v_actor_id,
    p_actor_type,
    p_description,
    p_previous_state,
    p_new_state,
    p_metadata,
    p_client_ip,
    p_client_user_agent,
    p_request_id
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUTOMATIC AUDIT TRIGGERS
-- ============================================

-- Trigger function for intake status changes
CREATE OR REPLACE FUNCTION public.audit_intake_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_audit_event(
      'status_changed',
      'Intake status changed from ' || OLD.status || ' to ' || NEW.status,
      NEW.id,
      NEW.patient_id,
      NULL,
      'system',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_intake_status
  AFTER UPDATE ON public.intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_intake_status_change();

-- Trigger for new intake creation
CREATE OR REPLACE FUNCTION public.audit_intake_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_audit_event(
    'intake_created',
    'New intake created for service',
    NEW.id,
    NEW.patient_id,
    NULL,
    'patient',
    NULL,
    jsonb_build_object('service_id', NEW.service_id, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_intake_create
  AFTER INSERT ON public.intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_intake_created();
