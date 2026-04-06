-- ============================================
-- SERVICES: Available telehealth services
-- ============================================

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Service identification
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  description TEXT,
  
  -- Categorization
  type public.service_type NOT NULL,
  category TEXT, -- Sub-category for grouping
  
  -- Pricing (in cents)
  price_cents INTEGER NOT NULL DEFAULT 0,
  priority_fee_cents INTEGER DEFAULT 0, -- Extra fee for priority processing
  
  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  requires_id_verification BOOLEAN DEFAULT FALSE,
  requires_medicare BOOLEAN DEFAULT FALSE,
  requires_photo BOOLEAN DEFAULT FALSE,
  min_age INTEGER, -- Minimum age requirement
  max_age INTEGER, -- Maximum age requirement
  allowed_states TEXT[], -- States where service is available
  
  -- SLA configuration (in minutes)
  sla_standard_minutes INTEGER DEFAULT 1440, -- 24 hours
  sla_priority_minutes INTEGER DEFAULT 240,  -- 4 hours
  
  -- Questionnaire configuration
  questionnaire_id TEXT, -- Reference to questionnaire config
  eligibility_rules JSONB DEFAULT '{}', -- Eligibility check rules
  
  -- Display
  icon_name TEXT,
  display_order INTEGER DEFAULT 0,
  badge_text TEXT, -- e.g., "Most Popular", "New"
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_services_slug ON public.services(slug);
CREATE INDEX idx_services_type ON public.services(type);
CREATE INDEX idx_services_active ON public.services(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_services_display_order ON public.services(display_order);

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Anyone can view active services
CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT
  USING (is_active = TRUE);

-- Admins can view all services
CREATE POLICY "Admins can view all services"
  ON public.services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Admins can manage services
CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- SEED DATA: Initial services
-- ============================================

INSERT INTO public.services (slug, name, short_name, type, price_cents, description, display_order, requires_id_verification) VALUES
  ('weight-loss', 'Weight Loss Program', 'Weight Loss', 'weight_loss', 4900, 'Medically supervised weight management with GLP-1 medications', 1, true),
  ('mens-health-ed', 'Erectile Dysfunction', 'ED Treatment', 'mens_health', 3900, 'Discreet treatment for erectile dysfunction', 2, true),
  ('mens-health-hair', 'Hair Loss Treatment', 'Hair Loss', 'mens_health', 3500, 'Evidence-based hair loss solutions', 3, true),
  ('common-scripts', 'Prescription Refills', 'Scripts', 'common_scripts', 2500, 'Refill your regular prescriptions online', 4, false),
  ('med-cert-sick', 'Sick Certificate', 'Sick Cert', 'med_certs', 1900, 'Medical certificate for work or study', 5, false),
  ('med-cert-carer', 'Carers Certificate', 'Carers Cert', 'med_certs', 1900, 'Certificate for caring for a sick family member', 6, false),
  ('referral-specialist', 'Specialist Referral', 'Referral', 'referrals', 3500, 'Referral to a specialist doctor', 7, false),
  ('pathology-std', 'STI Testing', 'STI Test', 'pathology', 0, 'Discreet sexually transmitted infection testing', 8, true);
