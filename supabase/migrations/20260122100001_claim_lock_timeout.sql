-- ============================================================================
-- CLAIM LOCK TIMEOUT
-- Migration: 20260122100001
-- Purpose: Auto-release stale intake claims to prevent queue stalls
-- ============================================================================

-- Add index for efficient stale claim queries
CREATE INDEX IF NOT EXISTS idx_intakes_stale_claims_v2
  ON public.intakes (claimed_by, claimed_at)
  WHERE claimed_by IS NOT NULL AND status IN ('paid', 'in_review');

-- Function to release stale claims (claims older than 30 minutes)
CREATE OR REPLACE FUNCTION public.release_stale_intake_claims(
  stale_threshold_minutes INTEGER DEFAULT 30
)
RETURNS TABLE(
  intake_id UUID,
  previous_claimed_by UUID,
  claimed_at TIMESTAMPTZ,
  minutes_stale INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH stale_claims AS (
    SELECT 
      i.id,
      i.claimed_by AS prev_claimed_by,
      i.claimed_at AS prev_claimed_at,
      EXTRACT(EPOCH FROM (NOW() - i.claimed_at)) / 60 AS mins_stale
    FROM public.intakes i
    WHERE i.claimed_by IS NOT NULL
      AND i.claimed_at IS NOT NULL
      AND i.status IN ('paid', 'in_review')
      AND i.claimed_at < NOW() - (stale_threshold_minutes || ' minutes')::INTERVAL
  ),
  released AS (
    UPDATE public.intakes
    SET 
      claimed_by = NULL,
      claimed_at = NULL,
      updated_at = NOW()
    WHERE id IN (SELECT id FROM stale_claims)
    RETURNING id
  )
  SELECT 
    sc.id,
    sc.prev_claimed_by,
    sc.prev_claimed_at,
    sc.mins_stale::INTEGER
  FROM stale_claims sc
  WHERE sc.id IN (SELECT id FROM released);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION public.release_stale_intake_claims FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_stale_intake_claims TO service_role;

-- Add comment
COMMENT ON FUNCTION public.release_stale_intake_claims IS 
  'Releases intake claims that have been held for longer than the threshold (default 30 min). Call from cron job to prevent queue stalls.';

-- ============================================================================
-- CRON JOB HELPER: Track last run to prevent double-runs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cron_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL UNIQUE,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Only service role can access
ALTER TABLE public.cron_job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cron_job_runs_service_role_only"
  ON public.cron_job_runs FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE public.cron_job_runs IS 
  'Tracks cron job execution to prevent concurrent runs and enable monitoring.';
