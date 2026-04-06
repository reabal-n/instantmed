-- ============================================================================
-- P1 FIX: Add email verification fields for guest profile linking security
-- 
-- When a guest checks out, their profile is created with email_verified=false.
-- When an authenticated user signs up with the same email, we should NOT 
-- automatically link their requests unless the email has been verified.
-- ============================================================================

-- Add email verification columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Existing authenticated profiles (with auth_user_id) are considered verified
-- since Supabase Auth handles email verification
UPDATE public.profiles
SET 
  email_verified = true,
  email_verified_at = created_at
WHERE auth_user_id IS NOT NULL
AND email_verified = false;

-- Add index for guest profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified 
ON public.profiles(email, email_verified) 
WHERE auth_user_id IS NULL;

-- Comments
COMMENT ON COLUMN public.profiles.email_verified IS 
'Whether the email address has been verified. Guest profiles start unverified.';
COMMENT ON COLUMN public.profiles.email_verified_at IS 
'When the email was verified. NULL for unverified emails.';
