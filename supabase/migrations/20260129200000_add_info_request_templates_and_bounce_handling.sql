-- ============================================
-- INFO REQUEST TEMPLATES & EMAIL BOUNCE HANDLING
-- ============================================

-- ============================================
-- 1. Info Request Templates (like decline templates)
-- ============================================
CREATE TABLE IF NOT EXISTS public.info_request_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  message_template TEXT, -- Pre-filled message for patient
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  service_types TEXT[] DEFAULT '{}', -- Empty = all services
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default info request templates
INSERT INTO public.info_request_templates (code, label, description, message_template, display_order) VALUES
  ('photo_required', 'Photo Required', 'Request a photo of the condition or affected area', 'To help us assess your condition accurately, please upload a clear photo of the affected area. This helps our doctors provide the best care.', 1),
  ('id_verification', 'ID Verification Needed', 'Request identity verification documents', 'We need to verify your identity before proceeding. Please upload a clear photo of your government-issued ID (driver''s licence or passport).', 2),
  ('medication_details', 'Medication Details', 'Request more details about current medications', 'Please provide more details about your current medications, including dosages and how long you''ve been taking them.', 3),
  ('symptom_clarification', 'Symptom Clarification', 'Request more details about symptoms', 'To ensure we provide appropriate care, please describe your symptoms in more detail - when they started, severity, and any changes you''ve noticed.', 4),
  ('medical_history', 'Medical History', 'Request additional medical history', 'Please provide more details about your medical history relevant to this request, including any previous treatments or diagnoses.', 5),
  ('prescription_details', 'Previous Prescription', 'Request details of previous prescription', 'Please upload a photo or provide details of your previous prescription, including the prescribing doctor''s name and date.', 6),
  ('employer_details', 'Employer/Institution Details', 'Request employer or educational institution details', 'Please provide your employer or educational institution details, including the name and address where the certificate should be addressed.', 7),
  ('allergy_info', 'Allergy Information', 'Request allergy or contraindication details', 'Please list any known allergies or medications you cannot take. This is important for your safety.', 8),
  ('other', 'Other', 'Custom information request', 'Our doctor needs additional information to process your request. Please see the details below.', 10)
ON CONFLICT (code) DO NOTHING;

-- RLS for info request templates
ALTER TABLE public.info_request_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active info templates"
  ON public.info_request_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role full access to info templates"
  ON public.info_request_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. Email Bounce Handling - Add columns to profiles
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_bounced BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_bounce_reason TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_bounced_at TIMESTAMPTZ;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_delivery_failures INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_email_bounced 
ON public.profiles(email_bounced) 
WHERE email_bounced = true;

COMMENT ON COLUMN public.profiles.email_bounced IS 'Whether emails to this patient are bouncing';
COMMENT ON COLUMN public.profiles.email_bounce_reason IS 'Reason for email bounce (e.g., invalid address, mailbox full)';
COMMENT ON COLUMN public.profiles.email_delivery_failures IS 'Count of consecutive delivery failures';

-- ============================================
-- 3. Add info_request_code to intakes
-- ============================================
ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS info_request_code TEXT;

ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS info_request_message TEXT;

ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS info_requested_at TIMESTAMPTZ;

ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS info_requested_by UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.intakes.info_request_code IS 'Template code used for info request';
COMMENT ON COLUMN public.intakes.info_request_message IS 'Message sent to patient requesting info';
