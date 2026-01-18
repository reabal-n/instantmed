-- ============================================================================
-- DOCTOR IDENTITY FIELDS
-- Additional fields for doctor certificate identity on profiles table
-- ============================================================================

-- Add provider number (Medicare provider number - 6 digits + 1 check character)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS provider_number TEXT;

-- Add nominals (e.g., "MBBS, FRACGP")
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nominals TEXT;

-- Add signature image storage path
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS signature_storage_path TEXT;

-- Add flag for whether certificate identity is complete
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS certificate_identity_complete BOOLEAN DEFAULT false;

-- Index for provider number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_provider_number ON public.profiles(provider_number) 
WHERE provider_number IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.profiles.provider_number IS 'Medicare provider number (e.g., 2426577L)';
COMMENT ON COLUMN public.profiles.nominals IS 'Professional qualifications/nominals (e.g., MBBS, FRACGP)';
COMMENT ON COLUMN public.profiles.signature_storage_path IS 'Path to signature image in storage';
COMMENT ON COLUMN public.profiles.certificate_identity_complete IS 'True if provider_number and ahpra_number are set';

-- Function to check if certificate identity is complete
CREATE OR REPLACE FUNCTION public.check_certificate_identity_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Certificate identity is complete if both provider_number and ahpra_number are set
  NEW.certificate_identity_complete := (
    NEW.provider_number IS NOT NULL AND 
    NEW.provider_number != '' AND
    NEW.ahpra_number IS NOT NULL AND 
    NEW.ahpra_number != ''
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update certificate_identity_complete
DROP TRIGGER IF EXISTS trigger_check_certificate_identity ON public.profiles;
CREATE TRIGGER trigger_check_certificate_identity
  BEFORE INSERT OR UPDATE OF provider_number, ahpra_number ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_certificate_identity_complete();

-- Update existing doctor profiles to set the flag correctly
UPDATE public.profiles
SET certificate_identity_complete = (
  provider_number IS NOT NULL AND 
  provider_number != '' AND
  ahpra_number IS NOT NULL AND 
  ahpra_number != ''
)
WHERE role IN ('doctor', 'admin');
