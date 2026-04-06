-- ============================================
-- MESSAGES: Patient-Admin communication thread
-- ============================================

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id), -- NULL for system messages
  
  -- Message content
  sender_type public.message_sender_type NOT NULL,
  content TEXT NOT NULL,
  
  -- For structured messages (e.g., info requests)
  message_type TEXT DEFAULT 'general' CHECK (message_type IN ('general', 'info_request', 'info_response', 'status_update', 'system')),
  metadata JSONB DEFAULT '{}', -- Additional structured data
  
  -- Read tracking
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- For admin messages
  is_internal BOOLEAN DEFAULT FALSE, -- If true, only visible to admins
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_intake ON public.messages(intake_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id) WHERE sender_id IS NOT NULL;
CREATE INDEX idx_messages_created ON public.messages(intake_id, created_at ASC);
CREATE INDEX idx_messages_unread ON public.messages(intake_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Patients can view non-internal messages for their intakes
CREATE POLICY "Patients can view own messages"
  ON public.messages FOR SELECT
  USING (
    is_internal = FALSE
    AND intake_id IN (
      SELECT i.id FROM public.intakes i
      JOIN public.profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Patients can send messages for their intakes
CREATE POLICY "Patients can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_type = 'patient'
    AND is_internal = FALSE
    AND intake_id IN (
      SELECT i.id FROM public.intakes i
      JOIN public.profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Patients can mark messages as read
CREATE POLICY "Patients can mark messages read"
  ON public.messages FOR UPDATE
  USING (
    intake_id IN (
      SELECT i.id FROM public.intakes i
      JOIN public.profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Can only update read status
    is_read = TRUE
  );

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Admins can send messages
CREATE POLICY "Admins can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Admins can update messages (mark read, etc.)
CREATE POLICY "Admins can update messages"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Function to send system message
CREATE OR REPLACE FUNCTION public.send_system_message(
  p_intake_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'system',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  INSERT INTO public.messages (
    intake_id,
    sender_type,
    content,
    message_type,
    metadata
  ) VALUES (
    p_intake_id,
    'system',
    p_content,
    p_message_type,
    p_metadata
  )
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
