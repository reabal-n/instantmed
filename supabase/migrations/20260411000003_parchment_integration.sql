-- Parchment Health ePrescribing Integration
-- Links doctor and patient profiles to their Parchment identities
-- Also adds sex field required by Parchment for patient creation

-- Patient sex (required by Parchment: M, F, N, I)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS sex TEXT DEFAULT NULL
CHECK (sex IS NULL OR sex IN ('M', 'F', 'N', 'I'));

COMMENT ON COLUMN public.profiles.sex IS
'Patient sex for prescribing: M=Male, F=Female, N=Not stated, I=Intersex';

-- Doctor profiles: Parchment user ID for SSO and API calls
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS parchment_user_id TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.parchment_user_id IS
'Parchment Health user ID for SSO and prescribing API calls';

-- Patient profiles: Parchment patient ID for prescription management
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS parchment_patient_id TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.parchment_patient_id IS
'Parchment Health patient ID for prescription management';

-- Index for webhook lookup: match webhook partner_patient_id → profile
CREATE INDEX IF NOT EXISTS idx_profiles_parchment_patient_id
ON public.profiles (parchment_patient_id)
WHERE parchment_patient_id IS NOT NULL;

-- Index for SSO lookup: find doctor by parchment_user_id
CREATE INDEX IF NOT EXISTS idx_profiles_parchment_user_id
ON public.profiles (parchment_user_id)
WHERE parchment_user_id IS NOT NULL;
