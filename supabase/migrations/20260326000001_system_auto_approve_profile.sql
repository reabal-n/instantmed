-- Create a system profile row for the auto-approval pipeline.
-- This satisfies FK constraints on intakes.claimed_by and ai_audit_log.actor_id
-- which are UUID REFERENCES profiles(id).
-- The pipeline uses this UUID as claimed_by when atomically claiming intakes.

INSERT INTO profiles (id, role, full_name, email)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'admin',
  'System (Auto-Approve)',
  'system@instantmed.com.au'
)
ON CONFLICT (id) DO NOTHING;
