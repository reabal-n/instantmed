-- Add decision tracking fields to requests table
-- These fields provide structured data for doctor decisions (approve/decline)

-- Step 1: Add decision enum-like text column
ALTER TABLE requests 
  ADD COLUMN IF NOT EXISTS decision TEXT CHECK (decision IS NULL OR decision IN ('approved', 'declined'));

-- Step 2: Add decline reason code (structured category)
ALTER TABLE requests 
  ADD COLUMN IF NOT EXISTS decline_reason_code TEXT CHECK (
    decline_reason_code IS NULL OR 
    decline_reason_code IN (
      'requires_examination',     -- Clinical - Requires in-person physical examination
      'not_telehealth_suitable',  -- Service - Not available via telehealth
      'prescribing_guidelines',   -- Compliance - Against prescribing guidelines
      'controlled_substance',     -- Compliance - Request for controlled/S8 substance
      'urgent_care_needed',       -- Safety - Requires urgent in-person care
      'insufficient_info',        -- Incomplete - Insufficient information provided
      'patient_not_eligible',     -- Eligibility - Patient doesn't meet service criteria
      'duplicate_request',        -- Administrative - Duplicate of existing request
      'outside_scope',            -- Service - Outside scope of telehealth practice
      'other'                     -- Other - See decline_reason_note for details
    )
  );

-- Step 3: Add decline reason note (free text explanation)
ALTER TABLE requests 
  ADD COLUMN IF NOT EXISTS decline_reason_note TEXT;

-- Step 4: Add decided_at timestamp
ALTER TABLE requests 
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;

-- Step 5: Add comments
COMMENT ON COLUMN requests.decision IS 'Doctor decision: approved or declined';
COMMENT ON COLUMN requests.decline_reason_code IS 'Structured decline reason code for analytics and compliance';
COMMENT ON COLUMN requests.decline_reason_note IS 'Free-text explanation shown to patient in decline email';
COMMENT ON COLUMN requests.decided_at IS 'Timestamp when doctor made the approve/decline decision';

-- Step 6: Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_requests_decision ON requests(decision, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_decline_reason ON requests(decline_reason_code) WHERE decline_reason_code IS NOT NULL;

-- Step 7: Add function to auto-populate decided_at on status change to terminal state
CREATE OR REPLACE FUNCTION set_decided_at_on_terminal_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When transitioning to approved or declined, set decided_at if not already set
  IF NEW.status IN ('approved', 'declined') AND OLD.status NOT IN ('approved', 'declined') THEN
    IF NEW.decided_at IS NULL THEN
      NEW.decided_at := NOW();
    END IF;
    -- Also set the decision field
    NEW.decision := NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger
DROP TRIGGER IF EXISTS set_decided_at_trigger ON requests;
CREATE TRIGGER set_decided_at_trigger
  BEFORE UPDATE OF status
  ON requests
  FOR EACH ROW
  EXECUTE FUNCTION set_decided_at_on_terminal_status();
