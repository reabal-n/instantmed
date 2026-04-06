-- Add encrypted columns for PHI fields in patient_health_profiles
-- Phase: patient_health_profiles encryption (per SECURITY.md PHI inventory)
--
-- Encrypted fields: allergies, conditions, current_medications, notes
-- Pattern: dual-write (plaintext + _enc) with decrypt-on-read fallback

ALTER TABLE patient_health_profiles
  ADD COLUMN IF NOT EXISTS allergies_enc JSONB,
  ADD COLUMN IF NOT EXISTS conditions_enc JSONB,
  ADD COLUMN IF NOT EXISTS current_medications_enc JSONB,
  ADD COLUMN IF NOT EXISTS notes_enc JSONB;

COMMENT ON COLUMN patient_health_profiles.allergies_enc IS 'AES-256-GCM encrypted allergies (EncryptedPHI envelope)';
COMMENT ON COLUMN patient_health_profiles.conditions_enc IS 'AES-256-GCM encrypted conditions (EncryptedPHI envelope)';
COMMENT ON COLUMN patient_health_profiles.current_medications_enc IS 'AES-256-GCM encrypted current_medications (EncryptedPHI envelope)';
COMMENT ON COLUMN patient_health_profiles.notes_enc IS 'AES-256-GCM encrypted notes (EncryptedPHI envelope)';
