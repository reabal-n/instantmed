-- ============================================================================
-- email_outbox: add scheduled_for for deferred delivery
-- ============================================================================
-- Adds a `scheduled_for` column to `email_outbox` so the dispatcher can defer
-- sending a row until that timestamp has passed. Powers the 30-second cert
-- approval undo window: the cert email is queued with `scheduled_for = now()
-- + 30s`, the doctor sees a toast with an Undo button, and on click the
-- queued row is deleted (cancelling the send) before the dispatcher picks it
-- up.
--
-- NULL means "send as soon as the dispatcher claims it" (current behaviour).
-- The partial index keeps the index small since the vast majority of rows
-- will not use scheduled delivery.
-- ============================================================================

ALTER TABLE email_outbox
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

CREATE INDEX IF NOT EXISTS idx_email_outbox_scheduled_for
  ON email_outbox (scheduled_for)
  WHERE scheduled_for IS NOT NULL;

COMMENT ON COLUMN email_outbox.scheduled_for IS
  'When set, the dispatcher must wait until this timestamp before claiming the row. NULL means send ASAP. Used for the cert approval 30s undo window and any future deferred-send use cases.';
