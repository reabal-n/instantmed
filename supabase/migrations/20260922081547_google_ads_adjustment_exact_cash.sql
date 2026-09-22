-- Preserve exact Stripe cash separately from the reversible one-cent Ads floor.
CREATE OR REPLACE VIEW public.google_ads_conversion_adjustment_due
WITH (security_invoker = true)
AS
WITH latest_claim AS (
  SELECT DISTINCT ON (claim.intake_id)
    claim.intake_id,
    claim.id AS claim_id,
    claim.generation,
    claim.adjustment_type,
    claim.target_net_value_cents,
    claim.adjustment_at,
    claim.state
  FROM public.google_ads_conversion_adjustment_claims AS claim
  ORDER BY claim.intake_id, claim.generation DESC
)
SELECT
  target.intake_id,
  target.amount_cents,
  target.refund_amount_cents,
  target.payment_status,
  target.paid_at,
  CASE
    WHEN latest_claim.target_net_value_cents = target.target_net_value_cents
      THEN latest_claim.adjustment_at
    ELSE target.adjustment_at
  END AS adjustment_at,
  target.target_net_value_cents,
  latest_claim.claim_id,
  latest_claim.generation AS claim_generation,
  latest_claim.state AS claim_state,
  target.exact_target_net_value_cents
FROM public.stripe_payment_adjustment_targets AS target
LEFT JOIN latest_claim ON latest_claim.intake_id = target.intake_id
WHERE EXISTS (
  SELECT 1
  FROM public.audit_logs AS audit
  WHERE audit.intake_id = target.intake_id
    AND audit.action = 'google_ads_conversion_upload'
    AND audit.metadata ->> 'status' = 'success'
)
AND (
  (
    latest_claim.claim_id IS NULL
    AND target.target_net_value_cents < target.amount_cents
  )
  OR (
    latest_claim.state IN ('pending', 'retryable_failed')
    AND latest_claim.target_net_value_cents = target.target_net_value_cents
  )
  OR (
    latest_claim.state NOT IN ('reserved', 'unknown_outcome')
    AND latest_claim.target_net_value_cents <> target.target_net_value_cents
  )
)
-- A missing claim is eligible for its first attempt; SQL NULL must not exclude it.
AND NOT COALESCE((
  latest_claim.state = 'succeeded'
  AND latest_claim.target_net_value_cents = 0
  AND target.target_net_value_cents > 0
), false)
AND target.paid_at >= pg_catalog.clock_timestamp() - interval '54 days'
AND CASE
  WHEN latest_claim.target_net_value_cents = target.target_net_value_cents
    THEN latest_claim.adjustment_at
  ELSE target.adjustment_at
END <= pg_catalog.date_trunc('second', pg_catalog.clock_timestamp());

REVOKE ALL ON public.google_ads_conversion_adjustment_due
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.google_ads_conversion_adjustment_due TO service_role;

COMMENT ON VIEW public.google_ads_conversion_adjustment_due IS
  'Latest exact Ads desired states that are actionable; excludes completed states and fail-closed uncertain external outcomes';

