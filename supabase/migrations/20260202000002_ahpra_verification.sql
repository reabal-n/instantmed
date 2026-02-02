-- Add AHPRA verification tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ahpra_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ahpra_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ahpra_verified_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ahpra_verification_notes TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ahpra_next_review_at TIMESTAMPTZ;
