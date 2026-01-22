-- ============================================
-- PHI ENCRYPTION: Add encrypted columns for sensitive fields
-- ============================================
-- This migration adds encrypted columns for PHI fields to comply with
-- Australian Privacy Act 1988 and healthcare data protection requirements.
--
-- Strategy:
-- 1. Add new encrypted columns (TEXT for base64 ciphertext)
-- 2. Keep original columns during migration period
-- 3. Application handles encryption/decryption transparently
-- 4. Run backfill script to encrypt existing data
-- 5. Future migration will drop original columns after verification
-- ============================================

-- Add encrypted columns for PHI fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS medicare_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;

-- Add comment explaining the encryption
COMMENT ON COLUMN public.profiles.medicare_number_encrypted IS 'AES-256-GCM encrypted Medicare number (base64)';
COMMENT ON COLUMN public.profiles.date_of_birth_encrypted IS 'AES-256-GCM encrypted date of birth (base64)';
COMMENT ON COLUMN public.profiles.phone_encrypted IS 'AES-256-GCM encrypted phone number (base64)';

-- Add index for encrypted medicare lookups (if needed for verification)
-- Note: Searching encrypted data requires application-level handling
-- This index is only useful if you implement deterministic encryption for lookups
-- CREATE INDEX IF NOT EXISTS idx_profiles_medicare_encrypted
--   ON public.profiles(medicare_number_encrypted)
--   WHERE medicare_number_encrypted IS NOT NULL;

-- Track encryption status for migration
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phi_encrypted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.phi_encrypted_at IS 'Timestamp when PHI fields were encrypted (for migration tracking)';

-- Create audit trigger for encrypted field access
CREATE OR REPLACE FUNCTION public.audit_phi_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when encrypted PHI fields are read
  -- This helps with compliance auditing
  IF TG_OP = 'SELECT' AND (
    NEW.medicare_number_encrypted IS NOT NULL OR
    NEW.date_of_birth_encrypted IS NOT NULL OR
    NEW.phone_encrypted IS NOT NULL
  ) THEN
    INSERT INTO public.audit_log (
      event_type,
      table_name,
      record_id,
      user_id,
      metadata
    ) VALUES (
      'phi_access',
      'profiles',
      NEW.id,
      auth.uid(),
      jsonb_build_object(
        'fields_accessed', ARRAY[
          CASE WHEN NEW.medicare_number_encrypted IS NOT NULL THEN 'medicare_number' END,
          CASE WHEN NEW.date_of_birth_encrypted IS NOT NULL THEN 'date_of_birth' END,
          CASE WHEN NEW.phone_encrypted IS NOT NULL THEN 'phone' END
        ]
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The audit trigger for SELECT is complex in PostgreSQL
-- Consider using pg_audit extension for comprehensive access logging
-- or implement audit logging in the application layer instead

-- ============================================
-- MIGRATION STATUS TRACKING
-- ============================================

-- Create table to track encryption migration progress
CREATE TABLE IF NOT EXISTS public.encryption_migration_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  encrypted_records INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for migration status (admin only)
ALTER TABLE public.encryption_migration_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view encryption migration status"
  ON public.encryption_migration_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Only service role can modify encryption migration status"
  ON public.encryption_migration_status FOR ALL
  USING (auth.role() = 'service_role');
