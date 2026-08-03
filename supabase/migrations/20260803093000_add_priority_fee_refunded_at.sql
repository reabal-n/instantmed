-- Priority breach auto-refund (operator decision 2026-08-03): when a priority
-- intake is still undecided 3h+ after payment, the stale-queue cron refunds the
-- $9.95 priority fee automatically. This stamp is the once-only guard for the
-- refund + breach email, and the flag approval emails read to acknowledge it.

ALTER TABLE intakes
  ADD COLUMN IF NOT EXISTS priority_fee_refunded_at timestamptz;

COMMENT ON COLUMN intakes.priority_fee_refunded_at IS
  'Set when the priority review fee was auto-refunded because the review was still undecided 3h+ after payment (stale-queue cron). Once-only guard; approval emails acknowledge the refund when set.';
