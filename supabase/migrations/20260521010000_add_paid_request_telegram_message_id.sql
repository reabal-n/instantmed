ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS paid_request_telegram_message_id BIGINT;

COMMENT ON COLUMN public.intakes.paid_request_telegram_message_id IS
  'Telegram message_id captured when the new-request notification was sent. Used to edit the message to a Reviewed or Declined state once the doctor acts so the chat self-documents.';
