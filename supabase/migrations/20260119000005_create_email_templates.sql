-- ============================================================================
-- EMAIL TEMPLATES TABLE
-- Editable email templates for transactional emails
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Template content
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT, -- Plain text fallback
  
  -- Merge tags available for this template
  available_tags JSONB DEFAULT '[]',
  
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON public.email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage email templates
CREATE POLICY "Admins can manage email templates" 
  ON public.email_templates
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- System can read active templates (for sending emails)
CREATE POLICY "System can read active templates" 
  ON public.email_templates
  FOR SELECT 
  TO authenticated
  USING (is_active = true);

-- Seed default templates
INSERT INTO public.email_templates (slug, name, description, subject, body_html, available_tags) VALUES
  ('certificate-issued', 'Certificate Issued', 'Sent when a medical certificate is issued', 
   'Your medical certificate is ready',
   '<h1>Hi {{patient_name}},</h1><p>Your medical certificate has been issued and is ready to download.</p><p><a href="{{certificate_link}}">Download Certificate</a></p><p>Certificate ID: {{certificate_id}}</p><p>Best regards,<br>InstantMed Team</p>',
   '["patient_name", "certificate_link", "certificate_id"]'),
  
  ('request-approved', 'Request Approved', 'Sent when a request is approved by a doctor',
   'Good news - your request has been approved',
   '<h1>Hi {{patient_name}},</h1><p>Your {{service_name}} request has been reviewed and approved by Dr. {{doctor_name}}.</p><p>{{next_steps}}</p><p>Best regards,<br>InstantMed Team</p>',
   '["patient_name", "service_name", "doctor_name", "next_steps"]'),
  
  ('request-declined', 'Request Declined', 'Sent when a request is declined',
   'Update on your request',
   '<h1>Hi {{patient_name}},</h1><p>Unfortunately, we were unable to approve your {{service_name}} request at this time.</p><p><strong>Reason:</strong> {{decline_reason}}</p><p>{{recommendations}}</p><p>If you have questions, please contact us.</p><p>Best regards,<br>InstantMed Team</p>',
   '["patient_name", "service_name", "decline_reason", "recommendations"]'),
  
  ('prescription-ready', 'Prescription Ready', 'Sent when an eScript is ready',
   'Your eScript is ready',
   '<h1>Hi {{patient_name}},</h1><p>Your prescription has been sent to your phone via SMS.</p><p><strong>Medication:</strong> {{medication_name}}</p><p>Take your phone to any pharmacy to collect your medication.</p><p>Best regards,<br>InstantMed Team</p>',
   '["patient_name", "medication_name"]'),
  
  ('payment-received', 'Payment Received', 'Sent when payment is confirmed',
   'Payment confirmed - your request is in queue',
   '<h1>Hi {{patient_name}},</h1><p>Thank you for your payment of {{amount}}.</p><p>Your {{service_name}} request is now in the doctor''s queue for review.</p><p>You''ll receive an update once your request has been reviewed.</p><p>Best regards,<br>InstantMed Team</p>',
   '["patient_name", "amount", "service_name"]'),
  
  ('refund-processed', 'Refund Processed', 'Sent when a refund is processed',
   'Your refund has been processed',
   '<h1>Hi {{patient_name}},</h1><p>A refund of {{amount}} has been processed for your {{service_name}} request.</p><p><strong>Reason:</strong> {{refund_reason}}</p><p>The refund should appear in your account within 5-10 business days.</p><p>Best regards,<br>InstantMed Team</p>',
   '["patient_name", "amount", "service_name", "refund_reason"]');

COMMENT ON TABLE public.email_templates IS 'Editable transactional email templates';
