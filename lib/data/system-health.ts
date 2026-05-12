import "server-only"

import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("system-health")

export interface SystemHealth {
  stuckIntakes: number
  webhookFailures: number
  parchmentFailures: number
  emailFailures: number
  totalIssues: number
}

export const EMPTY_SYSTEM_HEALTH: SystemHealth = {
  stuckIntakes: 0,
  webhookFailures: 0,
  parchmentFailures: 0,
  emailFailures: 0,
  totalIssues: 0,
}

/**
 * One-shot read of the four recovery surfaces the SystemHealthPill renders.
 *
 * Phase 2 of dashboard remaster (2026-05-12). Each surface is queried via a
 * lightweight HEAD count. Any sub-query that fails returns 0 so a transient
 * outage on one query doesn't paint the whole pill red.
 *
 * Time window: last 24 hours for the failure tables. The stuck-intakes view
 * has its own age semantics (paid_no_review > 2h, review_timeout > 24h, etc.)
 * and is read in full.
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const supabase = createServiceRoleClient()
  const now = Date.now()
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()

  const [stuckResult, webhookResult, parchmentResult, emailResult] = await Promise.allSettled([
    // Stuck intakes via the operational view.
    filterSeededE2EIntakes(
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
  ])

  function countOf(
    result: PromiseSettledResult<{ count: number | null; error: { message?: string } | null }>,
    label: string,
  ): number {
    if (result.status === "rejected") {
      log.warn(`system-health: ${label} query rejected`, {}, result.reason)
      return 0
    }
    if (result.value.error) {
      log.warn(`system-health: ${label} query errored`, { error: result.value.error.message })
      return 0
    }
    return result.value.count ?? 0
  }

  const stuckIntakes = countOf(stuckResult, "stuck-intakes")
  const webhookFailures = countOf(webhookResult, "webhook-failures")
  const parchmentFailures = countOf(parchmentResult, "parchment-failures")
  const emailFailures = countOf(emailResult, "email-failures")

  return {
    stuckIntakes,
    webhookFailures,
    parchmentFailures,
    emailFailures,
    totalIssues: stuckIntakes + webhookFailures + parchmentFailures + emailFailures,
  }
}
