import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import { queueExactGoogleAdsConversionAdjustment } from "@/lib/analytics/google-ads-conversion-adjustments"
import { getStripeLivemode } from "@/lib/config/env"
import {
  type ClaimedStripeRefundAttempt,
  recoverStripeRefundAttempt,
} from "@/lib/stripe/refund-attempt-recovery"
import {
  finalizePersistedStripeRefundAttempts,
  persistStripeRefundApiObservation,
  readExactRefundAdjustmentTarget,
  reconcilePersistedStripeRefundState,
} from "@/lib/stripe/refund-event-persistence"
import { finalizeRefundNotifications } from "@/lib/stripe/refund-notification-finalizer"

const DEFAULT_BATCH_LIMIT = 25
const MAX_BATCH_LIMIT = 100
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RefundRecoveryErrorCode =
  | "adjustment_queue_failed"
  | "adjustment_target_failed"
  | "attempt_finalization_failed"
  | "claim_failed"
  | "invalid_claim"
  | "manual_review_required"
  | "notification_failed"
  | "observation_failed"
  | "reconciliation_failed"
  | "recovery_issue_read_failed"
  | "recovery_failed"

export type StripeRefundRecoverySummary = {
  claimed: number
  errors: Array<{
    attemptId: string | null
    code: RefundRecoveryErrorCode
  }>
  failed: number
  manualReview: number
  processed: number
}

/**
 * Recover durable Stripe refund attempts and finish the same exact downstream
 * effects as a webhook. The runner never creates a fresh refund generation;
 * replay ownership and the safe idempotency window live in
 * recoverStripeRefundAttempt.
 */
export async function runStripeRefundRecovery(
  deps: {
    stripe: Pick<Stripe, "refunds">
    supabase: SupabaseClient
  },
  input: {
    limit?: number
    nowMs?: number
  } = {},
): Promise<StripeRefundRecoverySummary> {
  const limit = normalizedLimit(input.limit)
  const summary: StripeRefundRecoverySummary = {
    claimed: 0,
    errors: [],
    failed: 0,
    manualReview: 0,
    processed: 0,
  }

  let claim: Awaited<ReturnType<SupabaseClient["rpc"]>>
  let livemode: boolean
  try {
    livemode = getStripeLivemode()
    claim = await deps.supabase.rpc("claim_stale_stripe_refund_attempts", {
      p_limit: limit,
      p_livemode: livemode,
    })
  } catch {
    return recordFailure(summary, null, "claim_failed")
  }
  if (claim.error || !Array.isArray(claim.data)) {
    return recordFailure(summary, null, "claim_failed")
  }

  summary.claimed = claim.data.length
  for (const rawAttempt of claim.data) {
    const attempt = parseClaimedAttempt(rawAttempt, livemode)
    if (!attempt) {
      recordFailure(summary, null, "invalid_claim")
      continue
    }

    try {
      const recovery = await recoverStripeRefundAttempt(
        { stripe: deps.stripe, supabase: deps.supabase },
        { attempt, ...(input.nowMs === undefined ? {} : { nowMs: input.nowMs }) },
      )
      if (recovery.error || !recovery.refund) {
        if (recovery.status === "manual_review") {
          summary.manualReview += 1
          summary.errors.push({
            attemptId: attempt.attempt_id,
            code: "manual_review_required",
          })
        } else {
          recordFailure(summary, attempt.attempt_id, "recovery_failed")
        }
        continue
      }

      const persistence = await persistStripeRefundApiObservation({
        intakeId: attempt.intake_id,
        livemode: attempt.livemode,
        refund: recovery.refund,
        supabase: deps.supabase,
      })
      if (persistence.error || persistence.evidence.length === 0) {
        recordFailure(summary, attempt.attempt_id, "observation_failed")
        continue
      }

      const reconciliation = await reconcilePersistedStripeRefundState({
        intakeId: attempt.intake_id,
        livemode: attempt.livemode,
        refunds: [recovery.refund],
        supabase: deps.supabase,
      })
      if (reconciliation.error || !reconciliation.state) {
        recordFailure(summary, attempt.attempt_id, "reconciliation_failed")
        continue
      }

      const notification = await finalizeRefundNotifications({
        evidence: persistence.evidence,
        intakeId: attempt.intake_id,
        livemode: attempt.livemode,
        supabase: deps.supabase,
      })
      if (notification.error) {
        recordFailure(summary, attempt.attempt_id, "notification_failed")
        continue
      }

      const attemptFinalization = await finalizePersistedStripeRefundAttempts({
        evidence: persistence.evidence,
        livemode: attempt.livemode,
        refunds: [recovery.refund],
        supabase: deps.supabase,
      })
      if (attemptFinalization.error) {
        recordFailure(summary, attempt.attempt_id, "attempt_finalization_failed")
        continue
      }

      const target = await readExactRefundAdjustmentTarget({
        state: reconciliation.state,
        supabase: deps.supabase,
      })
      if (target.error) {
        recordFailure(summary, attempt.attempt_id, "adjustment_target_failed")
        continue
      }

      if (target.targetNetValueCents !== null && target.adjustmentDateTime) {
        const queued = await queueExactGoogleAdsConversionAdjustment({
          adjustmentDateTime: target.adjustmentDateTime,
          amountCents: reconciliation.state.amount_cents,
          intakeId: reconciliation.state.id,
          source: "stripe_refund_lifecycle",
          supabase: deps.supabase,
          targetNetValueCents: target.targetNetValueCents,
        })
        if (queued.error) {
          recordFailure(summary, attempt.attempt_id, "adjustment_queue_failed")
          continue
        }
      }

      // A recovered Stripe object is still exact evidence even when the attempt
      // completion receipt raced or failed. The downstream ledger is the
      // durable authority; the next claim can converge the attempt row.
      summary.processed += 1
    } catch {
      recordFailure(summary, attempt.attempt_id, "recovery_failed")
    }
  }

  const issueCount = await readRecoveryIssueCount(deps.supabase, livemode)
  if (issueCount === null) {
    recordFailure(summary, null, "recovery_issue_read_failed")
  } else if (issueCount > 0) {
    // The service-role view is the authoritative outstanding count and already
    // includes attempts quarantined earlier in this run. Use the larger value
    // so a same-run visibility delay cannot under-report without double-counting
    // durable issues that are immediately visible.
    summary.manualReview = Math.max(summary.manualReview, issueCount)
    summary.errors.push({
      attemptId: null,
      code: "manual_review_required",
    })
  }

  return summary
}

async function readRecoveryIssueCount(
  supabase: SupabaseClient,
  livemode: boolean,
): Promise<number | null> {
  try {
    const result = await supabase.rpc("count_stripe_refund_recovery_issues", {
      p_livemode: livemode,
    })
    if (result.error) return null
    const count = Number(result.data)
    return Number.isSafeInteger(count) && count >= 0 ? count : null
  } catch {
    return null
  }
}

function normalizedLimit(limit: number | undefined): number {
  if (!Number.isInteger(limit) || !limit || limit < 1) return DEFAULT_BATCH_LIMIT
  return Math.min(limit, MAX_BATCH_LIMIT)
}

function recordFailure(
  summary: StripeRefundRecoverySummary,
  attemptId: string | null,
  code: RefundRecoveryErrorCode,
): StripeRefundRecoverySummary {
  summary.failed += 1
  summary.errors.push({ attemptId, code })
  return summary
}

function parseClaimedAttempt(
  value: unknown,
  expectedLivemode: boolean,
): ClaimedStripeRefundAttempt | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const state = row.state
  if (
    !isUuid(row.attempt_id) ||
    !isUuid(row.intake_id) ||
    !isUuid(row.lease_token) ||
    typeof row.created_at !== "string" ||
    !Number.isFinite(Date.parse(row.created_at)) ||
    typeof row.idempotency_key !== "string" ||
    row.idempotency_key !== `refund-attempt:${row.attempt_id}` ||
    row.livemode !== expectedLivemode ||
    typeof row.payment_intent_id !== "string" ||
    !row.payment_intent_id.startsWith("pi_") ||
    typeof row.refund_type !== "string" ||
    !Number.isInteger(row.requested_amount_cents) ||
    (row.requested_amount_cents as number) <= 0 ||
    (
      state !== "reserved" &&
      state !== "submitted" &&
      state !== "unknown_outcome" &&
      state !== "succeeded" &&
      state !== "failed" &&
      state !== "canceled"
    ) ||
    (row.stripe_refund_id !== null && typeof row.stripe_refund_id !== "string") ||
    (
      (state === "succeeded" || state === "failed" || state === "canceled") &&
      typeof row.stripe_refund_id !== "string"
    )
  ) {
    return null
  }

  return row as ClaimedStripeRefundAttempt
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}
