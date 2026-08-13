"use server"

/**
 * Intake Ops Data Access
 * 
 * Server-side queries for operational monitoring of intakes.
 * Used by the admin stuck intakes viewer.
 */

import * as Sentry from "@sentry/nextjs"

import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { buildStuckIntakeWarningPayload } from "@/lib/monitoring/stuck-intake-telemetry"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

// Re-export types from the types file for convenience
export type {
  StuckCounts,
  StuckIntake,
  StuckIntakesFilters,
  StuckIntakesResult,
  StuckReason,
} from "@/lib/data/types/intake-ops"

import type {
  StuckCounts,
  StuckIntake,
  StuckIntakesFilters,
  StuckIntakesResult,
} from "@/lib/data/types/intake-ops"

const logger = createLogger("intake-ops")
const STUCK_INTAKE_PAGE_SIZE = 1000
const STUCK_INTAKE_UNAVAILABLE_ERROR =
  "Stuck-intake status is unavailable. Refresh before treating this queue as clear."

// ============================================================================
// MAIN QUERY: Get stuck intakes
// ============================================================================

/**
 * Get all stuck intakes with counts by reason.
 * Uses the v_stuck_intakes view for efficient querying.
 */
export async function getStuckIntakes(
  filters: StuckIntakesFilters = {}
): Promise<StuckIntakesResult> {
  try {
    const supabase = createServiceRoleClient()
    const stuckIntakes: StuckIntake[] = []

    // PostgREST caps one response at 1,000 rows. Page the canonical view so
    // Operations, its alerts, and System Health's exact count cannot diverge
    // during a large incident. The id tie-breaker makes offset pages stable
    // when multiple rows have the same age.
    for (let from = 0; ; from += STUCK_INTAKE_PAGE_SIZE) {
      let query = filterReportableIntakes(
        supabase
          .from("v_stuck_intakes")
          .select("id, reference_number, status, payment_status, category, subtype, service_name, service_type, is_priority, patient_email, patient_name, created_at, paid_at, reviewed_at, approved_at, stuck_reason, stuck_age_minutes")
          .order("stuck_age_minutes", { ascending: false })
          .order("id", { ascending: true }),
      )

      if (filters.reason) query = query.eq("stuck_reason", filters.reason)
      if (filters.service_type) query = query.eq("service_type", filters.service_type)
      if (filters.status) query = query.eq("status", filters.status)

      const { data, error } = await query.range(
        from,
        from + STUCK_INTAKE_PAGE_SIZE - 1,
      )

      if (error) {
        const queryError = new Error(`Stuck-intake view query failed: ${error.message}`)
        logger.error("[IntakeOps] Failed to fetch stuck intakes", { filters, from }, queryError)

        return {
          data: [],
          counts: { paid_no_review: 0, review_timeout: 0, delivery_pending: 0, delivery_failed: 0, total: 0 },
          error: STUCK_INTAKE_UNAVAILABLE_ERROR,
        }
      }

      const page = (data || []) as StuckIntake[]
      stuckIntakes.push(...page)
      if (page.length < STUCK_INTAKE_PAGE_SIZE) break
    }

    // Calculate counts by reason
    const counts: StuckCounts = {
      paid_no_review: stuckIntakes.filter(i => i.stuck_reason === "paid_no_review").length,
      review_timeout: stuckIntakes.filter(i => i.stuck_reason === "review_timeout").length,
      delivery_pending: stuckIntakes.filter(i => i.stuck_reason === "delivery_pending").length,
      delivery_failed: stuckIntakes.filter(i => i.stuck_reason === "delivery_failed").length,
      total: stuckIntakes.length,
    }

    // Capture Sentry warnings for stuck intakes (deduped)
    await captureStuckIntakeWarnings(
      stuckIntakes,
      !filters.reason && !filters.service_type && !filters.status,
    )

    return {
      data: stuckIntakes,
      counts,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    logger.error("[IntakeOps] Exception fetching stuck intakes", { error: message })
    Sentry.captureException(err, { tags: { action: "get_stuck_intakes" } })
    
    return {
      data: [],
      counts: { paid_no_review: 0, review_timeout: 0, delivery_pending: 0, delivery_failed: 0, total: 0 },
      error: STUCK_INTAKE_UNAVAILABLE_ERROR,
    }
  }
}

// ============================================================================
// SENTRY WARNING CAPTURE
// ============================================================================

const STUCK_WARNING_REMINDER_MS = 60 * 60 * 1000

type WarnedBucketState = {
  count: number
  warnedAt: number
}

// One warning per reason/status/service/subtype bucket. Count changes re-arm
// immediately; an unchanged backlog gets one hourly reminder. This keeps a
// 1,001-row incident observable without emitting 1,001 Sentry events.
const warnedBuckets = new Map<string, WarnedBucketState>()

/**
 * Capture bounded, PHI-free Sentry warnings for stuck-intake buckets.
 */
async function captureStuckIntakeWarnings(
  intakes: StuckIntake[],
  fullSnapshot: boolean,
): Promise<void> {
  // Kill switch
  if (process.env.DISABLE_STUCK_INTAKE_SENTRY === "true") {
    return
  }

  const now = Date.now()
  const buckets = new Map<string, StuckIntake[]>()
  for (const intake of intakes) {
    const bucketKey = [
      intake.stuck_reason,
      intake.status,
      intake.service_type || "unknown",
      intake.subtype || "unknown",
    ].join(":")
    const bucket = buckets.get(bucketKey) ?? []
    bucket.push(intake)
    buckets.set(bucketKey, bucket)
  }

  // A successful read that no longer contains a bucket is its recovery edge.
  // Forget it immediately so a later backlog with the same aggregate shape is
  // treated as a new incident instead of being suppressed for the reminder
  // window. Failed reads never call this function, so unknown state cannot
  // accidentally clear the dedupe memory.
  if (fullSnapshot) {
    for (const warnedBucketKey of warnedBuckets.keys()) {
      if (!buckets.has(warnedBucketKey)) warnedBuckets.delete(warnedBucketKey)
    }
  }

  for (const [bucketKey, bucket] of buckets) {
    const prior = warnedBuckets.get(bucketKey)
    if (
      prior
      && prior.count === bucket.length
      && now - prior.warnedAt < STUCK_WARNING_REMINDER_MS
    ) continue

    warnedBuckets.set(bucketKey, { count: bucket.length, warnedAt: now })
    const representative = bucket[0]
    const maxAgeMinutes = Math.max(...bucket.map((intake) => intake.stuck_age_minutes))
    const priorityCount = bucket.filter((intake) => intake.is_priority).length

    // Capture one warning for the bucket without patient identifiers or
    // contact details. Operations remains the row-level action surface.
    Sentry.captureMessage(
      `Intake stuck: ${representative.stuck_reason}`,
      buildStuckIntakeWarningPayload(representative, {
        count: bucket.length,
        maxAgeMinutes,
        priorityCount,
      }),
    )

    logger.warn("[IntakeOps] Stuck-intake bucket detected", {
      reason: representative.stuck_reason,
      count: bucket.length,
      maxAgeMinutes,
      priorityCount,
      serviceType: representative.service_type,
      status: representative.status,
    })
  }
}

// ============================================================================
// SERVICE TYPE LIST
// ============================================================================

/**
 * Get distinct service types for filter dropdown.
 */
export async function getDistinctServiceTypes(): Promise<string[]> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("services")
      .select("type")
      .eq("is_active", true)
      .order("type")

    if (error || !data) return []

    // Get unique values
    const types = [...new Set(data.map(r => r.type))]
    return types
  } catch {
    return []
  }
}
