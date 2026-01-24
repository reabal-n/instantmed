-- ============================================================================
-- EMAIL LOGS TABLE
-- Tracks all transactional email sends for audit and debugging
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to request if applicable
  request_id UUID REFERENCES public.intakes(id) ON DELETE SET NULL,
  
  -- Email details
  recipient_email TEXT NOT NULL,
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  
  -- Delivery tracking (updated via Resend webhooks)
  resend_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, bounced, complained
  delivery_status TEXT, -- delivered, bounced, complained, opened, clicked
  delivery_status_updated_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Flexible metadata (merge tags, errors, etc.)
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_logs_request ON public.email_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON public.email_logs(resend_id) WHERE resend_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON public.email_logs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for sending/updating)
CREATE POLICY "Service role full access to email_logs"
  ON public.email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view all logs
CREATE POLICY "Admins can view email logs"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Patients can view their own email logs (via request_id)
CREATE POLICY "Patients can view own email logs"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM intakes
      WHERE intakes.id = email_logs.request_id
      AND intakes.patient_id = (
        SELECT id FROM profiles WHERE auth_user_id = (SELECT auth.uid())
      )
    )
  );

COMMENT ON TABLE public.email_logs IS 'Tracks all transactional email sends';
COMMENT ON COLUMN public.email_logs.resend_id IS 'Resend API message ID for tracking';
COMMENT ON COLUMN public.email_logs.status IS 'Send status: pending, sent, delivered, bounced, complained';
COMMENT ON COLUMN public.email_logs.delivery_status IS 'Delivery status from webhook: delivered, bounced, opened, clicked';
