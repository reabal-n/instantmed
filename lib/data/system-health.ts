import "server-only"

import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import {
  CRON_OWNED_NON_RECONSTRUCTABLE_EMAIL_TYPES,
  INTENTIONAL_EMAIL_SUPPRESSION_PREFIX,
} from "@/lib/email/quiet-failures"
import { createLogger } from "@/lib/observability/logger"
import { countStripePriceConfigIssues } from "@/lib/stripe/price-config-health"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("system-health")

export interface SystemHealth {
  /**
   * Per-surface counts. `null` means the read FAILED — the count is unknown,
   * which is not the same as zero. The pill renders unknown surfaces as
   * "unknown", never as "clear".
   */
  stuckIntakes: number | null
  webhookFailures: number | null
  parchmentFailures: number | null
  emailFailures: number | null
  stripePriceIssues: number
  /** Total of the KNOWN counts only. */
  totalIssues: number
  /**
   * True when any surface read failed. While degraded, an all-zero total must
   * not be presented as all-clear — the fire alarm may simply be unplugged.
   */
  degraded: boolean
}

export const EMPTY_SYSTEM_HEALTH: SystemHealth = {
  stuckIntakes: 0,
  webhookFailures: 0,
  parchmentFailures: 0,
  emailFailures: 0,
  stripePriceIssues: 0,
  totalIssues: 0,
  degraded: false,
}

/**
 * The whole-read-failed shape: every count unknown, nothing asserted.
 * Fallback for callers whose `getSystemHealth()` call itself threw.
 */
export const UNKNOWN_SYSTEM_HEALTH: SystemHealth = {
  stuckIntakes: null,
  webhookFailures: null,
  parchmentFailures: null,
  emailFailures: null,
  stripePriceIssues: 0,
  totalIssues: 0,
  degraded: true,
}

function asError(reason: unknown, fallbackMessage: string): Error {
  if (reason instanceof Error) return reason
  return new Error(`${fallbackMessage}: ${String(reason)}`)
}

/**
 * One-shot read of the recovery surfaces the SystemHealthPill renders.
 *
 * Phase 2 of dashboard remaster (2026-05-12). Each surface is queried via a
 * lightweight HEAD count. A sub-query that fails yields `null` (unknown) for
 * that surface and marks the result degraded — never a silent 0, which would
 * make the pill assert all-clear exactly when the platform is unobservable.
 * Failures are reported at error level so they reach Sentry in production
 * (the logger forwards only error-level calls that carry an Error).
 *
 * Time window: last 24 hours for the failure tables. The stuck-intakes view
 * owns its age semantics (paid_no_review > 5m, review_timeout > 60m,
 * delivery_pending > 10m) and is read in full.
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const supabase = createServiceRoleClient()
  const now = Date.now()
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()

  const [
    stuckResult,
    webhookResult,
    parchmentResult,
    emailResult,
    quietEmailResult,
    suppressedEmailResult,
  ] = await Promise.allSettled([
    // Stuck intakes via the operational view.
    filterReportableIntakes(
      supabase
        .from("v_stuck_intakes")
        .select("id", { count: "exact", head: true }),
    ),
    // Webhook DLQ rows (Stripe + others) from the last 24h.
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "webhook_failed")
      .gte("created_at", dayAgo)
      .not("metadata->>error_type", "eq", "parchment"),
    // Parchment-specific webhook failures.
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "webhook_failed")
      .gte("created_at", dayAgo)
      .eq("metadata->>error_type", "parchment"),
    // Email outbox failures (last 24h, status=failed).
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", dayAgo),
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", dayAgo)
      .in("email_type", [...CRON_OWNED_NON_RECONSTRUCTABLE_EMAIL_TYPES])
      .like("error_message", "Unsupported email_type:%"),
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", dayAgo)
      .like("error_message", `${INTENTIONAL_EMAIL_SUPPRESSION_PREFIX}%`),
  ])

  function countOf(
    result: PromiseSettledResult<{ count: number | null; error: { message?: string } | null }>,
    label: string,
  ): number | null {
    if (result.status === "rejected") {
      log.error(
        `system-health: ${label} query rejected`,
        { surface: label },
        asError(result.reason, `system-health ${label} query rejected`),
      )
      return null
    }
    if (result.value.error) {
      log.error(
        `system-health: ${label} query errored`,
        { surface: label },
        new Error(`system-health ${label} query errored: ${result.value.error.message ?? "unknown"}`),
      )
      return null
    }
    return result.value.count ?? 0
  }

  const stuckIntakes = countOf(stuckResult, "stuck-intakes")
  const webhookFailures = countOf(webhookResult, "webhook-failures")
  const parchmentFailures = countOf(parchmentResult, "parchment-failures")
  const rawEmailFailures = countOf(emailResult, "email-failures")
  const quietEmailFailures = countOf(quietEmailResult, "quiet-email-failures")
  const suppressedEmailFailures = countOf(suppressedEmailResult, "suppressed-email-failures")
  // If either non-actionable discount read failed, keep that part of the raw
  // count (alarm-safe overcount) and mark the health read degraded below.
  const emailFailures = rawEmailFailures === null
    ? null
    : Math.max(
        rawEmailFailures
          - (quietEmailFailures ?? 0)
          - (suppressedEmailFailures ?? 0),
        0,
      )
  const stripePriceIssues = countStripePriceConfigIssues()

  const knownCounts = [stuckIntakes, webhookFailures, parchmentFailures, emailFailures]
  const degraded = knownCounts.some((count) => count === null)
    || quietEmailFailures === null
    || suppressedEmailFailures === null

  return {
    stuckIntakes,
    webhookFailures,
    parchmentFailures,
    emailFailures,
    stripePriceIssues,
    totalIssues: knownCounts.reduce<number>((sum, count) => sum + (count ?? 0), 0) + stripePriceIssues,
    degraded,
  }
}
