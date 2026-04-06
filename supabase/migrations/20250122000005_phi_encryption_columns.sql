-- ============================================================================
-- PHI Encryption: Add Encrypted Columns
-- 
-- Phase 1 of envelope encryption implementation.
-- Adds columns to store encrypted PHI alongside plaintext during migration.
-- 
-- NOTE: intake_answers table does not exist in this database.
-- PHI is stored in intake_drafts and document_drafts instead.
-- ============================================================================

-- Add encrypted columns to intake_drafts
ALTER TABLE public.intake_drafts
ADD COLUMN IF NOT EXISTS data_encrypted JSONB,
ADD COLUMN IF NOT EXISTS encryption_metadata JSONB;

-- Add encrypted columns to document_drafts
ALTER TABLE public.document_drafts
ADD COLUMN IF NOT EXISTS data_encrypted JSONB,
ADD COLUMN IF NOT EXISTS encryption_metadata JSONB;

-- Comments for documentation
COMMENT ON COLUMN public.intake_drafts.data_encrypted IS 
'Encrypted draft data using envelope encryption';

COMMENT ON COLUMN public.document_drafts.data_encrypted IS 
'Encrypted document draft data using envelope encryption';

-- Index for finding unencrypted records during migration
CREATE INDEX IF NOT EXISTS idx_intake_drafts_unencrypted
ON public.intake_drafts(id)
WHERE data_encrypted IS NULL AND data IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_drafts_unencrypted
ON public.document_drafts(id)
WHERE data_encrypted IS NULL AND data IS NOT NULL;

-- ============================================================================
-- PHI Encryption Audit Table
-- Tracks encryption/decryption operations for compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.phi_encryption_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was accessed
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  key_id TEXT NOT NULL,
  
  -- Operation details
  operation TEXT NOT NULL CHECK (operation IN ('encrypt', 'decrypt', 'rotate')),
  
  -- Who accessed it
  actor_id UUID REFERENCES public.profiles(id),
  actor_role TEXT,
  
  -- Context
  request_path TEXT,
  ip_address INET,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for compliance queries
CREATE INDEX IF NOT EXISTS idx_phi_audit_record 
ON public.phi_encryption_audit(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_phi_audit_actor 
ON public.phi_encryption_audit(actor_id);

CREATE INDEX IF NOT EXISTS idx_phi_audit_created 
ON public.phi_encryption_audit(created_at);

-- RLS for audit table (service role only)
ALTER TABLE public.phi_encryption_audit ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write audit logs
CREATE POLICY "Service role only" ON public.phi_encryption_audit
FOR ALL
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.phi_encryption_audit IS 
'Audit log for PHI encryption/decryption operations. Required for HIPAA compliance.';
