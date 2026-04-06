-- ============================================================================
-- PHI ENCRYPTION: ADD ENCRYPTED COLUMNS
-- 
-- Stage 2B: Add encrypted columns alongside plaintext (for gradual migration)
-- Plaintext columns are KEPT for rollback capability until Stage 5
-- ============================================================================

-- -----------------------------------------------------------------------------
-- INTAKES: doctor_notes encryption
-- -----------------------------------------------------------------------------
ALTER TABLE public.intakes 
ADD COLUMN IF NOT EXISTS doctor_notes_enc JSONB DEFAULT NULL;

COMMENT ON COLUMN public.intakes.doctor_notes_enc IS 
'Encrypted doctor_notes using AES-256-GCM envelope encryption. Structure: {ciphertext, encryptedDataKey, iv, authTag, keyId, version}';

-- Index on encryption key ID for audit/rotation queries
CREATE INDEX IF NOT EXISTS idx_intakes_doctor_notes_enc_key 
ON public.intakes ((doctor_notes_enc->>'keyId')) 
WHERE doctor_notes_enc IS NOT NULL;

-- -----------------------------------------------------------------------------
-- INTAKE_ANSWERS: answers encryption
-- -----------------------------------------------------------------------------
ALTER TABLE public.intake_answers 
ADD COLUMN IF NOT EXISTS answers_enc JSONB DEFAULT NULL;

COMMENT ON COLUMN public.intake_answers.answers_enc IS 
'Encrypted answers using AES-256-GCM envelope encryption. Structure: {ciphertext, encryptedDataKey, iv, authTag, keyId, version}';

CREATE INDEX IF NOT EXISTS idx_intake_answers_enc_key 
ON public.intake_answers ((answers_enc->>'keyId')) 
WHERE answers_enc IS NOT NULL;

-- -----------------------------------------------------------------------------
-- AI_CHAT_TRANSCRIPTS: messages encryption
-- -----------------------------------------------------------------------------
-- First check if table exists (it may not in all environments)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_chat_transcripts') THEN
    ALTER TABLE public.ai_chat_transcripts 
    ADD COLUMN IF NOT EXISTS messages_enc JSONB DEFAULT NULL;
    
    COMMENT ON COLUMN public.ai_chat_transcripts.messages_enc IS 
    'Encrypted messages using AES-256-GCM envelope encryption. Structure: {ciphertext, encryptedDataKey, iv, authTag, keyId, version}';
    
    CREATE INDEX IF NOT EXISTS idx_ai_chat_transcripts_enc_key 
    ON public.ai_chat_transcripts ((messages_enc->>'keyId')) 
    WHERE messages_enc IS NOT NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- ENCRYPTION METADATA TABLE (for key rotation tracking)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.phi_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rotating', 'retired')),
  records_encrypted INTEGER DEFAULT 0,
  records_migrated INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_phi_encryption_keys_status ON public.phi_encryption_keys(status);

-- RLS: Only service role can access encryption metadata
ALTER TABLE public.phi_encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for phi_encryption_keys"
  ON public.phi_encryption_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.phi_encryption_keys IS 
'Tracks PHI encryption key usage for rotation and audit purposes. Contains no actual keys.';

-- -----------------------------------------------------------------------------
-- HELPER FUNCTION: Check if record is encrypted
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_phi_encrypted(enc_column JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT enc_column IS NOT NULL 
    AND enc_column->>'ciphertext' IS NOT NULL 
    AND enc_column->>'keyId' IS NOT NULL;
$$;

COMMENT ON FUNCTION public.is_phi_encrypted IS 
'Check if a PHI field has been encrypted (for migration tracking)';

-- -----------------------------------------------------------------------------
-- AUDIT: Log this migration
-- -----------------------------------------------------------------------------
INSERT INTO public.audit_logs (action, actor_type, metadata, created_at)
VALUES (
  'settings_changed',
  'system',
  jsonb_build_object(
    'settingType', 'phi_encryption_columns_added',
    'tables', ARRAY['intakes', 'intake_answers', 'ai_chat_transcripts'],
    'columns', ARRAY['doctor_notes_enc', 'answers_enc', 'messages_enc']
  ),
  NOW()
);
