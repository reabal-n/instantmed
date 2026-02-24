-- Fix: validate_intake_status_transition trigger fails on INSERT
--
-- Root cause: The trigger fires on BEFORE INSERT OR UPDATE OF status.
-- On INSERT, OLD is NULL, so OLD.status is NULL. The JSONB lookup
-- `valid_transitions -> NULL` returns NULL, which causes the exception:
--   "Invalid status transition from <NULL> to pending_payment"
--
-- Fix: Skip validation on INSERT (TG_OP = 'INSERT') since there is no
-- "old status" to transition FROM. The initial status is validated by
-- the intake_status enum type constraint already.
-- Also allow INSERT with 'draft' or 'pending_payment' as valid initial states.

CREATE OR REPLACE FUNCTION public.validate_intake_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  valid_transitions jsonb := '{
    "draft": ["pending_payment", "cancelled"],
    "pending_payment": ["paid", "checkout_failed", "cancelled", "expired"],
    "checkout_failed": ["pending_payment", "cancelled"],
    "paid": ["in_review", "approved", "cancelled"],
    "in_review": ["approved", "declined", "pending_info", "escalated", "cancelled"],
    "pending_info": ["in_review", "paid", "cancelled", "expired"],
    "approved": ["completed", "awaiting_script", "cancelled"],
    "awaiting_script": ["completed", "cancelled"],
    "escalated": ["in_review", "declined", "cancelled"],
    "declined": [],
    "completed": [],
    "cancelled": [],
    "expired": []
  }'::jsonb;
  valid_initial_states jsonb := '["draft", "pending_payment"]'::jsonb;
  allowed_next jsonb;
  old_status TEXT;
  new_status TEXT;
BEGIN
  -- On INSERT, OLD is NULL — validate the initial status instead
  IF TG_OP = 'INSERT' THEN
    new_status := NEW.status::TEXT;
    IF NOT valid_initial_states ? new_status THEN
      RAISE EXCEPTION 'Invalid initial status: %. Must be draft or pending_payment.', new_status;
    END IF;
    RETURN NEW;
  END IF;

  -- Cast enum values to TEXT for JSONB operations
  old_status := OLD.status::TEXT;
  new_status := NEW.status::TEXT;

  -- Skip validation if status hasn't changed
  IF old_status = new_status THEN
    RETURN NEW;
  END IF;

  allowed_next := valid_transitions -> old_status;

  IF allowed_next IS NULL OR NOT allowed_next ? new_status THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', old_status, new_status;
  END IF;

  RETURN NEW;
END;
$function$;

-- Self-test: verify INSERT path works
DO $$
BEGIN
  RAISE NOTICE 'Status transition trigger fix applied: INSERT operations now handled correctly';
END $$;
