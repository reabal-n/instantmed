-- Fix mutable search_path vulnerability in functions
-- This prevents potential SQL injection via search path manipulation
-- APPLIED TO PRODUCTION: 2025-01-23

-- Drop functions that need signature changes first
DROP FUNCTION IF EXISTS public.release_stale_intake_claims(integer);
DROP FUNCTION IF EXISTS public.audit_phi_access(text, uuid, text, uuid, text, text);

-- Fix audit_phi_access
CREATE OR REPLACE FUNCTION public.audit_phi_access(
  p_table_name text,
  p_record_id uuid,
  p_operation text,
  p_actor_id uuid DEFAULT NULL,
  p_actor_role text DEFAULT NULL,
  p_request_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.phi_encryption_audit (
    table_name, record_id, key_id, operation, actor_id, actor_role, request_path
  ) VALUES (
    p_table_name, p_record_id, 'default', p_operation, p_actor_id, p_actor_role, p_request_path
  );
END;
$$;

-- Fix release_intake_claim
CREATE OR REPLACE FUNCTION public.release_intake_claim(p_intake_id uuid, p_doctor_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated boolean;
BEGIN
  UPDATE public.intakes 
  SET claimed_by = NULL, claimed_at = NULL, updated_at = NOW()
  WHERE id = p_intake_id 
    AND claimed_by = p_doctor_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Fix release_stale_intake_claims
CREATE OR REPLACE FUNCTION public.release_stale_intake_claims(p_timeout_minutes integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_released_count INTEGER;
BEGIN
  UPDATE public.intakes SET claimed_by = NULL, claimed_at = NULL, updated_at = NOW()
  WHERE claimed_at IS NOT NULL AND claimed_at < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL
  AND status IN ('paid', 'in_review');
  GET DIAGNOSTICS v_released_count = ROW_COUNT;
  RETURN v_released_count;
END;
$$;

-- Fix claim_intake_for_review
CREATE OR REPLACE FUNCTION public.claim_intake_for_review(p_intake_id uuid, p_doctor_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claimed boolean;
BEGIN
  UPDATE public.intakes 
  SET claimed_by = p_doctor_id, claimed_at = NOW(), updated_at = NOW()
  WHERE id = p_intake_id 
    AND claimed_by IS NULL
    AND status IN ('paid', 'in_review', 'pending_info');
  
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed > 0;
END;
$$;

-- Fix log_certificate_edit
CREATE OR REPLACE FUNCTION public.log_certificate_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Log significant changes to certificate fields
  IF OLD.certificate_data IS DISTINCT FROM NEW.certificate_data THEN
    INSERT INTO public.certificate_edit_history (
      intake_id, doctor_id, field_name, original_value, new_value, change_summary
    ) VALUES (
      NEW.id, 
      NEW.reviewed_by,
      'certificate_data',
      OLD.certificate_data::text,
      NEW.certificate_data::text,
      'Certificate data modified'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Fix update_certificate_edit_count
CREATE OR REPLACE FUNCTION public.update_certificate_edit_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.issued_certificates
  SET edit_count = edit_count + 1, updated_at = NOW()
  WHERE id = NEW.certificate_id;
  RETURN NEW;
END;
$$;

-- Fix requesting_clerk_user_id
CREATE OR REPLACE FUNCTION public.requesting_clerk_user_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'clerk_user_id';
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Drop duplicate indexes for performance
DROP INDEX IF EXISTS public.idx_intakes_created;
DROP INDEX IF EXISTS public.idx_intakes_patient;
DROP INDEX IF EXISTS public.idx_profiles_auth_user_id;
DROP INDEX IF EXISTS public.idx_requests_patient_id;
DROP INDEX IF EXISTS public.idx_requests_status;

-- Add missing foreign key indexes for commonly queried relationships
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_intake_id ON public.email_delivery_log(intake_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_recipient_id ON public.email_delivery_log(recipient_id);
CREATE INDEX IF NOT EXISTS idx_certificate_audit_log_actor_id ON public.certificate_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_ai_safety_blocks_patient_id ON public.ai_safety_blocks(patient_id);
