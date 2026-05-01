-- Auto-approval state machine: replace boolean columns with enum
-- Design: docs/plans/2026-04-02-auto-approval-state-machine-design.md

-- 1. Create the enum type
DO $$
BEGIN
  CREATE TYPE auto_approval_state AS ENUM (
    'awaiting_drafts',
    'pending',
    'attempting',
    'approved',
    'failed_retrying',
    'needs_doctor'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add new columns
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS auto_approval_state auto_approval_state;
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS auto_approval_state_reason text;
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS auto_approval_state_updated_at timestamptz;

-- 3. Backfill from old columns (order matters: most specific first)

-- 3a. AI-approved intakes → approved
UPDATE intakes SET
  auto_approval_state = 'approved',
  auto_approval_state_updated_at = COALESCE(ai_approved_at, updated_at)
WHERE ai_approved = true AND status = 'approved';

-- 3b. Deterministic-skipped intakes → needs_doctor
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'intakes'
      AND column_name = 'auto_approval_skipped'
  ) THEN
    UPDATE intakes SET
      auto_approval_state = 'needs_doctor',
      auto_approval_state_reason = auto_approval_skip_reason,
      auto_approval_state_updated_at = COALESCE(updated_at, now())
    WHERE auto_approval_skipped = true;
  END IF;
END $$;

-- 3c. Exhausted-retry intakes → needs_doctor
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'intakes'
      AND column_name = 'auto_approval_skipped'
  ) THEN
    UPDATE intakes SET
      auto_approval_state = 'needs_doctor',
      auto_approval_state_reason = 'max_retries_exhausted',
      auto_approval_state_updated_at = COALESCE(updated_at, now())
    WHERE auto_approval_attempts >= 10
      AND ai_approved = false
      AND auto_approval_skipped = false
      AND status = 'paid';
  END IF;
END $$;

-- 3d. Remaining paid med cert intakes still in queue → pending
UPDATE intakes SET
  auto_approval_state = 'pending',
  auto_approval_state_updated_at = COALESCE(paid_at, now())
WHERE status = 'paid'
  AND auto_approval_state IS NULL
  AND category = 'medical_certificate';

-- 4. Partial index on actionable states only
CREATE INDEX IF NOT EXISTS idx_intakes_auto_approval_active
  ON intakes (auto_approval_state, paid_at)
  WHERE auto_approval_state IN ('pending', 'failed_retrying', 'attempting');
