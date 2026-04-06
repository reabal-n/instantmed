-- Add delivery tracking columns to email_outbox for Resend webhook support
-- This enables migration from email_logs to email_outbox

-- Add delivery tracking columns
ALTER TABLE email_outbox 
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS delivery_status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add index for webhook lookups by provider_message_id
CREATE INDEX IF NOT EXISTS idx_email_outbox_provider_message_id 
  ON email_outbox(provider_message_id) 
  WHERE provider_message_id IS NOT NULL;

-- Add index for delivery status queries (bounce suppression)
CREATE INDEX IF NOT EXISTS idx_email_outbox_delivery_status 
  ON email_outbox(to_email, delivery_status) 
  WHERE delivery_status IN ('bounced', 'complained');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_email_outbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_outbox_updated_at ON email_outbox;
CREATE TRIGGER email_outbox_updated_at
  BEFORE UPDATE ON email_outbox
  FOR EACH ROW EXECUTE FUNCTION update_email_outbox_updated_at();

COMMENT ON COLUMN email_outbox.delivery_status IS 'Delivery status from Resend webhook: delivered, bounced, complained, opened, clicked';
COMMENT ON COLUMN email_outbox.delivery_status_updated_at IS 'When delivery_status was last updated by webhook';
