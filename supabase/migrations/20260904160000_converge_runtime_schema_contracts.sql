-- Converge fresh migration replay with the columns used by current runtime
-- reads and writes. This migration is intentionally additive: legacy
-- ciphertext and historical note attribution remain untouched.

ALTER TABLE public.intake_answers ADD COLUMN IF NOT EXISTS answers_encrypted JSONB;
ALTER TABLE public.intake_answers ADD COLUMN IF NOT EXISTS encryption_metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_intake_answers_encrypted_key
ON public.intake_answers ((answers_encrypted->>'keyId'))
WHERE answers_encrypted IS NOT NULL;

COMMENT ON COLUMN public.intake_answers.answers_encrypted IS
'Authoritative AES-256-GCM envelope for payment-safety answer reads when present. The legacy answers_enc column is retained and is not promoted by this migration.';

COMMENT ON COLUMN public.intake_answers.encryption_metadata IS
'Non-authoritative metadata describing answers_encrypted, such as keyId, version, and encryptedAt.';

ALTER TABLE public.patient_notes ADD COLUMN IF NOT EXISTS created_by_name TEXT;

COMMENT ON COLUMN public.patient_notes.created_by_name IS
'Nullable display snapshot of the note author name for new writes. created_by remains authoritative and historical rows are not backfilled.';
