-- Reconcile monitoring against exact cash and existing provider evidence.
-- This changes no payment, claim, audit row, or Google conversion.
CREATE OR REPLACE VIEW public.google_ads_conversion_adjustment_claim_health
WITH (security_invoker = true)
AS
WITH latest_claim AS (
  SELECT DISTINCT ON (claim.intake_id)
    claim.intake_id, claim.target_net_value_cents, claim.state, claim.completed_at
  FROM public.google_ads_conversion_adjustment_claims AS claim
  ORDER BY claim.intake_id, claim.generation DESC
), legacy_zero AS (
  SELECT DISTINCT claim.intake_id
  FROM public.google_ads_conversion_adjustment_claims AS claim
  WHERE claim.state = 'succeeded' AND claim.target_net_value_cents = 0
), target_evidence AS (
  SELECT
    target.*,
    latest.state AS claim_state,
    latest.target_net_value_cents AS claim_target,
    upload.created_at AS uploaded_at,
    -- Match the existing adjustment runner's 72-hour evidence rule. A recent
    -- upload invalidates older not-found evidence. A missing claim alone,
    -- expiry, or an error observed inside grace never proves non-counting.
    COALESCE(
      latest.intake_id IS NULL
      AND adjustment.metadata ->> 'status' IN ('failed', 'terminal_failed')
      AND (
        adjustment.metadata ->> 'terminal_reason' = 'conversion_not_found'
        OR adjustment.metadata ->> 'error_code' LIKE '%CONVERSION_NOT_FOUND%'
      )
      AND adjustment.created_at > upload.created_at + interval '72 hours'
      AND target.exact_target_net_value_cents = 0
      AND target.target_net_value_cents = 1
      AND CASE
        WHEN adjustment.metadata ? 'exact_target_net_value_cents'
          THEN adjustment.metadata -> 'exact_target_net_value_cents' = '0'::jsonb
        WHEN adjustment.metadata ->> 'adjustment_type' = 'RETRACTION' THEN true
        ELSE adjustment.metadata -> 'target_net_value_cents' = '0'::jsonb
      END,
      false
    ) AS legacy_post_grace_not_counted,
    COALESCE(
      latest.state IN ('succeeded', 'resolved_not_counted')
      AND (latest.state = 'succeeded' OR upload.created_at <= latest.completed_at)
      AND latest.target_net_value_cents = 0
      AND target.exact_target_net_value_cents = 0
      AND target.target_net_value_cents = 1,
      false
    ) AS legacy_floor_only
  FROM public.stripe_payment_adjustment_targets AS target
  LEFT JOIN latest_claim AS latest ON latest.intake_id = target.intake_id
  LEFT JOIN LATERAL (
    SELECT audit.created_at
    FROM public.audit_logs AS audit
    WHERE audit.intake_id = target.intake_id
      AND audit.action = 'google_ads_conversion_upload'
      AND audit.metadata ->> 'status' = 'success'
      AND COALESCE(audit.metadata ->> 'runtime_source', '') <> 'node'
    ORDER BY audit.created_at DESC, audit.id DESC
    LIMIT 1
  ) AS upload ON true
  LEFT JOIN LATERAL (
    SELECT audit.created_at, audit.metadata
    FROM public.audit_logs AS audit
    WHERE audit.intake_id = target.intake_id
      AND audit.action = 'google_ads_conversion_adjustment'
      AND COALESCE(audit.metadata ->> 'runtime_source', '') <> 'node'
    ORDER BY audit.created_at DESC, audit.id DESC
    LIMIT 1
  ) AS adjustment ON true
)
SELECT
  count(*) FILTER (WHERE claim.state = 'unknown_outcome')::bigint
    AS unknown_outcome_count,
  (
    SELECT count(*)::bigint
    FROM legacy_zero AS legacy
    LEFT JOIN public.stripe_payment_adjustment_targets AS target
      ON target.intake_id = legacy.intake_id
    -- Keep missing exact-cash evidence and any reinstated cash blocking.
    WHERE NOT COALESCE(
      target.exact_target_net_value_cents = 0 AND target.target_net_value_cents = 1,
      false
    )
  ) AS irreversible_zero_count,
  count(*) FILTER (
    WHERE claim.state IN ('pending', 'retryable_failed')
      AND claim.updated_at < pg_catalog.clock_timestamp() - interval '72 hours'
  )::bigint AS stale_pending_count,
  count(*) FILTER (
    WHERE claim.state = 'reserved'
      AND claim.lease_expires_at <= pg_catalog.clock_timestamp()
  )::bigint AS expired_reservation_count,
  (
    SELECT count(*)::bigint
    FROM target_evidence AS target
    WHERE target.paid_at < pg_catalog.clock_timestamp() - interval '54 days'
      AND target.target_net_value_cents < target.amount_cents
      AND target.uploaded_at IS NOT NULL
      AND NOT target.legacy_floor_only
      AND NOT target.legacy_post_grace_not_counted
      AND NOT COALESCE(
        target.claim_target = target.target_net_value_cents
        AND target.claim_state IN ('succeeded', 'resolved_not_counted', 'terminal_failed'),
        false
      )
  ) AS expired_conversion_target_count,
  min(claim.updated_at) FILTER (
    WHERE claim.state = 'unknown_outcome'
      OR (claim.state = 'reserved' AND claim.lease_expires_at <= pg_catalog.clock_timestamp())
  ) AS oldest_uncertain_at,
  (
    SELECT count(*)::bigint
    FROM legacy_zero AS legacy
    JOIN public.stripe_payment_adjustment_targets AS target
      ON target.intake_id = legacy.intake_id
    WHERE target.exact_target_net_value_cents = 0 AND target.target_net_value_cents = 1
  ) AS legacy_zero_floor_only_count,
  (
    SELECT count(*)::bigint FROM target_evidence AS target
    WHERE target.legacy_floor_only AND target.claim_state = 'resolved_not_counted'
  ) AS legacy_not_counted_floor_only_count,
  (
    SELECT count(*)::bigint FROM target_evidence AS target
    WHERE target.legacy_post_grace_not_counted
  ) AS legacy_post_grace_not_counted_count
FROM public.google_ads_conversion_adjustment_claims AS claim;

REVOKE ALL ON public.google_ads_conversion_adjustment_claim_health
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.google_ads_conversion_adjustment_claim_health TO service_role;

COMMENT ON VIEW public.google_ads_conversion_adjustment_claim_health IS
  'Actionable adjustment discrepancies with separate historical zero-floor and post-grace non-counting evidence; never changes cash or provider outcomes';
