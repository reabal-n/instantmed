-- Add delay_notification_sent_at to track the 4h "running late" patient email
-- Prevents the stale-queue cron from sending duplicate patient delay emails on each hourly run

ALTER TABLE intakes
  ADD COLUMN IF NOT EXISTS delay_notification_sent_at timestamptz;

COMMENT ON COLUMN intakes.delay_notification_sent_at IS
  'Set when the "running late" patient email is sent (4h+ wait). Guards against duplicate sends on each stale-queue cron run.';
