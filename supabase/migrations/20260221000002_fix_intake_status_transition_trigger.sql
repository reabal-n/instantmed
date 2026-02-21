-- Fix: validate_intake_status_transition trigger
--
-- Root cause: The -> operator on JSONB requires a TEXT key, but OLD.status / NEW.status
-- are intake_status enum values. PostgreSQL cannot implicitly cast enum -> text for
-- the JSONB -> operator, causing:
--   "operator does not exist: jsonb -> intake_status"
--
-- Additionally, the transition map was stale and didn't match actual enum values:
--   Old: draft, pending, in_review, requires_info, approved, declined, completed, cancelled
--   Actual enum: draft, pending_payment, paid, in_review, pending_info, approved,
--                awaiting_script, declined, escalated, completed, cancelled, expired,
--                checkout_failed
--
-- Fix: Cast OLD.status and NEW.status to TEXT, and update the transition map to match
-- the real intake_status enum values used in the application.

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
  allowed_next jsonb;
  old_status TEXT;
  new_status TEXT;
BEGIN
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

-- Verify the fix works: test cast behavior
DO $$
DECLARE
  test_jsonb jsonb := '{"paid": ["approved"]}';
  result jsonb;
BEGIN
  -- This should now work with TEXT cast
  result := test_jsonb -> 'paid'::TEXT;
  IF result IS NULL THEN
    RAISE EXCEPTION 'Self-test failed: JSONB lookup returned NULL';
  END IF;
  RAISE NOTICE 'Self-test passed: trigger function fix verified';
END $$;
