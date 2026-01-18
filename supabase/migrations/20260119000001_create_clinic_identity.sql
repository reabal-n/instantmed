-- ============================================================================
-- CLINIC IDENTITY TABLE
-- Global singleton for clinic branding on certificates
-- ============================================================================

CREATE TABLE public.clinic_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name TEXT NOT NULL,
  trading_name TEXT,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  suburb TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA')),
  postcode TEXT NOT NULL,
  abn TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  logo_storage_path TEXT,
  footer_disclaimer TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Ensure only one active record at a time
CREATE UNIQUE INDEX idx_clinic_identity_active 
  ON public.clinic_identity (is_active) 
  WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER clinic_identity_updated_at
  BEFORE UPDATE ON public.clinic_identity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.clinic_identity ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active clinic identity (needed for certificate generation)
CREATE POLICY "Anyone can read active clinic identity" 
  ON public.clinic_identity
  FOR SELECT 
  TO authenticated
  USING (is_active = true);

-- Admins can manage clinic identity
CREATE POLICY "Admins can manage clinic identity" 
  ON public.clinic_identity
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- Seed default clinic identity
INSERT INTO public.clinic_identity (
  clinic_name, 
  trading_name, 
  address_line_1, 
  suburb, 
  state, 
  postcode, 
  abn, 
  footer_disclaimer, 
  is_active
) VALUES (
  'InstantMed Pty Ltd',
  'InstantMed',
  'Level 1, 123 Collins Street',
  'Melbourne',
  'VIC',
  '3000',
  '00 000 000 000',
  'This medical certificate was issued via InstantMed telehealth services. Verify authenticity at instantmed.com.au/verify',
  true
);

COMMENT ON TABLE public.clinic_identity IS 'Global clinic branding configuration for medical certificates';
