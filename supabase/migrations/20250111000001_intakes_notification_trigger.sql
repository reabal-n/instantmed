-- Add notification trigger for intakes table (replacing old requests trigger)
-- This creates in-app notifications when intake status changes

-- Trigger function to create notification on intake status change
CREATE OR REPLACE FUNCTION notify_on_intake_status_change()
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
  
  v_action_url := '/patient/intakes/' || NEW.id::TEXT;
  
  -- Determine notification content based on new status
  CASE NEW.status
    WHEN 'approved' THEN
      v_type := 'document_ready';
      v_title := 'Your request has been approved';
      v_message := 'A doctor has approved your request. Your document is ready to download.';
    WHEN 'completed' THEN
      v_type := 'document_ready';
      v_title := 'Your request is complete';
      v_message := 'Your request has been completed. You can now download your document.';
    WHEN 'declined' THEN
      v_type := 'request_update';
      v_title := 'Update on your request';
      v_message := 'A doctor has reviewed your request. Please check the details for more information.';
    WHEN 'pending_info' THEN
      v_type := 'request_update';
      v_title := 'Doctor needs more information';
      v_message := 'The doctor reviewing your request needs some additional information from you.';
    WHEN 'awaiting_script' THEN
      v_type := 'request_update';
      v_title := 'Your prescription is being processed';
      v_message := 'Your prescription has been approved and is being sent to your pharmacy.';
    WHEN 'in_review' THEN
      -- Only notify if moving from paid to in_review
      IF OLD.status = 'paid' THEN
        v_type := 'request_update';
        v_title := 'Doctor is reviewing your request';
        v_message := 'A doctor has started reviewing your request.';
      ELSE
        RETURN NEW;
      END IF;
    WHEN 'paid' THEN
      -- Only notify if payment just completed
      IF OLD.status = 'pending' OR OLD.status = 'draft' THEN
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
  INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
  VALUES (
    NEW.patient_id,
    v_type,
    v_title,
    v_message,
    v_action_url,
    jsonb_build_object(
      'intake_id', NEW.id,
      'service_id', NEW.service_id,
      'status', NEW.status,
      'previous_status', OLD.status
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the transaction if notification fails
    RAISE WARNING 'Failed to create notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger on requests table if it exists
DROP TRIGGER IF EXISTS trigger_notify_on_request_status_change ON public.requests;

-- Create trigger on intakes table
DROP TRIGGER IF EXISTS trigger_notify_on_intake_status_change ON public.intakes;
CREATE TRIGGER trigger_notify_on_intake_status_change
  AFTER UPDATE ON public.intakes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_intake_status_change();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION notify_on_intake_status_change TO service_role;

-- Add index for faster notification queries if not exists
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON public.notifications(user_id, created_at DESC);
