-- Encrypt anonymous intake draft payloads captured before checkout.
--
-- New application writes keep recovery-safe email/first_name in plaintext, but
-- move draft answers plus surname/phone into encrypted JSONB envelopes.

ALTER TABLE public.partial_intakes
  ADD COLUMN IF NOT EXISTS answers_encrypted jsonb,
  ADD COLUMN IF NOT EXISTS identity_encrypted jsonb,
  ADD COLUMN IF NOT EXISTS encryption_metadata jsonb;

COMMENT ON COLUMN public.partial_intakes.answers_encrypted IS
  'Encrypted draft answers envelope for anonymous intake recovery drafts. New writes keep plaintext answers empty.';

COMMENT ON COLUMN public.partial_intakes.identity_encrypted IS
  'Encrypted draft identity envelope for surname and phone values not needed by recovery emails.';

COMMENT ON COLUMN public.partial_intakes.encryption_metadata IS
  'Operational encryption metadata for draft payload key/version tracking. Does not contain plaintext PHI.';
