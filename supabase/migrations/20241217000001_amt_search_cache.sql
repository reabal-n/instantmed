-- Migration: Create AMT search cache table
-- Purpose: Replace in-memory cache with persistent Supabase cache (24h TTL)

-- Create the amt_search_cache table
CREATE TABLE IF NOT EXISTS amt_search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_norm text UNIQUE NOT NULL,
  results jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index on query_norm for fast lookups (unique constraint already creates one)
-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_amt_search_cache_expires_at ON amt_search_cache(expires_at);

-- Add comment for documentation
COMMENT ON TABLE amt_search_cache IS 'Persistent cache for AMT medication search results from NCTS FHIR. TTL 24 hours.';
COMMENT ON COLUMN amt_search_cache.query_norm IS 'Normalized search query (lowercase, trimmed)';
COMMENT ON COLUMN amt_search_cache.results IS 'Array of AMT search results returned to client';
COMMENT ON COLUMN amt_search_cache.expires_at IS 'Cache expiration timestamp (24h from creation)';

-- RLS: Service role only (no client access needed)
ALTER TABLE amt_search_cache ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed - this table is only accessed via service role from API routes
