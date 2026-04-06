-- ============================================================================
-- CERTIFICATE TEMPLATES TABLE
-- Versioned, immutable template configurations for medical certificates
-- ============================================================================

CREATE TABLE public.certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL CHECK (template_type IN ('med_cert_work', 'med_cert_uni', 'med_cert_carer')),
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  
  UNIQUE(template_type, version)
);

-- Only one active template per type
CREATE UNIQUE INDEX idx_certificate_templates_active 
  ON public.certificate_templates (template_type) 
  WHERE is_active = true;

-- Index for type lookups
CREATE INDEX idx_certificate_templates_type 
  ON public.certificate_templates(template_type);

-- Index for version ordering
CREATE INDEX idx_certificate_templates_version 
  ON public.certificate_templates(template_type, version DESC);

-- RLS
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read templates (doctors need this for certificate generation)
CREATE POLICY "Anyone authenticated can read templates" 
  ON public.certificate_templates
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Admins can manage templates
CREATE POLICY "Admins can manage templates" 
  ON public.certificate_templates
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- Default template config structure
-- {
--   "layout": {
--     "headerStyle": "logo-left" | "logo-center" | "no-logo",
--     "marginPreset": "S" | "M" | "L",
--     "fontSizePreset": "S" | "M" | "L",
--     "accentColorPreset": "mono" | "slate" | "blue"
--   },
--   "options": {
--     "showVerificationBlock": true,
--     "signatureStyle": "image" | "typed",
--     "showAbn": true,
--     "showPhone": false,
--     "showEmail": false,
--     "showAddress": true
--   }
-- }

-- Seed initial templates for each type
INSERT INTO public.certificate_templates (template_type, version, name, config, is_active, activated_at)
VALUES 
  (
    'med_cert_work', 
    1, 
    'Work Certificate v1', 
    '{
      "layout": {
        "headerStyle": "logo-left",
        "marginPreset": "M",
        "fontSizePreset": "M",
        "accentColorPreset": "slate"
      },
      "options": {
        "showVerificationBlock": true,
        "signatureStyle": "image",
        "showAbn": true,
        "showPhone": false,
        "showEmail": true,
        "showAddress": true
      }
    }'::jsonb, 
    true, 
    NOW()
  ),
  (
    'med_cert_uni', 
    1, 
    'University Certificate v1', 
    '{
      "layout": {
        "headerStyle": "logo-left",
        "marginPreset": "M",
        "fontSizePreset": "M",
        "accentColorPreset": "slate"
      },
      "options": {
        "showVerificationBlock": true,
        "signatureStyle": "image",
        "showAbn": true,
        "showPhone": false,
        "showEmail": true,
        "showAddress": true
      }
    }'::jsonb, 
    true, 
    NOW()
  ),
  (
    'med_cert_carer', 
    1, 
    'Carer Certificate v1', 
    '{
      "layout": {
        "headerStyle": "logo-left",
        "marginPreset": "M",
        "fontSizePreset": "M",
        "accentColorPreset": "slate"
      },
      "options": {
        "showVerificationBlock": true,
        "signatureStyle": "image",
        "showAbn": true,
        "showPhone": false,
        "showEmail": true,
        "showAddress": true
      }
    }'::jsonb, 
    true, 
    NOW()
  );

COMMENT ON TABLE public.certificate_templates IS 'Versioned template configurations for medical certificates. Immutable once created.';
COMMENT ON COLUMN public.certificate_templates.config IS 'JSON configuration for template layout and options';
