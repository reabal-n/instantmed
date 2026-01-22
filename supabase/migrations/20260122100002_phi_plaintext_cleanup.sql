-- ============================================================================
-- PHI PLAINTEXT CLEANUP
-- Migration: 20260122100002
-- Purpose: NULL out plaintext PHI columns after encryption backfill is verified
-- ============================================================================
-- 
-- PREREQUISITES:
-- 1. Run encrypt:backfill script to populate encrypted columns
-- 2. Verify encryption_migration_status shows 100% completion
-- 3. Test that application correctly reads from encrypted columns
--
-- This migration is SAFE to run - it only NULLs data that has been encrypted.
-- If a record does NOT have encrypted data, the plaintext is preserved.
-- ============================================================================

-- Step 1: Create backup table for rollback capability (7 day retention)
CREATE TABLE IF NOT EXISTS public.profiles_phi_backup (
  id UUID PRIMARY KEY,
  medicare_number TEXT,
  date_of_birth DATE,
  phone TEXT,
  backed_up_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS - service role only
ALTER TABLE public.profiles_phi_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_phi_backup_service_role_only"
  ON public.profiles_phi_backup FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.profiles_phi_backup IS 
  'Temporary backup of plaintext PHI before cleanup. Delete after 7 days if no issues.';

-- Step 2: Backup plaintext data ONLY for records that have been encrypted
INSERT INTO public.profiles_phi_backup (id, medicare_number, date_of_birth, phone)
SELECT id, medicare_number, date_of_birth, phone
FROM public.profiles
WHERE phi_encrypted_at IS NOT NULL
  AND (medicare_number IS NOT NULL OR date_of_birth IS NOT NULL OR phone IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

-- Step 3: NULL out plaintext columns for encrypted records only
UPDATE public.profiles
SET 
  medicare_number = NULL,
  date_of_birth = NULL,
  phone = NULL
WHERE phi_encrypted_at IS NOT NULL
  AND (medicare_number IS NOT NULL OR date_of_birth IS NOT NULL OR phone IS NOT NULL);

-- Step 4: Log the cleanup
INSERT INTO public.encryption_migration_status (
  table_name,
  total_records,
  encrypted_records,
  completed_at
)
SELECT 
  'profiles_plaintext_cleanup',
  (SELECT COUNT(*) FROM public.profiles WHERE phi_encrypted_at IS NOT NULL),
  (SELECT COUNT(*) FROM public.profiles WHERE phi_encrypted_at IS NOT NULL AND medicare_number IS NULL),
  NOW()
ON CONFLICT DO NOTHING;

-- Step 5: Add constraint to prevent new plaintext writes (after confirming app is updated)
-- Uncomment after verifying application never writes plaintext:
-- 
-- ALTER TABLE public.profiles
--   ADD CONSTRAINT chk_no_plaintext_phi 
--   CHECK (
--     (medicare_number IS NULL OR medicare_number_encrypted IS NOT NULL) AND
--     (date_of_birth IS NULL OR date_of_birth_encrypted IS NOT NULL) AND
--     (phone IS NULL OR phone_encrypted IS NOT NULL)
--   );

-- Step 6: Update column comments
COMMENT ON COLUMN public.profiles.medicare_number IS 
  'DEPRECATED: Plaintext removed. Use medicare_number_encrypted only.';

COMMENT ON COLUMN public.profiles.date_of_birth IS 
  'DEPRECATED: Plaintext removed for encrypted records. Use date_of_birth_encrypted.';

COMMENT ON COLUMN public.profiles.phone IS 
  'DEPRECATED: Plaintext removed for encrypted records. Use phone_encrypted.';

-- ============================================================================
-- ROLLBACK PROCEDURE (if needed):
-- 
-- UPDATE public.profiles p
-- SET 
--   medicare_number = b.medicare_number,
--   date_of_birth = b.date_of_birth,
--   phone = b.phone
-- FROM public.profiles_phi_backup b
-- WHERE p.id = b.id;
-- 
-- DROP TABLE public.profiles_phi_backup;
-- ============================================================================
