-- ============================================================================
-- CONTENT BLOCKS TABLE
-- Editable microcopy and content snippets
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content identification
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  
  -- Content
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'html', 'markdown')),
  
  -- Metadata
  context TEXT, -- Where this content is used
  max_length INTEGER, -- Max character limit if applicable
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_blocks_key ON public.content_blocks(key);
CREATE INDEX IF NOT EXISTS idx_content_blocks_category ON public.content_blocks(category);

-- Trigger for updated_at
CREATE TRIGGER content_blocks_updated_at
  BEFORE UPDATE ON public.content_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;

-- Anyone can read content blocks (public content)
CREATE POLICY "Anyone can read content blocks" 
  ON public.content_blocks
  FOR SELECT 
  TO authenticated
  USING (true);

-- Admins can manage content blocks
CREATE POLICY "Admins can manage content blocks" 
  ON public.content_blocks
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- Seed default content blocks
INSERT INTO public.content_blocks (key, name, description, category, content, context) VALUES
  ('med_cert_intro', 'Medical Certificate Intro', 'Introduction text on med cert request page', 'med_cert', 
   'Get a medical certificate reviewed by an Australian doctor. Most requests are reviewed within an hour during business hours.',
   'Medical certificate request page header'),
  
  ('repeat_rx_intro', 'Repeat Prescription Intro', 'Introduction text on repeat rx page', 'repeat_rx',
   'Request a repeat of your regular medication. A doctor will review your request and send an eScript to your phone.',
   'Repeat prescription request page header'),
  
  ('safety_warning', 'Safety Warning', 'Emergency safety warning text', 'safety',
   'If you are experiencing a medical emergency, please call 000 immediately or go to your nearest emergency department.',
   'Safety screening and emergency pages'),
  
  ('payment_disclaimer', 'Payment Disclaimer', 'Disclaimer shown before payment', 'payment',
   'Payment is required before your request can be reviewed. If your request cannot be approved, you may be eligible for a refund.',
   'Payment page'),
  
  ('certificate_footer', 'Certificate Footer', 'Default footer for certificates', 'certificate',
   'This certificate was issued via InstantMed telehealth services. Verify authenticity at instantmed.com.au/verify',
   'Generated certificates footer'),
  
  ('review_sla', 'Review SLA Text', 'SLA promise text', 'general',
   'Most requests are reviewed within 1 hour during business hours (9am-9pm AEST, 7 days).',
   'Various pages showing expected wait time'),
  
  ('privacy_notice', 'Privacy Notice', 'Short privacy notice', 'legal',
   'Your information is handled in accordance with Australian privacy laws. We never share your medical information without consent.',
   'Forms and data collection pages'),
  
  ('id_verification_help', 'ID Verification Help', 'Help text for ID verification', 'help',
   'We need to verify your identity to ensure the safety of our telehealth services. Please upload a clear photo of your Australian driver''s licence or passport.',
   'ID verification step');

COMMENT ON TABLE public.content_blocks IS 'Editable microcopy and content snippets for the platform';
