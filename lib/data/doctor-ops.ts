"use server"

/**
 * Doctor Ops Data Access
 * 
 * Server-side queries for operational metrics per doctor.
 * Uses existing intake_events and intakes tables.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { SLA_THRESHOLDS } from "./intake-ops"

const logger = createLogger("doctor-ops")

// ============================================================================
// TYPES
// ============================================================================

export type DateRange = "7d" | "30d"

export interface DoctorMetrics {
  doctor_id: string
  doctor_name: string
  doctor_email: string | null
  // Current state
  pending_count: number
  in_review_count: number
  // Performance (over date range)
  median_time_to_first_action_minutes: number | null
  median_time_to_decision_minutes: number | null
  total_decisions: number
  approvals: number
  declines: number
  // SLA
  sla_breaches: number
}

export interface DoctorOpsResult {
  data: DoctorMetrics[]
  dateRange: DateRange
  error?: string
}

export type SortField = 
  | "doctor_name"
  | "pending_count"
  | "median_time_to_first_action_minutes"
  | "median_time_to_decision_minutes"
  | "total_decisions"
  | "sla_breaches"

export type SortDirection = "asc" | "desc"

// ============================================================================
// MAIN QUERY
// ============================================================================

/**
 * Get operational metrics for all doctors.
 * 
 * Metrics computed:
 * - pending_count: intakes in paid/in_review where doctor was first actor
 * - median_time_to_first_action: from paid_at to first doctor action
 * - median_time_to_decision: from paid_at to approved/declined
 * - sla_breaches: intakes that exceeded SLA thresholds
 */
export async function getDoctorMetrics(options: {
  dateRange?: DateRange
  sortField?: SortField
  sortDirection?: SortDirection
} = {}): Promise<DoctorOpsResult> {
  const { 
    dateRange = "7d",
    sortField = "pending_count",
    sortDirection = "desc"
  } = options

  try {
    const supabase = createServiceRoleClient()

    // Calculate date range
    const now = new Date()
    const daysBack = dateRange === "7d" ? 7 : 30
    const rangeStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    const rangeStartISO = rangeStart.toISOString()

    // Step 1: Get all doctors (profiles with role = 'doctor' or 'admin')
    const { data: doctors, error: doctorsError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", ["doctor", "admin"])
      .order("full_name")

    if (doctorsError) {
      logger.error("[DoctorOps] Failed to fetch doctors", { error: doctorsError.message })
      return { data: [], dateRange, error: doctorsError.message }
    }

    if (!doctors || doctors.length === 0) {
      return { data: [], dateRange }
    }

    // Step 2: Get intake events for the date range (for time calculations)
    const { data: events, error: eventsError } = await supabase
      .from("intake_events")
      .select(`
        id,
        intake_id,
        actor_id,
        actor_role,
        event_type,
        from_status,
        to_status,
        created_at
      `)
      .gte("created_at", rangeStartISO)
      .in("actor_role", ["doctor", "admin"])
      .order("created_at", { ascending: true })

    if (eventsError) {
      logger.error("[DoctorOps] Failed to fetch events", { error: eventsError.message })
      // Continue without events - will show zeros for time metrics
    }

    // Step 3: Get intakes for pending counts and decision tracking
    const { data: intakes, error: intakesError } = await supabase
      .from("intakes")
      .select(`
        id,
        status,
        payment_status,
        reviewed_by,
        paid_at,
        approved_at,
        declined_at,
        created_at
      `)
      .eq("payment_status", "paid")

    if (intakesError) {
      logger.error("[DoctorOps] Failed to fetch intakes", { error: intakesError.message })
      return { data: [], dateRange, error: intakesError.message }
    }

    // Step 4: Build metrics per doctor
    const metricsMap = new Map<string, DoctorMetrics>()

    // Initialize all doctors
    for (const doctor of doctors) {
      metricsMap.set(doctor.id, {
        doctor_id: doctor.id,
        doctor_name: doctor.full_name || "Unknown",
        doctor_email: doctor.email,
        pending_count: 0,
        in_review_count: 0,
        median_time_to_first_action_minutes: null,
        median_time_to_decision_minutes: null,
        total_decisions: 0,
        approvals: 0,
        declines: 0,
        sla_breaches: 0,
      })
    }

    // Group events by intake to find first actor
    const eventsByIntake = new Map<string, typeof events>()
    for (const event of events || []) {
      const existing = eventsByIntake.get(event.intake_id) || []
      existing.push(event)
      eventsByIntake.set(event.intake_id, existing)
    }

    // Find first actor per intake (the doctor who first touched it)
    const firstActorByIntake = new Map<string, string>()
    for (const [intakeId, intakeEvents] of eventsByIntake) {
      // Events are already sorted by created_at ascending
      const firstDoctorEvent = intakeEvents.find(e => e.actor_id && e.actor_role !== "system")
      if (firstDoctorEvent?.actor_id) {
        firstActorByIntake.set(intakeId, firstDoctorEvent.actor_id)
      }
    }

    // Calculate pending counts
    for (const intake of intakes || []) {
      if (intake.status === "paid" || intake.status === "in_review" || intake.status === "pending_info") {
        // Use reviewed_by if available, otherwise first actor
        const doctorId = intake.reviewed_by || firstActorByIntake.get(intake.id)
        
        if (doctorId && metricsMap.has(doctorId)) {
          const metrics = metricsMap.get(doctorId)!
          if (intake.status === "paid") {
            metrics.pending_count++
          } else {
            metrics.in_review_count++
          }
        }
      }
    }

    // Calculate time metrics and decisions per doctor
    const timeToFirstActionByDoctor = new Map<string, number[]>()
    const timeToDecisionByDoctor = new Map<string, number[]>()

    for (const intake of intakes || []) {
      const paidAt = intake.paid_at ? new Date(intake.paid_at) : null
      if (!paidAt) continue

      // Only consider intakes in the date range
      if (paidAt < rangeStart) continue

      const intakeEvents = eventsByIntake.get(intake.id) || []
      
      // Find first doctor action
      const firstDoctorEvent = intakeEvents.find(e => e.actor_id && e.actor_role !== "system")
      if (firstDoctorEvent?.actor_id) {
        const doctorId = firstDoctorEvent.actor_id
        const eventTime = new Date(firstDoctorEvent.created_at)
        const minutesToFirstAction = (eventTime.getTime() - paidAt.getTime()) / (1000 * 60)
        
        if (!timeToFirstActionByDoctor.has(doctorId)) {
          timeToFirstActionByDoctor.set(doctorId, [])
        }
        timeToFirstActionByDoctor.get(doctorId)!.push(minutesToFirstAction)
      }

      // Track decisions
      const decisionTime = intake.approved_at || intake.declined_at
      if (decisionTime && (intake.status === "approved" || intake.status === "declined" || intake.status === "completed")) {
        const doctorId = intake.reviewed_by || firstActorByIntake.get(intake.id)
        if (doctorId && metricsMap.has(doctorId)) {
          const metrics = metricsMap.get(doctorId)!
          metrics.total_decisions++
          
          if (intake.status === "approved" || intake.status === "completed") {
            metrics.approvals++
          } else if (intake.status === "declined") {
            metrics.declines++
          }

          // Time to decision
          const decisionDate = new Date(decisionTime)
          const minutesToDecision = (decisionDate.getTime() - paidAt.getTime()) / (1000 * 60)
          
          if (!timeToDecisionByDoctor.has(doctorId)) {
            timeToDecisionByDoctor.set(doctorId, [])
          }
          timeToDecisionByDoctor.get(doctorId)!.push(minutesToDecision)
        }
      }

      // Track SLA breaches (using stuck detector logic)
      const now = new Date()
      let isBreach = false

      if (intake.status === "paid") {
        const minutesSincePaid = (now.getTime() - paidAt.getTime()) / (1000 * 60)
        if (minutesSincePaid > SLA_THRESHOLDS.PAID_TO_REVIEW) {
          isBreach = true
        }
      } else if (intake.status === "in_review" || intake.status === "pending_info") {
        const reviewStartTime = intakeEvents.find(e => e.to_status === "in_review")?.created_at
        if (reviewStartTime) {
          const minutesInReview = (now.getTime() - new Date(reviewStartTime).getTime()) / (1000 * 60)
          if (minutesInReview > SLA_THRESHOLDS.REVIEW_TIMEOUT) {
            isBreach = true
          }
        }
      }

      if (isBreach) {
        const doctorId = intake.reviewed_by || firstActorByIntake.get(intake.id)
        if (doctorId && metricsMap.has(doctorId)) {
          metricsMap.get(doctorId)!.sla_breaches++
        }
      }
    }

    // Calculate medians
    for (const [doctorId, times] of timeToFirstActionByDoctor) {
      if (metricsMap.has(doctorId) && times.length > 0) {
        metricsMap.get(doctorId)!.median_time_to_first_action_minutes = median(times)
      }
    }

    for (const [doctorId, times] of timeToDecisionByDoctor) {
      if (metricsMap.has(doctorId) && times.length > 0) {
        metricsMap.get(doctorId)!.median_time_to_decision_minutes = median(times)
      }
    }

    // Convert to array and sort
    let result = Array.from(metricsMap.values())

    // Sort
    result = sortDoctorMetrics(result, sortField, sortDirection)

    return { data: result, dateRange }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    logger.error("[DoctorOps] Exception", { error: message })
    return { data: [], dateRange, error: message }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? Math.round(sorted[mid])
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

function sortDoctorMetrics(
  data: DoctorMetrics[],
  field: SortField,
  direction: SortDirection
): DoctorMetrics[] {
  return [...data].sort((a, b) => {
    let aVal: number | string | null
    let bVal: number | string | null

    switch (field) {
      case "doctor_name":
        aVal = a.doctor_name.toLowerCase()
        bVal = b.doctor_name.toLowerCase()
        break
      case "pending_count":
        aVal = a.pending_count + a.in_review_count
        bVal = b.pending_count + b.in_review_count
        break
      case "median_time_to_first_action_minutes":
        aVal = a.median_time_to_first_action_minutes
        bVal = b.median_time_to_first_action_minutes
        break
      case "median_time_to_decision_minutes":
        aVal = a.median_time_to_decision_minutes
        bVal = b.median_time_to_decision_minutes
        break
      case "total_decisions":
        aVal = a.total_decisions
        bVal = b.total_decisions
        break
      case "sla_breaches":
        aVal = a.sla_breaches
        bVal = b.sla_breaches
        break
      default:
        return 0
    }

    // Handle nulls
    if (aVal === null && bVal === null) return 0
    if (aVal === null) return direction === "asc" ? 1 : -1
    if (bVal === null) return direction === "asc" ? -1 : 1

    // Compare
    if (aVal < bVal) return direction === "asc" ? -1 : 1
    if (aVal > bVal) return direction === "asc" ? 1 : -1
    return 0
  })
}

// ============================================================================
// SINGLE DOCTOR DETAIL (for future use)
// ============================================================================

/**
 * Get detailed metrics for a single doctor.
 */
export async function getDoctorDetail(
  doctorId: string,
  dateRange: DateRange = "7d"
): Promise<DoctorMetrics | null> {
  const result = await getDoctorMetrics({ dateRange })
  return result.data.find(d => d.doctor_id === doctorId) || null
}
