-- Atomic increment for auto_approval_attempts counter
-- Called by the state machine module after marking failed_retrying
CREATE OR REPLACE FUNCTION increment_auto_approval_attempts(intake_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE intakes
  SET auto_approval_attempts = auto_approval_attempts + 1
  WHERE id = intake_id;
$$;
