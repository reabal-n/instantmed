-- ============================================================================
-- FLAG: Pre-operational outlier intakes
--
-- Intakes 479247c7 (528h wait, approved Feb 21) and 7c93fc88 (408h wait,
-- approved Feb 21) were from the soft-launch period before the queue was
-- staffed. They were batch-approved manually and massively skew the
-- approval-time average. Mark them so reporting queries can exclude them.
--
-- Usage in queries:
--   WHERE exclude_from_reporting IS NOT TRUE
-- ============================================================================

-- Add column if it doesn't exist
ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS exclude_from_reporting BOOLEAN DEFAULT FALSE;

-- Flag the two pre-operational outliers
UPDATE public.intakes
SET
  exclude_from_reporting = TRUE,
  updated_at = NOW()
WHERE id IN (
  '479247c7-5f5e-451c-99fa-092f5e5ebe38'::uuid,
  '7c93fc88-8850-480b-8bde-8c7233d6db63'::uuid
);

-- Audit log
INSERT INTO public.audit_logs (action, actor_type, metadata, created_at)
VALUES (
  'settings_changed',
  'system',
  jsonb_build_object(
    'settingType', 'exclude_from_reporting',
    'affected_intakes', ARRAY['479247c7', '7c93fc88'],
    'reason', 'Pre-operational intakes approved in batch on 2026-02-21 — 528h and 408h wait times skew approval-time averages'
  ),
  NOW()
);
