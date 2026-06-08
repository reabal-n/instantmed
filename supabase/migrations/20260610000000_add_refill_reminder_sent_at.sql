-- Reactivation lever (2026-06-08): refill-reminder dedup column on prescriptions.
--
-- The refill-reminders cron (app/api/cron/refill-reminders) sends ONE one-off
-- "time to reorder your <medication>" nudge ~25-30 days after a repeatable
-- script was issued, so a buyer becomes worth more than a single order.
-- Gated by REFILL_REMINDER_EMAILS_ENABLED=true AND canSendMarketingEmail(patient).
--
-- This is the ONE-OFF reactivation nudge, NOT a resurrection of the retired
-- subscription-nudge / follow-up-reminder crons (those were tied to the dormant
-- repeat-Rx subscription model). It does not auto-create an order; it links the
-- patient back into the normal /request flow to buy a fresh repeat script.

ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS refill_reminder_sent_at timestamptz;

COMMENT ON COLUMN public.prescriptions.refill_reminder_sent_at IS
  'When the one-off refill-reminder email was sent for this script (dedup guard for the refill-reminders cron). NULL = never reminded.';

-- Partial index for the cron candidate scan: active scripts in the reorder
-- window that have not been reminded yet. Keeps the daily scan index-only.
CREATE INDEX IF NOT EXISTS idx_prescriptions_refill_reminder
  ON public.prescriptions (issued_date)
  WHERE refill_reminder_sent_at IS NULL AND status = 'active';
