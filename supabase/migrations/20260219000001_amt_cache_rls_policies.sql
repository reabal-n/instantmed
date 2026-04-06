-- Migration: Add explicit RLS policies for amt_search_cache
-- Purpose: Defense-in-depth — RLS is already enabled but no policies exist.
-- Without policies, authenticated/anon roles get zero access (deny-by-default),
-- which is correct. The service role bypasses RLS entirely.
-- This migration adds an explicit service-role-only SELECT policy for documentation.

-- Allow service role to read cache entries (service role bypasses RLS,
-- but this policy documents the intended access pattern)
CREATE POLICY "Service role can read cache"
  ON amt_search_cache
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert cache"
  ON amt_search_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update cache"
  ON amt_search_cache
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete expired cache"
  ON amt_search_cache
  FOR DELETE
  TO service_role
  USING (true);

-- Add explicit comment
COMMENT ON TABLE amt_search_cache IS 'Persistent cache for AMT medication search results from NCTS FHIR. TTL 24 hours. Service-role only — no client access.';
