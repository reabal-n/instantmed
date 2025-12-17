-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('request_update', 'payment', 'document_ready', 'refill_reminder', 'system', 'promotion')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (TRUE);

-- Function to create a notification (callable from triggers or service)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_action_url, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to create notification on request status change
CREATE OR REPLACE FUNCTION notify_on_request_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_name TEXT;
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
  v_action_url TEXT;
BEGIN
  -- Only trigger on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get patient name
  SELECT full_name INTO v_patient_name FROM public.profiles WHERE id = NEW.patient_id;
  
  v_action_url := '/patient/requests/' || NEW.id::TEXT;
  
  -- Determine notification content based on new status
  CASE NEW.status
    WHEN 'approved' THEN
      v_type := 'document_ready';
      v_title := 'Your request has been approved! ✓';
      v_message := 'Great news! A doctor has approved your request. Your document is ready to download.';
    WHEN 'declined' THEN
      v_type := 'request_update';
      v_title := 'Update on your request';
      v_message := 'A doctor has reviewed your request. Please check the details for more information.';
    WHEN 'needs_follow_up' THEN
      v_type := 'request_update';
      v_title := 'Doctor needs more information';
      v_message := 'The doctor reviewing your request needs some additional information from you.';
    WHEN 'pending' THEN
      -- Only notify if moving from pending_payment to pending (payment completed)
      IF OLD.status = 'pending_payment' OR OLD.payment_status = 'pending_payment' THEN
        v_type := 'payment';
        v_title := 'Payment received';
        v_message := 'Your payment has been confirmed. A doctor will review your request shortly.';
      ELSE
        RETURN NEW;
      END IF;
    ELSE
      RETURN NEW;
  END CASE;
  
  -- Create the notification
  PERFORM create_notification(
    NEW.patient_id,
    v_type,
    v_title,
    v_message,
    v_action_url,
    jsonb_build_object('request_id', NEW.id, 'request_type', NEW.type, 'status', NEW.status)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on requests table
DROP TRIGGER IF EXISTS trigger_notify_on_request_status_change ON public.requests;
CREATE TRIGGER trigger_notify_on_request_status_change
  AFTER UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_request_status_change();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_notification TO service_role;
GRANT EXECUTE ON FUNCTION notify_on_request_status_change TO service_role;
