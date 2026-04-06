-- Re-apply of 20260403000001 — applied directly to production, tracked here for branch parity.
-- ADD COLUMN IF NOT EXISTS is a no-op if the column already exists.

ALTER TABLE intakes
  ADD COLUMN IF NOT EXISTS delay_notification_sent_at timestamptz;

COMMENT ON COLUMN intakes.delay_notification_sent_at IS
  'Set when the "running late" patient email is sent (4h+ wait). Guards against duplicate sends on each stale-queue cron run.';
