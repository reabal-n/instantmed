-- Fix document_drafts model default
-- The original migration set the default to 'openai/gpt-4o-mini' but
-- InstantMed uses Anthropic Claude via Vercel AI SDK, not OpenAI.
-- Update to match the actual model used in lib/ai/provider.ts.

ALTER TABLE document_drafts
  ALTER COLUMN model SET DEFAULT 'anthropic/claude-sonnet-4-20250514';

-- Also update any existing rows that still have the old default
UPDATE document_drafts
  SET model = 'anthropic/claude-sonnet-4-20250514'
  WHERE model = 'openai/gpt-4o-mini';
