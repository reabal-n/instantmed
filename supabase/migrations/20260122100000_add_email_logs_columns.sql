-- Add missing columns to email_logs table for delivery tracking
-- These columns support Resend webhook integration

-- Add resend_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_logs' AND column_name = 'resend_id'
  ) THEN
    ALTER TABLE public.email_logs ADD COLUMN resend_id TEXT;
  END IF;
END $$;

-- Add delivery_status column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_logs' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE public.email_logs ADD COLUMN delivery_status TEXT;
  END IF;
END $$;

-- Add delivery_status_updated_at column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_logs' AND column_name = 'delivery_status_updated_at'
  ) THEN
    ALTER TABLE public.email_logs ADD COLUMN delivery_status_updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add last_error column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_logs' AND column_name = 'last_error'
  ) THEN
    ALTER TABLE public.email_logs ADD COLUMN last_error TEXT;
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id 
  ON public.email_logs(resend_id) 
  WHERE resend_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_delivery_status 
  ON public.email_logs(delivery_status);

COMMENT ON COLUMN public.email_logs.resend_id IS 'Resend API message ID for webhook tracking';
COMMENT ON COLUMN public.email_logs.delivery_status IS 'Delivery status from webhook: delivered, bounced, opened, clicked';
