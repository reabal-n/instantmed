-- Add unique index on intakes.idempotency_key for efficient duplicate detection
-- This prevents table scans when checking for duplicate submissions

CREATE UNIQUE INDEX IF NOT EXISTS idx_intakes_idempotency_key 
ON intakes(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

COMMENT ON INDEX idx_intakes_idempotency_key IS 
  'Unique partial index for idempotency key lookups - prevents duplicate checkout submissions';
