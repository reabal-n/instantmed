-- Add DB-backed idempotency for one-shot lifecycle and recovery emails.
-- Application-level checks are useful, but this unique index is the race-safe
-- backstop when two serverless executions try to send the same sequence email.

ALTER TABLE public.email_outbox
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_outbox_idempotency_key
  ON public.email_outbox (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.email_outbox.idempotency_key IS
  'Optional stable key for sequence-level email idempotency. Unique when present.';

COMMENT ON INDEX public.idx_email_outbox_idempotency_key IS
  'Prevents duplicate one-shot lifecycle/recovery emails across concurrent workers.';
