-- Fix: Add 'checkout_failed' to intake_status enum
-- The validate_intake_status_transition trigger references 'checkout_failed' but the enum value
-- was missing, causing ALL intake status updates to fail with:
-- "invalid input value for enum intake_status: checkout_failed"
-- This blocked: webhook payment updates, doctor approvals, and all status transitions.

DO $$
BEGIN
  ALTER TYPE intake_status ADD VALUE IF NOT EXISTS 'checkout_failed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
