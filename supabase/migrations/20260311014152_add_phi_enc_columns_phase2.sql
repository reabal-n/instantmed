-- ============================================================================
-- PHI ENCRYPTION: ADD ENCRYPTED COLUMNS (PHASE 2)
--
-- Extends envelope encryption to remaining PHI fields:
--   - patient_notes.content_enc
--   - issued_certificates.patient_name_enc
--   - document_drafts.data_enc, edited_content_enc
--   - intake_answers.allergy_details_enc, medical_conditions_enc
--
-- Same pattern as 20260126140001_add_phi_encrypted_columns.sql:
--   JSONB column with AES-256-GCM envelope structure + GIN index on keyId
-- ============================================================================

-- -----------------------------------------------------------------------------
-- PATIENT_NOTES: content encryption
-- Clinical notes written by doctors — high sensitivity
-- -----------------------------------------------------------------------------
ALTER TABLE public.patient_notes
ADD COLUMN IF NOT EXISTS content_enc JSONB DEFAULT NULL;

COMMENT ON COLUMN public.patient_notes.content_enc IS
'Encrypted content using AES-256-GCM envelope encryption. Structure: {ciphertext, encryptedDataKey, iv, authTag, keyId, version}';

CREATE INDEX IF NOT EXISTS idx_patient_notes_content_enc_key
ON public.patient_notes ((content_enc->>'keyId'))
WHERE content_enc IS NOT NULL;

-- -----------------------------------------------------------------------------
-- ISSUED_CERTIFICATES: patient_name encryption
-- Patient name on issued medical certificates
-- -----------------------------------------------------------------------------
ALTER TABLE public.issued_certificates
ADD COLUMN IF NOT EXISTS patient_name_enc JSONB DEFAULT NULL;

COMMENT ON COLUMN public.issued_certificates.patient_name_enc IS
'Encrypted patient_name using AES-256-GCM envelope encryption. Structure: {ciphertext, encryptedDataKey, iv, authTag, keyId, version}';

CREATE INDEX IF NOT EXISTS idx_issued_certificates_patient_name_enc_key
ON public.issued_certificates ((patient_name_enc->>'keyId'))
WHERE patient_name_enc IS NOT NULL;

-- -----------------------------------------------------------------------------
-- DOCUMENT_DRAFTS: data + edited_content encryption
-- AI-generated clinical notes and med cert data contain PHI
-- Note: data_encrypted column exists from older migration (20250122000005)
--       but uses different naming convention. Adding data_enc for consistency
--       with the envelope encryption pattern.
-- -----------------------------------------------------------------------------
ALTER TABLE public.document_drafts
ADD COLUMN IF NOT EXISTS data_enc JSONB DEFAULT NULL;

COMMENT ON COLUMN public.document_drafts.data_enc IS
'Encrypted data using AES-256-GCM envelope encryption. Structure: {ciphertext, encryptedDataKey, iv, authTag, keyId, version}. Supersedes data_encrypted column.';

CREATE INDEX IF NOT EXISTS idx_document_drafts_data_enc_key
ON public.document_drafts ((data_enc->>'keyId'))
WHERE data_enc IS NOT NULL;

ALTER TABLE public.document_drafts
ADD COLUMN IF NOT EXISTS edited_content_enc JSONB DEFAULT NULL;

COMMENT ON COLUMN public.document_drafts.edited_content_enc IS
'Encrypted edited_content using AES-256-GCM envelope encryption. Structure: {ciphertext, encryptedDataKey, iv, authTag, keyId, version}';

CREATE INDEX IF NOT EXISTS idx_document_drafts_edited_content_enc_key
ON public.document_drafts ((edited_content_enc->>'keyId'))
WHERE edited_content_enc IS NOT NULL;

-- -----------------------------------------------------------------------------
-- INTAKE_ANSWERS: extracted plaintext field encryption
-- allergy_details and medical_conditions are extracted from answers JSONB
-- for querying, but contain PHI
-- -----------------------------------------------------------------------------
ALTER TABLE public.intake_answers
ADD COLUMN IF NOT EXISTS allergy_details_enc JSONB DEFAULT NULL;

COMMENT ON COLUMN public.intake_answers.allergy_details_enc IS
'Encrypted allergy_details using AES-256-GCM envelope encryption. Structure: {ciphertext, encryptedDataKey, iv, authTag, keyId, version}';

CREATE INDEX IF NOT EXISTS idx_intake_answers_allergy_enc_key
ON public.intake_answers ((allergy_details_enc->>'keyId'))
WHERE allergy_details_enc IS NOT NULL;

ALTER TABLE public.intake_answers
ADD COLUMN IF NOT EXISTS medical_conditions_enc JSONB DEFAULT NULL;

COMMENT ON COLUMN public.intake_answers.medical_conditions_enc IS
'Encrypted medical_conditions using AES-256-GCM envelope encryption. Structure: {ciphertext, encryptedDataKey, iv, authTag, keyId, version}';

CREATE INDEX IF NOT EXISTS idx_intake_answers_conditions_enc_key
ON public.intake_answers ((medical_conditions_enc->>'keyId'))
WHERE medical_conditions_enc IS NOT NULL;

-- -----------------------------------------------------------------------------
-- AUDIT: Log this migration
-- -----------------------------------------------------------------------------
INSERT INTO public.audit_logs (action, actor_type, metadata, created_at)
VALUES (
  'settings_changed',
  'system',
  jsonb_build_object(
    'settingType', 'phi_encryption_columns_added_phase2',
    'tables', ARRAY['patient_notes', 'issued_certificates', 'document_drafts', 'intake_answers'],
    'columns', ARRAY[
      'content_enc', 'patient_name_enc', 'data_enc',
      'edited_content_enc', 'allergy_details_enc', 'medical_conditions_enc'
    ]
  ),
  NOW()
);
