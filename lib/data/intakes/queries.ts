import "server-only"

import { unstable_cache } from "next/cache"

import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
const logger = createLogger("data-intakes")
import { decryptProfilePhi } from "@/lib/data/profiles"
import { readAnswers, readDoctorNotes, readPatientNoteContent } from "@/lib/security/phi-field-wrappers"
import type {
  IntakeStatus,
  IntakeWithDetails,
  IntakeWithPatient,
  PatientNote,
} from "@/types/db"
import {
  asIntakeWithDetails,
  asIntakeWithPatient,
  asPatientNote,
} from "@/types/db"

import type { DashboardIntake, DashboardPrescription } from "./types"

// ============================================
// PATIENT-FACING QUERIES
// ============================================

/**
 * Fetch all intakes for a given patient with service info.
 * Returns intakes sorted by created_at descending (newest first).
 * Supports optional pagination for scalability.
 */
export function getPatientIntakes(
  patientId: string,
  options?: { status?: IntakeStatus; page?: number; pageSize?: number }
): Promise<{ data: IntakeWithPatient[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, Math.min(options?.page ?? 1, 1000))
  const pageSize = Math.min(options?.pageSize ?? 20, 100)
  const statusKey = options?.status ?? "all"

  return unstable_cache(
    async () => {
      const supabase = createServiceRoleClient()
      const offset = (page - 1) * pageSize

      // Build base query conditions
      let countQuery = supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", patientId)

      if (options?.status) {
        countQuery = countQuery.eq("status", options.status)
      }

      // Get total count first
      const { count, error: countError } = await countQuery

      if (countError) {
        logger.error("Error fetching patient intake count", {}, countError instanceof Error ? countError : new Error(String(countError)))
        return { data: [] as unknown as IntakeWithPatient[], total: 0, page, pageSize }
      }

      // Build data query with service join for UI display
      let query = supabase
        .from("intakes")
        .select(`id, patient_id, service_id, assigned_admin_id, reference_number, status, previous_status, category, subtype, claimed_by, claimed_at, is_priority, sla_deadline, sla_warning_sent, sla_breached, risk_score, risk_tier, risk_reasons, risk_flags, triage_result, triage_reasons, requires_live_consult, live_consult_reason, payment_id, payment_status, amount_cents, refund_amount_cents, stripe_payment_intent_id, stripe_customer_id, admin_notes, doctor_notes, doctor_notes_enc, decline_reason, escalation_notes, decision, decline_reason_code, decline_reason_note, decided_at, reviewed_by, reviewed_at, flagged_for_followup, followup_reason, script_sent, script_sent_at, script_notes, parchment_reference, priority_review, submitted_at, paid_at, assigned_at, approved_at, declined_at, completed_at, cancelled_at, generated_document_url, generated_document_type, document_sent_at, client_ip, client_user_agent, created_at, updated_at, service:services!service_id(id, name, short_name, type, slug)`)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (options?.status) {
        query = query.eq("status", options.status)
      }

      const { data, error } = await query

      if (error) {
        logger.error("Error fetching patient intakes", {}, toError(error))
        return { data: [] as unknown as IntakeWithPatient[], total: count ?? 0, page, pageSize }
      }

      // Decrypt PHI fields (doctor_notes) before returning
      const unwrapped = await Promise.all(
        (data || []).map(async (row) => {
          const doctorNotes = await readDoctorNotes({
            doctor_notes: row.doctor_notes,
            doctor_notes_enc: (row as Record<string, unknown>).doctor_notes_enc as never,
          })
          return {
            ...row,
            doctor_notes: doctorNotes,
            service: Array.isArray(row.service) ? row.service[0] : row.service,
          }
        })
      )

      return {
        data: unwrapped as unknown as IntakeWithPatient[],
        total: count ?? 0,
        page,
        pageSize,
      }
    },
    [`patient-intakes-${patientId}-${statusKey}-${page}-${pageSize}`],
    { tags: ["patient-intakes", `patient-intakes-${patientId}`], revalidate: 30 }
  )()
}

/**
 * Get intake counts by status for a patient
 */
export async function getPatientIntakeStats(patientId: string): Promise<{
  total: number
  pending: number
  approved: number
  declined: number
  in_review: number
  pending_info: number
  awaiting_payment: number
}> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("intakes")
    .select("status, payment_status")
    .eq("patient_id", patientId)

  if (error || !data) {
    logger.error("Error fetching intake stats", {}, toError(error))
    return { total: 0, pending: 0, approved: 0, declined: 0, in_review: 0, pending_info: 0, awaiting_payment: 0 }
  }

  return {
    total: data.length,
    pending: data.filter((r) => r.status === "paid").length,
    approved: data.filter((r) => r.status === "approved" || r.status === "completed").length,
    declined: data.filter((r) => r.status === "declined").length,
    in_review: data.filter((r) => r.status === "in_review").length,
    pending_info: data.filter((r) => r.status === "pending_info").length,
    awaiting_payment: data.filter((r) => r.payment_status === "pending" || r.status === "pending_payment").length,
  }
}

/**
 * Fetch a single intake for a patient (with ownership check)
 */
export async function getIntakeForPatient(intakeId: string, patientId: string): Promise<IntakeWithPatient | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("intakes")
    .select(`
      *,
      patient:profiles!patient_id(id, full_name, email, date_of_birth, medicare_number, phone, suburb, state),
      answers:intake_answers(id, answers, answers_encrypted, encryption_metadata)
    `)
    .eq("id", intakeId)
    .eq("patient_id", patientId)
    .single()

  if (error || !data) {
    logger.error("Error fetching intake", {}, toError(error))
    return null
  }

  const unwrapped = {
    ...data,
    patient: Array.isArray(data.patient) ? data.patient[0] : data.patient,
  }

  return asIntakeWithPatient(unwrapped as Record<string, unknown>)
}

// ============================================
// DOCTOR/ADMIN QUERIES
// ============================================

/**
 * Fetch all intakes by status (for doctor dashboard).
 * Includes patient profile information.
 * Only show paid intakes to doctors.
 * Supports pagination for scalability.
 */
export async function getAllIntakesByStatus(
  status: IntakeStatus,
  options?: { page?: number; pageSize?: number }
): Promise<{ data: IntakeWithPatient[]; total: number; page: number; pageSize: number }> {
  const supabase = createServiceRoleClient()
  const page = options?.page ?? 1
  const pageSize = Math.min(options?.pageSize ?? 50, 100) // Cap at 100
  const offset = (page - 1) * pageSize

  // Get total count first
  const { count, error: countError } = await supabase
    .from("intakes")
    .select("id", { count: "exact", head: true })
    .eq("status", status)
    .in("payment_status", ["paid", "pending"])

  if (countError) {
    logger.error("Error fetching intake count", {}, countError instanceof Error ? countError : new Error(String(countError)))
    return { data: [], total: 0, page, pageSize }
  }

  // Fetch paginated data with only necessary fields
  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      status,
      payment_status,
      is_priority,
      sla_deadline,
      created_at,
      updated_at,
      claimed_by,
      claimed_at,
      patient:profiles!patient_id (id, full_name, email, date_of_birth)
    `)
    .eq("status", status)
    .in("payment_status", ["paid", "pending"])
    .order("is_priority", { ascending: false })
    .order("created_at", { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (error) {
    logger.error("Error fetching intakes by status", {}, toError(error))
    return { data: [], total: count ?? 0, page, pageSize }
  }

  const unwrapped = (data || []).map(row => ({
    ...row,
    patient: Array.isArray(row.patient) ? row.patient[0] : row.patient,
  }))
  const validData = unwrapped.filter((r) => r.patient !== null)
  return {
    data: validData as unknown as IntakeWithPatient[],
    total: count ?? 0,
    page,
    pageSize,
  }
}

/**
 * Get doctor queue - paid intakes ready for review
 * Supports pagination for scalability at high volume.
 * When doctorId is provided and that doctor has doctor_available=false, returns empty queue
 * so paused doctors do not see new intakes.
 */
export async function getDoctorQueue(
  options?: { page?: number; pageSize?: number; doctorId?: string }
): Promise<{ data: IntakeWithPatient[]; total: number; page: number; pageSize: number }> {
  const supabase = createServiceRoleClient()
  const page = options?.page ?? 1
  const pageSize = Math.min(options?.pageSize ?? 50, 100) // Cap at 100
  const offset = (page - 1) * pageSize

  // If doctor is paused (doctor_available=false), return empty queue
  if (options?.doctorId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("doctor_available")
      .eq("id", options.doctorId)
      .single()
    if (profile?.doctor_available === false) {
      return { data: [], total: 0, page, pageSize }
    }
  }

  // Get total count first
  const { count, error: countError } = await supabase
    .from("intakes")
    .select("id", { count: "exact", head: true })
    .in("status", ["paid", "in_review", "pending_info"])

  if (countError) {
    logger.error("Error fetching queue count", {}, countError instanceof Error ? countError : new Error(String(countError)))
    return { data: [], total: 0, page, pageSize }
  }

  // Fetch paginated data with only necessary fields for queue view
  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      service_id,
      category,
      subtype,
      status,
      payment_status,
      is_priority,
      sla_deadline,
      created_at,
      updated_at,
      flagged_for_followup,
      risk_tier,
      risk_flags,
      risk_score,
      requires_live_consult,
      ai_draft_status,
      ai_approved,
      ai_approved_at,
      patient:profiles!patient_id (id, full_name, email, date_of_birth, medicare_number, phone, address_line1, suburb, state, postcode),
      service:services!service_id (id, name, short_name, type, slug)
    `)
    .in("status", ["paid", "in_review", "pending_info"])
    .order("is_priority", { ascending: false })
    .order("sla_deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (error) {
    logger.error("Error fetching doctor queue", {}, toError(error))
    return { data: [], total: count ?? 0, page, pageSize }
  }

  const unwrapped = (data || []).map(row => ({
    ...row,
    patient: Array.isArray(row.patient) ? row.patient[0] : row.patient,
    service: Array.isArray(row.service) ? row.service[0] : row.service,
  }))
  const validData = unwrapped.filter((r) => r.patient !== null)
  return {
    data: validData as unknown as IntakeWithPatient[],
    total: count ?? 0,
    page,
    pageSize,
  }
}

/**
 * Get auto-approval metrics for admin monitoring.
 * Queries ai_audit_log for today's auto-approval activity.
 */
export async function getAutoApprovalMetrics(): Promise<{
  todayAttempted: number
  todayApproved: number
  todayIneligible: number
  todayFailed: number
  todayRevoked: number
}> {
  const supabase = createServiceRoleClient()
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayStartISO = todayStart.toISOString()

  try {
    const [attemptedResult, approvedResult, revokedResult] = await Promise.all([
      // All auto-approve audit entries today
      supabase
        .from("ai_audit_log")
        .select("id, metadata", { count: "exact", head: false })
        .eq("action", "auto_approve")
        .gte("created_at", todayStartISO),
      // Intakes actually auto-approved today
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("ai_approved", true)
        .gte("ai_approved_at", todayStartISO),
      // Revocations today
      supabase
        .from("ai_audit_log")
        .select("id", { count: "exact", head: true })
        .eq("action", "reject")
        .eq("actor_type", "doctor")
        .gte("created_at", todayStartISO),
    ])

    const todayAttempted = attemptedResult.count ?? 0
    const todayApproved = approvedResult.count ?? 0
    const todayRevoked = revokedResult.count ?? 0

    // Count ineligible: audit entries where metadata.eligible = false
    let todayIneligible = 0
    if (attemptedResult.data) {
      todayIneligible = attemptedResult.data.filter(row => {
        const meta = row.metadata as Record<string, unknown> | null
        return meta?.eligible === false
      }).length
    }

    const todayFailed = todayAttempted - todayApproved - todayIneligible

    return {
      todayAttempted,
      todayApproved,
      todayIneligible,
      todayFailed: Math.max(0, todayFailed),
      todayRevoked,
    }
  } catch (err) {
    logger.error("Error fetching auto-approval metrics", {}, toError(err))
    return {
      todayAttempted: 0,
      todayApproved: 0,
      todayIneligible: 0,
      todayFailed: 0,
      todayRevoked: 0,
    }
  }
}

/**
 * Get AI-approved intakes for doctor batch review.
 * Returns approved intakes where ai_approved=true, ordered by most recent.
 */
export async function getAIApprovedIntakes(
  options?: { limit?: number }
): Promise<IntakeWithPatient[]> {
  const supabase = createServiceRoleClient()
  const limit = options?.limit ?? 20

  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      service_id,
      category,
      subtype,
      status,
      payment_status,
      is_priority,
      sla_deadline,
      created_at,
      updated_at,
      ai_approved,
      ai_approved_at,
      ai_approval_reason,
      patient:profiles!patient_id (id, full_name, email, date_of_birth),
      service:services!service_id (id, name, short_name, type, slug)
    `)
    .eq("ai_approved", true)
    .in("status", ["approved", "completed"])
    .order("ai_approved_at", { ascending: false })
    .limit(limit)

  if (error) {
    logger.error("Error fetching AI-approved intakes", {}, toError(error))
    return []
  }

  // Fetch soft flags from audit log for these intakes
  const intakeIds = (data || []).map(r => r.id)
  const softFlagsMap: Record<string, string[]> = {}
  if (intakeIds.length > 0) {
    const { data: auditRows } = await supabase
      .from("ai_audit_log")
      .select("intake_id, metadata")
      .in("intake_id", intakeIds)
      .eq("action", "auto_approve")
      .not("metadata->softFlags", "is", null)
      .order("created_at", { ascending: false })

    if (auditRows) {
      for (const row of auditRows) {
        const meta = row.metadata as { softFlags?: string[] } | null
        if (meta?.softFlags?.length && !softFlagsMap[row.intake_id]) {
          softFlagsMap[row.intake_id] = meta.softFlags
        }
      }
    }
  }

  const unwrapped = (data || []).map(row => ({
    ...row,
    patient: Array.isArray(row.patient) ? row.patient[0] : row.patient,
    service: Array.isArray(row.service) ? row.service[0] : row.service,
    soft_flags: softFlagsMap[row.id] || null,
  }))
  return unwrapped.filter((r) => r.patient !== null) as unknown as IntakeWithPatient[]
}

/**
 * Get the next intake ID in the queue after the current one.
 * Used for auto-advancing to the next case after approve/decline.
 */
export async function getNextQueueIntakeId(currentIntakeId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()

  // Fetch the next intake in queue order (same ordering as getDoctorQueue)
  const { data, error } = await supabase
    .from("intakes")
    .select("id")
    .in("status", ["paid", "in_review", "pending_info"])
    .neq("id", currentIntakeId)
    .order("is_priority", { ascending: false })
    .order("sla_deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(1)

  if (error || !data || data.length === 0) {
    return null
  }

  return data[0].id
}

/**
 * Fetch a single intake with its answers and documents.
 * Used for the doctor detail view.
 */
export async function getIntakeWithDetails(intakeId: string): Promise<IntakeWithDetails | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("intakes")
    .select(`
      *,
      patient:profiles!patient_id (
        id,
        auth_user_id,
        full_name,
        date_of_birth,
        date_of_birth_encrypted,
        email,
        phone,
        phone_encrypted,
        medicare_number,
        medicare_number_encrypted,
        medicare_irn,
        medicare_expiry,
        address_line1,
        suburb,
        state,
        postcode
      ),
      service:services!service_id (
        id,
        name,
        short_name,
        type,
        slug
      ),
      answers:intake_answers (
        id,
        intake_id,
        answers,
        answers_encrypted,
        encryption_metadata,
        has_allergies,
        allergy_details,
        has_current_medications,
        current_medications,
        has_medical_conditions,
        medical_conditions,
        red_flags,
        yellow_flags,
        created_at,
        updated_at
      )
    `)
    .eq("id", intakeId)
    .single()

  if (error || !data) {
    logger.error("Error fetching intake details", {}, toError(error))
    return null
  }

  // Decrypt PHI fields
  const rawPatient = Array.isArray(data.patient) ? data.patient[0] : data.patient
  const decryptedPatient = rawPatient ? decryptProfilePhi(rawPatient as Record<string, unknown>) : rawPatient
  const doctorNotes = await readDoctorNotes({
    doctor_notes: data.doctor_notes,
    doctor_notes_enc: (data as Record<string, unknown>).doctor_notes_enc as never,
  })
  const rawAnswers = data.answers?.[0] || null
  const decryptedAnswers = rawAnswers
    ? {
        ...rawAnswers,
        answers: await readAnswers({
          answers: rawAnswers.answers as Record<string, unknown> | null,
          answers_enc: rawAnswers.answers_encrypted as never,
        }),
      }
    : null

  return asIntakeWithDetails({
    ...data,
    doctor_notes: doctorNotes,
    patient: decryptedPatient,
    service: Array.isArray(data.service) ? data.service[0] : data.service,
    answers: decryptedAnswers,
  } as Record<string, unknown>)
}

/**
 * Get all intakes for admin dashboard
 * Supports pagination and date range filtering for scalability at high volume.
 */
export async function getAllIntakesForAdmin(
  options?: {
    page?: number
    pageSize?: number
    dateFrom?: string  // ISO date string
    dateTo?: string    // ISO date string
    status?: string[]  // Filter by status
  }
): Promise<{ data: IntakeWithPatient[]; total: number; page: number; pageSize: number }> {
  const supabase = createServiceRoleClient()
  const page = options?.page ?? 1
  const pageSize = Math.min(options?.pageSize ?? 50, 100) // Cap at 100
  const offset = (page - 1) * pageSize

  // Build count query with filters
  let countQuery = supabase
    .from("intakes")
    .select("id", { count: "exact", head: true })

  // Apply date range filter (default: last 30 days for performance)
  const defaultFrom = new Date()
  defaultFrom.setDate(defaultFrom.getDate() - 30)
  const dateFrom = options?.dateFrom || defaultFrom.toISOString()
  countQuery = countQuery.gte("created_at", dateFrom)

  if (options?.dateTo) {
    countQuery = countQuery.lte("created_at", options.dateTo)
  }

  if (options?.status && options.status.length > 0) {
    countQuery = countQuery.in("status", options.status)
  }

  // Get total count first
  const { count, error: countError } = await countQuery

  if (countError) {
    logger.error("Error fetching admin intake count", {}, countError instanceof Error ? countError : new Error(String(countError)))
    return { data: [], total: 0, page, pageSize }
  }

  // Fetch paginated data with only necessary fields
  let dataQuery = supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      service_id,
      status,
      payment_status,
      is_priority,
      sla_deadline,
      reference_number,
      created_at,
      updated_at,
      paid_at,
      approved_at,
      declined_at,
      reviewed_by,
      reviewed_at,
      patient:profiles!patient_id (id, full_name, email, date_of_birth, date_of_birth_encrypted, phone, phone_encrypted, suburb, state),
      service:services!service_id (id, name, short_name, type, slug)
    `)

  // Apply same filters as count query
  dataQuery = dataQuery.gte("created_at", dateFrom)
  if (options?.dateTo) {
    dataQuery = dataQuery.lte("created_at", options.dateTo)
  }
  if (options?.status && options.status.length > 0) {
    dataQuery = dataQuery.in("status", options.status)
  }

  const { data, error } = await dataQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) {
    logger.error("Error fetching all intakes", {}, toError(error))
    return { data: [], total: count ?? 0, page, pageSize }
  }

  // Decrypt patient PHI fields before returning
  const unwrapped = (data || []).map(row => {
    const rawPatient = Array.isArray(row.patient) ? row.patient[0] : row.patient
    const decryptedPatient = rawPatient ? decryptProfilePhi(rawPatient as Record<string, unknown>) : rawPatient
    return {
      ...row,
      patient: decryptedPatient,
      service: Array.isArray(row.service) ? row.service[0] : row.service,
    }
  })
  const validData = unwrapped.filter((r) => r.patient !== null)
  return {
    data: validData as unknown as IntakeWithPatient[],
    total: count ?? 0,
    page,
    pageSize,
  }
}

/**
 * Get dashboard stats for doctor
 * Uses SQL COUNT queries for efficiency at scale
 * Cached for 30s - router.refresh() won't cause repeated DB hits or Suspense skeleton flashes
 */
export const getDoctorDashboardStats = unstable_cache(
  async (): Promise<{
    total: number
    in_queue: number
    approved: number
    declined: number
    pending_info: number
    scripts_pending: number
  }> => {
  const supabase = createServiceRoleClient()

  try {
    // Run all count queries in parallel for efficiency
    const [totalResult, inQueueResult, approvedResult, declinedResult, pendingInfoResult, scriptsPendingResult] = await Promise.all([
    // Total paid intakes
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .not("status", "in", '("draft","cancelled")'),
    // In queue (paid or in_review status)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "in_review"]),
    // Approved or completed
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("status", ["approved", "completed"]),
    // Declined
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("status", "declined"),
    // Pending info
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_info"),
    // Scripts pending (approved but not sent)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("script_sent", false),
  ])

    // Log any errors but don't fail completely
    const results = [totalResult, inQueueResult, approvedResult, declinedResult, pendingInfoResult, scriptsPendingResult]
    const statLabels = ["total", "in_queue", "approved", "declined", "pending_info", "scripts_pending"]
    results.forEach((r, i) => {
      if (r.error) {
        logger.warn("Dashboard stat unavailable", {
          stat: statLabels[i],
          error: r.error.message,
          code: r.error.code,
        })
      }
    })

    return {
      total: totalResult.count ?? 0,
      in_queue: inQueueResult.count ?? 0,
      approved: approvedResult.count ?? 0,
      declined: declinedResult.count ?? 0,
      pending_info: pendingInfoResult.count ?? 0,
      scripts_pending: scriptsPendingResult.count ?? 0,
    }
  } catch (error) {
    logger.error("Error fetching dashboard stats", {}, toError(error))
    return {
      total: 0,
      in_queue: 0,
      approved: 0,
      declined: 0,
      pending_info: 0,
      scripts_pending: 0,
    }
  }
},
  ["doctor-dashboard-stats"],
  { revalidate: 30, tags: ["doctor-stats"] }
)

/**
 * Get live intake monitoring stats for doctor dashboard
 * Includes today's submissions, queue metrics, and review time stats
 * Uses SQL COUNT queries for efficiency at scale
 */
export async function getIntakeMonitoringStats(): Promise<{
  todaySubmissions: number
  queueSize: number
  paidCount: number
  pendingCount: number
  approvedToday: number
  declinedToday: number
  avgReviewTimeMinutes: number | null
  oldestInQueueMinutes: number | null
}> {
  const supabase = createServiceRoleClient()

  // Get start of today in UTC (server time)
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayStartISO = todayStart.toISOString()

  try {
    // Run count queries in parallel
    const [
      todaySubmissionsResult,
      queueSizeResult,
      paidCountResult,
      pendingCountResult,
      approvedTodayResult,
      declinedTodayResult,
      oldestInQueueResult,
      recentCompletedResult,
    ] = await Promise.all([
    // Today's submissions (paid today)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("paid_at", todayStartISO),
    // Queue size
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "in_review", "pending_info"]),
    // Paid count
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .not("status", "in", '("draft","cancelled")'),
    // Pending count
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "pending")
      .not("status", "in", '("draft","cancelled")'),
    // Approved today
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("approved_at", todayStartISO),
    // Declined today
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("declined_at", todayStartISO),
    // Oldest in queue (single row, ordered by paid_at/created_at)
    supabase
      .from("intakes")
      .select("paid_at, created_at")
      .in("status", ["paid", "in_review", "pending_info"])
      .order("paid_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    // Recent completed for avg review time (last 100 to keep query fast)
    supabase
      .from("intakes")
      .select("paid_at, approved_at, declined_at")
      .not("paid_at", "is", null)
      .in("status", ["approved", "declined", "completed"])
      .order("approved_at", { ascending: false, nullsFirst: true })
      .limit(100),
  ])

  // Calculate oldest in queue minutes
  let oldestInQueueMinutes: number | null = null
  if (oldestInQueueResult.data) {
    const oldestTime = new Date(oldestInQueueResult.data.paid_at || oldestInQueueResult.data.created_at).getTime()
    oldestInQueueMinutes = Math.round((Date.now() - oldestTime) / (1000 * 60))
  }

  // Calculate average review time from recent completed intakes
  let avgReviewTimeMinutes: number | null = null
  if (recentCompletedResult.data && recentCompletedResult.data.length > 0) {
    const validIntakes = recentCompletedResult.data.filter(
      (r) => r.paid_at && (r.approved_at || r.declined_at)
    )
    if (validIntakes.length > 0) {
      const totalMinutes = validIntakes.reduce((sum, r) => {
        const startTime = new Date(r.paid_at!).getTime()
        const endTime = new Date(r.approved_at || r.declined_at!).getTime()
        return sum + (endTime - startTime) / (1000 * 60)
      }, 0)
      avgReviewTimeMinutes = Math.round(totalMinutes / validIntakes.length)
    }
  }

    return {
      todaySubmissions: todaySubmissionsResult.count ?? 0,
      queueSize: queueSizeResult.count ?? 0,
      paidCount: paidCountResult.count ?? 0,
      pendingCount: pendingCountResult.count ?? 0,
      approvedToday: approvedTodayResult.count ?? 0,
      declinedToday: declinedTodayResult.count ?? 0,
      avgReviewTimeMinutes,
      oldestInQueueMinutes,
    }
  } catch (error) {
    logger.error("Error fetching monitoring stats", {}, toError(error))
    return {
      todaySubmissions: 0,
      queueSize: 0,
      paidCount: 0,
      pendingCount: 0,
      approvedToday: 0,
      declinedToday: 0,
      avgReviewTimeMinutes: null,
      oldestInQueueMinutes: null,
    }
  }
}

/**
 * Get personal performance stats for a specific doctor
 */
export async function getDoctorPersonalStats(doctorId: string): Promise<{
  reviewedToday: number
  approvedToday: number
  declinedToday: number
  avgReviewTimeMinutes: number | null
  approvalRate: number | null
  reviewedThisWeek: number
  reviewedThisMonth: number
}> {
  const supabase = createServiceRoleClient()

  // Time boundaries
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  // Fetch doctor's reviewed intakes - filter by month at DB level to avoid N+1
  const { data, error } = await supabase
    .from("intakes")
    .select("id, status, reviewed_by, paid_at, approved_at, declined_at, created_at")
    .eq("reviewed_by", doctorId)
    .in("status", ["approved", "declined", "completed"])
    .or(`approved_at.gte.${monthStart.toISOString()},declined_at.gte.${monthStart.toISOString()}`)

  if (error || !data) {
    logger.error("Error fetching doctor personal stats", { doctorId }, toError(error))
    return {
      reviewedToday: 0,
      approvedToday: 0,
      declinedToday: 0,
      avgReviewTimeMinutes: null,
      approvalRate: null,
      reviewedThisWeek: 0,
      reviewedThisMonth: 0,
    }
  }

  // Today's stats
  const todayIntakes = data.filter(r => {
    const decisionTime = r.approved_at || r.declined_at
    return decisionTime && new Date(decisionTime) >= todayStart
  })

  const reviewedToday = todayIntakes.length
  const approvedToday = todayIntakes.filter(r => r.status === "approved" || r.status === "completed").length
  const declinedToday = todayIntakes.filter(r => r.status === "declined").length

  // Week and month stats
  const reviewedThisWeek = data.filter(r => {
    const decisionTime = r.approved_at || r.declined_at
    return decisionTime && new Date(decisionTime) >= weekStart
  }).length

  const reviewedThisMonth = data.filter(r => {
    const decisionTime = r.approved_at || r.declined_at
    return decisionTime && new Date(decisionTime) >= monthStart
  }).length

  // Approval rate (all time for this doctor)
  const totalDecisions = data.length
  const totalApproved = data.filter(r => r.status === "approved" || r.status === "completed").length
  const approvalRate = totalDecisions > 0 ? Math.round((totalApproved / totalDecisions) * 100) : null

  // Average review time (from paid_at to decision)
  const intakesWithTiming = data.filter(r => r.paid_at && (r.approved_at || r.declined_at))
  let avgReviewTimeMinutes: number | null = null

  if (intakesWithTiming.length > 0) {
    const totalMinutes = intakesWithTiming.reduce((sum, r) => {
      const startTime = new Date(r.paid_at!).getTime()
      const endTime = new Date(r.approved_at || r.declined_at!).getTime()
      return sum + (endTime - startTime) / (1000 * 60)
    }, 0)
    avgReviewTimeMinutes = Math.round(totalMinutes / intakesWithTiming.length)
  }

  return {
    reviewedToday,
    approvedToday,
    declinedToday,
    avgReviewTimeMinutes,
    approvalRate,
    reviewedThisWeek,
    reviewedThisMonth,
  }
}

/**
 * Get intakes with SLA breach or approaching deadline
 */
export async function getSlaBreachIntakes(): Promise<{
  breached: number
  approaching: number
  intakeIds: string[]
}> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

  const { data, error } = await supabase
    .from("intakes")
    .select("id, sla_deadline")
    .in("status", ["paid", "in_review", "pending_info"])
    .not("sla_deadline", "is", null)

  if (error || !data) {
    return { breached: 0, approaching: 0, intakeIds: [] }
  }

  const breached = data.filter(r => new Date(r.sla_deadline) < now)
  const approaching = data.filter(r => {
    const deadline = new Date(r.sla_deadline)
    return deadline >= now && deadline <= oneHourFromNow
  })

  return {
    breached: breached.length,
    approaching: approaching.length,
    intakeIds: [...breached.map(r => r.id), ...approaching.map(r => r.id)],
  }
}

// ============================================
// PATIENT NOTES (Read-only queries)
// ============================================

/**
 * Get all notes for a patient
 */
export async function getPatientNotes(
  patientId: string,
  noteType?: string,
  limit: number = 50
): Promise<PatientNote[]> {
  const supabase = createServiceRoleClient()

  let query = supabase
    .from("patient_notes")
    .select("id, patient_id, note_type, content, content_enc, created_by, created_by_name, created_at, updated_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (noteType) {
    query = query.eq("note_type", noteType)
  }

  const { data, error } = await query

  if (error) {
    logger.error("Error fetching patient notes", {}, toError(error))
    return []
  }

  // Decrypt content for each note (prefers encrypted, falls back to plaintext)
  const decrypted = await Promise.all(
    (data ?? []).map(async (note) => ({
      ...note,
      content: await readPatientNoteContent(note),
      content_enc: undefined, // Don't leak encrypted envelope to callers
    }))
  )

  return decrypted.map(row => asPatientNote(row as Record<string, unknown>))
}

// ============================================
// DOCUMENT HELPERS
// ============================================

/**
 * Get documents for an intake
 */
export async function getIntakeDocuments(intakeId: string): Promise<Array<{
  id: string
  document_type: string
  filename: string
  certificate_number: string | null
  created_at: string
}>> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("intake_documents")
    .select("id, document_type, filename, certificate_number, created_at")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: false })

  if (error) {
    logger.error("Error fetching intake documents", {}, toError(error))
    return []
  }

  return data || []
}

// ============================================
// PATIENT DASHBOARD DATA
// ============================================

export const getPatientDashboardData = (patientId: string): Promise<{
  intakes: DashboardIntake[]
  prescriptions: DashboardPrescription[]
  error: string | null
}> => {
  return unstable_cache(
    async () => {
      const supabase = createServiceRoleClient()

      const [intakesResult, prescriptionsResult] = await Promise.all([
        supabase
          .from("intakes")
          .select(`id, status, created_at, updated_at, service_id, service:services!service_id(id, name, short_name, type, slug)`)
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(20),

        supabase
          .from("prescriptions")
          .select("id, medication_name, dosage_instructions, issued_date, expiry_date, status")
          .eq("patient_id", patientId)
          .order("issued_date", { ascending: false })
          .limit(10),
      ])

      if (intakesResult.error) {
        logger.error("Failed to fetch dashboard intakes", {}, toError(intakesResult.error))
      }
      if (prescriptionsResult.error) {
        logger.error("Failed to fetch dashboard prescriptions", {}, toError(prescriptionsResult.error))
      }

      const fetchError = intakesResult.error || prescriptionsResult.error
        ? "Unable to load some data. Please refresh the page or try again later."
        : null

      const intakes = (intakesResult.data || []).map(row => ({
        ...row,
        service: Array.isArray(row.service) ? row.service[0] : row.service,
      })) as DashboardIntake[]

      return {
        intakes,
        prescriptions: (prescriptionsResult.data || []) as DashboardPrescription[],
        error: fetchError,
      }
    },
    [`patient-dashboard-${patientId}`],
    { tags: ["patient-dashboard", `patient-dashboard-${patientId}`], revalidate: 60 }
  )()
}

// ============================================
// DOCTOR DASHBOARD - RECENTLY COMPLETED & EARNINGS
// ============================================

/**
 * Get recently completed intakes (approved/declined today) for the doctor dashboard.
 */
export async function getRecentlyCompletedIntakes(opts: { limit?: number } = {}): Promise<IntakeWithPatient[]> {
  const supabase = createServiceRoleClient()
  const limit = opts.limit || 8
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from("intakes")
    .select(`
      *,
      patient:profiles!patient_id(id, full_name, email, date_of_birth, phone, suburb, state, medicare_number, auth_user_id),
      service:services!service_id(id, slug, name, type, short_name)
    `)
    .in("status", ["approved", "declined", "completed"])
    .gte("reviewed_at", todayStart.toISOString())
    .order("reviewed_at", { ascending: false })
    .limit(limit)

  if (error) {
    logger.error("Failed to fetch recently completed intakes", { error: error.message })
    return []
  }

  return (data || []) as unknown as IntakeWithPatient[]
}

/**
 * Get today's total earnings from approved intakes.
 */
export async function getTodayEarnings(): Promise<number> {
  const supabase = createServiceRoleClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from("intakes")
    .select("amount_cents")
    .in("status", ["approved", "completed"])
    .eq("payment_status", "paid")
    .gte("reviewed_at", todayStart.toISOString())

  if (error) {
    logger.error("Failed to fetch today's earnings", { error: error.message })
    return 0
  }

  return (data || []).reduce((sum, row) => sum + (row.amount_cents || 0), 0)
}
