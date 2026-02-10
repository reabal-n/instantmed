-- =============================================================
-- Migration: Drop legacy functions and unused request_documents table
-- =============================================================

-- 1. Drop legacy functions that operate on 'requests' table
DROP FUNCTION IF EXISTS public.claim_request_for_review(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.release_request_claim(UUID, UUID);
DROP FUNCTION IF EXISTS public.approve_request_with_document(uuid, text, text, text, uuid);

-- 2. Drop unused request_documents table (0 rows, no app code references)
DROP POLICY IF EXISTS "Patients can view own documents" ON public.request_documents;
DROP POLICY IF EXISTS "Doctors can create documents" ON public.request_documents;
DROP POLICY IF EXISTS "Doctors can view all documents" ON public.request_documents;
DROP TABLE IF EXISTS public.request_documents;

-- 3. Fix notify_on_request_status_change search_path security advisory
CREATE OR REPLACE FUNCTION notify_on_request_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_name TEXT;
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
  v_action_url TEXT;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_patient_name FROM public.profiles WHERE id = NEW.patient_id;
  v_action_url := '/patient/intakes/' || NEW.id::TEXT;

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

  PERFORM public.create_notification(
    NEW.patient_id, v_type, v_title, v_message, v_action_url
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 4. Fix existing notification URLs
UPDATE public.notifications
SET action_url = REPLACE(action_url, '/patient/requests/', '/patient/intakes/')
WHERE action_url LIKE '/patient/requests/%';
