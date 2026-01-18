-- Add idempotency key to intakes to prevent duplicate submissions

ALTER TABLE intakes 
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Create unique index only on non-null values (allows multiple NULLs for legacy data)
CREATE UNIQUE INDEX IF NOT EXISTS idx_intakes_idempotency_key 
  ON intakes(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN intakes.idempotency_key IS 'Client-generated key to prevent duplicate intake submissions on double-click';
