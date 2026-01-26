"use server"

/**
 * Intake Ops Data Access
 * 
 * Server-side queries for operational monitoring of intakes.
 * Used by the admin stuck intakes viewer.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"

const logger = createLogger("intake-ops")

// ============================================================================
// TYPES
// ============================================================================

export type StuckReason =
  | "paid_no_review"    // Paid but not picked up within 5 min
  | "review_timeout"    // In review/pending_info for >60 min
  | "delivery_pending"  // Approved but no delivery email within 10 min
  | "delivery_failed"   // Approved but delivery email failed

export interface StuckIntake {
  id: string
  reference_number: string
  status: string
  payment_status: string
  category: string | null
  subtype: string | null
  service_name: string | null
  service_type: string | null
  is_priority: boolean
  patient_email: string | null
  patient_name: string | null
  created_at: string
  paid_at: string | null
  reviewed_at: string | null
  approved_at: string | null
  stuck_reason: StuckReason
  stuck_age_minutes: number
}

export interface StuckCounts {
  paid_no_review: number
  review_timeout: number
  delivery_pending: number
  delivery_failed: number
  total: number
}

export interface StuckIntakesResult {
  data: StuckIntake[]
  counts: StuckCounts
  error?: string
}

export interface StuckIntakesFilters {
  reason?: StuckReason
  service_type?: string
  status?: string
}

// ============================================================================
// SLA THRESHOLDS (in minutes)
// ============================================================================

export const SLA_THRESHOLDS = {
  PAID_TO_REVIEW: 5,       // Paid should be reviewed within 5 minutes
  REVIEW_TIMEOUT: 60,      // Review should complete within 60 minutes
  DELIVERY_TIMEOUT: 10,    // Delivery should complete within 10 minutes of approval
} as const

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

    // Query the view
    let query = supabase
      .from("v_stuck_intakes")
      .select("*")
      .order("stuck_age_minutes", { ascending: false })

    // Apply filters
    if (filters.reason) {
      query = query.eq("stuck_reason", filters.reason)
    }
    if (filters.service_type) {
      query = query.eq("service_type", filters.service_type)
    }
    if (filters.status) {
      query = query.eq("status", filters.status)
    }

    const { data, error } = await query

    if (error) {
      logger.error("[IntakeOps] Failed to fetch stuck intakes", {
        error: error.message,
        filters,
      })
      
      // Check if it's because the view doesn't exist yet
      if (error.message.includes("v_stuck_intakes")) {
        return {
          data: [],
          counts: { paid_no_review: 0, review_timeout: 0, delivery_pending: 0, delivery_failed: 0, total: 0 },
          error: "View not yet created. Run migration first.",
        }
      }
      
      return {
        data: [],
        counts: { paid_no_review: 0, review_timeout: 0, delivery_pending: 0, delivery_failed: 0, total: 0 },
        error: error.message,
      }
    }

    const stuckIntakes = (data || []) as StuckIntake[]

    // Calculate counts by reason
    const counts: StuckCounts = {
      paid_no_review: stuckIntakes.filter(i => i.stuck_reason === "paid_no_review").length,
      review_timeout: stuckIntakes.filter(i => i.stuck_reason === "review_timeout").length,
      delivery_pending: stuckIntakes.filter(i => i.stuck_reason === "delivery_pending").length,
      delivery_failed: stuckIntakes.filter(i => i.stuck_reason === "delivery_failed").length,
      total: stuckIntakes.length,
    }

    // Capture Sentry warnings for stuck intakes (deduped)
    await captureStuckIntakeWarnings(stuckIntakes)

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
      error: message,
    }
  }
}

// ============================================================================
// FALLBACK QUERY: Direct query if view doesn't exist
// ============================================================================

/**
 * Fallback query that runs directly against intakes table.
 * Used if the view hasn't been created yet.
 */
export async function getStuckIntakesDirect(
  filters: StuckIntakesFilters = {}
): Promise<StuckIntakesResult> {
  try {
    const supabase = createServiceRoleClient()

    // Get current timestamp for age calculations
    const now = new Date()

    // Build query for potentially stuck intakes
    let query = supabase
      .from("intakes")
      .select(`
        id,
        reference_number,
        status,
        payment_status,
        category,
        subtype,
        is_priority,
        created_at,
        paid_at,
        reviewed_at,
        approved_at,
        patient:profiles!patient_id (
          email,
          full_name
        ),
        service:services!service_id (
          name,
          type
        )
      `)
      .in("status", ["paid", "in_review", "pending_info", "approved"])
      .eq("payment_status", "paid")

    // Apply filters
    if (filters.status) {
      query = query.eq("status", filters.status)
    }

    const { data, error } = await query

    if (error) {
      logger.error("[IntakeOps] Direct query failed", { error: error.message })
      return {
        data: [],
        counts: { paid_no_review: 0, review_timeout: 0, delivery_pending: 0, delivery_failed: 0, total: 0 },
        error: error.message,
      }
    }

    // Process and filter stuck intakes
    const stuckIntakes: StuckIntake[] = []

    for (const intake of data || []) {
      const patientRaw = intake.patient as unknown
      const patientData = (Array.isArray(patientRaw) ? patientRaw[0] : patientRaw) as { email: string | null; full_name: string | null } | null
      const serviceRaw = intake.service as unknown
      const serviceData = (Array.isArray(serviceRaw) ? serviceRaw[0] : serviceRaw) as { name: string | null; type: string | null } | null

      // Calculate ages
      const paidAt = intake.paid_at ? new Date(intake.paid_at) : null
      const reviewedAt = intake.reviewed_at ? new Date(intake.reviewed_at) : null
      const approvedAt = intake.approved_at ? new Date(intake.approved_at) : null

      const minutesSincePaid = paidAt 
        ? (now.getTime() - paidAt.getTime()) / (1000 * 60) 
        : 0
      const minutesInReview = (reviewedAt || paidAt)
        ? (now.getTime() - (reviewedAt || paidAt)!.getTime()) / (1000 * 60)
        : 0
      const minutesSinceApproved = approvedAt
        ? (now.getTime() - approvedAt.getTime()) / (1000 * 60)
        : 0

      let stuckReason: StuckReason | null = null
      let stuckAge = 0

      if (intake.status === "paid" && minutesSincePaid > SLA_THRESHOLDS.PAID_TO_REVIEW) {
        stuckReason = "paid_no_review"
        stuckAge = minutesSincePaid
      } else if (
        (intake.status === "in_review" || intake.status === "pending_info") &&
        minutesInReview > SLA_THRESHOLDS.REVIEW_TIMEOUT
      ) {
        stuckReason = "review_timeout"
        stuckAge = minutesInReview
      } else if (
        intake.status === "approved" &&
        minutesSinceApproved > SLA_THRESHOLDS.DELIVERY_TIMEOUT
      ) {
        // For direct query, we assume delivery pending if approved > 10 min
        // (we can't easily check email_outbox without a join)
        stuckReason = "delivery_pending"
        stuckAge = minutesSinceApproved
      }

      if (stuckReason) {
        // Apply reason filter if specified
        if (filters.reason && stuckReason !== filters.reason) {
          continue
        }
        // Apply service_type filter if specified
        if (filters.service_type && serviceData?.type !== filters.service_type) {
          continue
        }

        stuckIntakes.push({
          id: intake.id,
          reference_number: intake.reference_number,
          status: intake.status,
          payment_status: intake.payment_status,
          category: intake.category,
          subtype: intake.subtype,
          service_name: serviceData?.name || null,
          service_type: serviceData?.type || null,
          is_priority: intake.is_priority,
          patient_email: patientData?.email || null,
          patient_name: patientData?.full_name || null,
          created_at: intake.created_at,
          paid_at: intake.paid_at,
          reviewed_at: intake.reviewed_at,
          approved_at: intake.approved_at,
          stuck_reason: stuckReason,
          stuck_age_minutes: Math.round(stuckAge),
        })
      }
    }

    // Sort by age descending
    stuckIntakes.sort((a, b) => b.stuck_age_minutes - a.stuck_age_minutes)

    // Calculate counts
    const counts: StuckCounts = {
      paid_no_review: stuckIntakes.filter(i => i.stuck_reason === "paid_no_review").length,
      review_timeout: stuckIntakes.filter(i => i.stuck_reason === "review_timeout").length,
      delivery_pending: stuckIntakes.filter(i => i.stuck_reason === "delivery_pending").length,
      delivery_failed: stuckIntakes.filter(i => i.stuck_reason === "delivery_failed").length,
      total: stuckIntakes.length,
    }

    // Capture Sentry warnings
    await captureStuckIntakeWarnings(stuckIntakes)

    return {
      data: stuckIntakes,
      counts,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    logger.error("[IntakeOps] Direct query exception", { error: message })
    return {
      data: [],
      counts: { paid_no_review: 0, review_timeout: 0, delivery_pending: 0, delivery_failed: 0, total: 0 },
      error: message,
    }
  }
}

// ============================================================================
// SENTRY WARNING CAPTURE
// ============================================================================

// Track which intakes we've already warned about to avoid spam
const warnedIntakes = new Set<string>()

/**
 * Capture Sentry warnings for stuck intakes.
 * Dedupes by intake_id + reason to avoid spam.
 */
async function captureStuckIntakeWarnings(intakes: StuckIntake[]): Promise<void> {
  // Kill switch
  if (process.env.DISABLE_STUCK_INTAKE_SENTRY === "true") {
    return
  }

  for (const intake of intakes) {
    const fingerprint = `${intake.id}:${intake.stuck_reason}`
    
    // Skip if we've already warned about this specific stuck state
    if (warnedIntakes.has(fingerprint)) {
      continue
    }

    // Mark as warned
    warnedIntakes.add(fingerprint)

    // Capture to Sentry with deduped fingerprint
    Sentry.captureMessage(`Intake stuck: ${intake.stuck_reason}`, {
      level: "warning",
      tags: {
        intake_id: intake.id,
        stuck_reason: intake.stuck_reason,
        service_type: intake.service_type || "unknown",
        consult_subtype: intake.subtype || "unknown",
        intake_status: intake.status,
      },
      extra: {
        reference_number: intake.reference_number,
        stuck_age_minutes: intake.stuck_age_minutes,
        patient_email: intake.patient_email,
        is_priority: intake.is_priority,
      },
      fingerprint: ["stuck-intake", intake.id, intake.stuck_reason],
    })

    logger.warn("[IntakeOps] Stuck intake detected", {
      intakeId: intake.id,
      reason: intake.stuck_reason,
      ageMinutes: intake.stuck_age_minutes,
      serviceType: intake.service_type,
    })
  }

  // Cleanup old fingerprints periodically (keep last 1000)
  if (warnedIntakes.size > 1000) {
    const toDelete = Array.from(warnedIntakes).slice(0, 500)
    toDelete.forEach(fp => warnedIntakes.delete(fp))
  }
}

// ============================================================================
// STATS QUERY
// ============================================================================

/**
 * Get quick stats for dashboard display.
 */
export async function getStuckIntakeStats(): Promise<StuckCounts> {
  const result = await getStuckIntakes()
  return result.counts
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
