-- Fix notification action URLs: /patient/requests/ → /patient/intakes/
-- The notify_on_request_status_change trigger was generating broken URLs
-- pointing to /patient/requests/ which no longer exists.

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

  v_action_url := '/patient/intakes/' || NEW.id::TEXT;

  -- Determine notification content based on new status
  CASE NEW.status
    WHEN 'approved' THEN
      v_type := 'document_ready';
      v_title := 'Your request has been approved';
      v_message := 'A doctor has approved your request. Your document is ready to download.';
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
    v_action_url
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix any existing notifications with the old URL pattern
UPDATE public.notifications
SET action_url = REPLACE(action_url, '/patient/requests/', '/patient/intakes/')
WHERE action_url LIKE '/patient/requests/%';
