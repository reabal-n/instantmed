import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
const logger = createLogger("data-intakes")
import type {
  Intake,
  IntakeWithPatient,
  IntakeWithDetails,
  IntakeStatus,
  PatientNote,
} from "@/types/db"
import {
  validateIntakeStatusTransition,
  logTransitionAttempt,
  logTransitionSuccess,
  logTransitionFailure,
  IntakeLifecycleError,
} from "./intake-lifecycle"

// ============================================
// PATIENT-FACING QUERIES
// ============================================

/**
 * Fetch all intakes for a given patient with service info.
 * Returns intakes sorted by created_at descending (newest first).
 * Supports optional pagination for scalability.
 */
export async function getPatientIntakes(
  patientId: string,
  options?: { status?: IntakeStatus; page?: number; pageSize?: number }
): Promise<{ data: IntakeWithPatient[]; total: number; page: number; pageSize: number }> {
  const supabase = createServiceRoleClient()
  const page = options?.page ?? 1
  const pageSize = Math.min(options?.pageSize ?? 20, 100) // Cap at 100
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
    return { data: [], total: 0, page, pageSize }
  }

  // Build data query
  let query = supabase
    .from("intakes")
    .select(`
      *,
      service:services!service_id(id, name, short_name, type, slug)
    `)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (options?.status) {
    query = query.eq("status", options.status)
  }

  const { data, error } = await query

  if (error) {
    logger.error("Error fetching patient intakes", {}, error instanceof Error ? error : new Error(String(error)))
    return { data: [], total: count ?? 0, page, pageSize }
  }

  return {
    data: data as unknown as IntakeWithPatient[],
    total: count ?? 0,
    page,
    pageSize,
  }
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
    logger.error("Error fetching intake stats", {}, error instanceof Error ? error : new Error(String(error)))
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
      service:services!service_id(id, name, short_name, type, slug),
      answers:intake_answers(id, answers, answers_encrypted, encryption_metadata)
    `)
    .eq("id", intakeId)
    .eq("patient_id", patientId)
    .single()

  if (error || !data) {
    logger.error("Error fetching intake", {}, error instanceof Error ? error : new Error(String(error)))
    return null
  }

  return data as unknown as IntakeWithPatient
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
      category,
      subtype,
      is_priority,
      sla_deadline,
      created_at,
      updated_at,
      claimed_by,
      claimed_at,
      patient:profiles!patient_id (id, full_name, email, date_of_birth),
      service:services!service_id (slug, name, short_name, type)
    `)
    .eq("status", status)
    .in("payment_status", ["paid", "pending"])
    .order("is_priority", { ascending: false })
    .order("created_at", { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (error) {
    logger.error("Error fetching intakes by status", {}, error instanceof Error ? error : new Error(String(error)))
    return { data: [], total: count ?? 0, page, pageSize }
  }

  const validData = (data || []).filter((r) => r.patient !== null)
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
 */
export async function getDoctorQueue(
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
      status,
      payment_status,
      category,
      subtype,
      is_priority,
      sla_deadline,
      created_at,
      updated_at,
      flagged_for_followup,
      risk_tier,
      risk_flags,
      risk_score,
      requires_live_consult,
      patient:profiles!patient_id (id, full_name, email, date_of_birth, medicare_number, suburb, state),
      service:services!service_id (slug, name, short_name, type)
    `)
    .in("status", ["paid", "in_review", "pending_info"])
    .order("is_priority", { ascending: false })
    .order("sla_deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (error) {
    logger.error("Error fetching doctor queue", {}, error instanceof Error ? error : new Error(String(error)))
    return { data: [], total: count ?? 0, page, pageSize }
  }

  const validData = (data || []).filter((r) => r.patient !== null)
  return {
    data: validData as unknown as IntakeWithPatient[],
    total: count ?? 0,
    page,
    pageSize,
  }
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
        email,
        phone,
        medicare_number,
        medicare_irn,
        medicare_expiry,
        address_line1,
        suburb,
        state,
        postcode
      ),
      service:services!service_id (slug, name, short_name, type),
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
    logger.error("Error fetching intake details", {}, error instanceof Error ? error : new Error(String(error)))
    return null
  }

  return {
    ...data,
    answers: data.answers?.[0] || null,
  } as unknown as IntakeWithDetails
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
      category,
      subtype,
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
      patient:profiles!patient_id (id, full_name, email, date_of_birth, phone, suburb, state),
      service:services!service_id (slug, name, short_name, type)
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
    logger.error("Error fetching all intakes", {}, error instanceof Error ? error : new Error(String(error)))
    return { data: [], total: count ?? 0, page, pageSize }
  }

  const validData = (data || []).filter((r) => r.patient !== null)
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
 */
export async function getDoctorDashboardStats(): Promise<{
  total: number
  in_queue: number
  approved: number
  declined: number
  pending_info: number
  scripts_pending: number
}> {
  const supabase = createServiceRoleClient()

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
  results.forEach((r, i) => {
    if (r.error) {
      logger.error(`Error fetching dashboard stat ${i}`, {}, r.error instanceof Error ? r.error : new Error(String(r.error)))
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
}

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
      .single(),
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

  // Fetch doctor's reviewed intakes
  const { data, error } = await supabase
    .from("intakes")
    .select("id, status, reviewed_by, paid_at, approved_at, declined_at, created_at")
    .eq("reviewed_by", doctorId)
    .in("status", ["approved", "declined", "completed"])

  if (error || !data) {
    logger.error("Error fetching doctor personal stats", { doctorId }, error instanceof Error ? error : new Error(String(error)))
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
// CREATE / UPDATE OPERATIONS
// ============================================

/**
 * Create a new intake with answers
 */
export async function createIntake(
  patientId: string,
  serviceId: string,
  answers: Record<string, unknown>,
  options?: {
    isPriority?: boolean
    status?: IntakeStatus
  }
): Promise<Intake | null> {
  const supabase = createServiceRoleClient()

  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .insert({
      patient_id: patientId,
      service_id: serviceId,
      status: options?.status || "draft",
      is_priority: options?.isPriority || false,
      payment_status: "unpaid",
    })
    .select()
    .single()

  if (intakeError || !intake) {
    logger.error("Error creating intake", {}, intakeError instanceof Error ? intakeError : new Error(String(intakeError)))
    return null
  }

  // Insert answers
  const { error: answersError } = await supabase
    .from("intake_answers")
    .insert({
      intake_id: intake.id,
      answers,
    })

  if (answersError) {
    logger.error("Error creating intake answers", {}, answersError instanceof Error ? answersError : new Error(String(answersError)))
  }

  return intake as unknown as Intake
}

/**
 * Update intake status with lifecycle validation
 */
export async function updateIntakeStatus(
  intakeId: string,
  status: IntakeStatus,
  reviewedBy?: string
): Promise<Intake | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(intakeId)) {
    logger.error("[updateIntakeStatus] Invalid intakeId format", { intakeId })
    return null
  }

  const supabase = createServiceRoleClient()

  // Fetch current state
  const { data: currentIntake, error: fetchError } = await supabase
    .from("intakes")
    .select("status, payment_status")
    .eq("id", intakeId)
    .single()

  if (fetchError || !currentIntake) {
    logger.error("[updateIntakeStatus] Failed to fetch current state", { intakeId }, fetchError instanceof Error ? fetchError : new Error(String(fetchError)))
    return null
  }

  const currentStatus = currentIntake.status as IntakeStatus
  const paymentStatus = currentIntake.payment_status

  logTransitionAttempt(intakeId, currentStatus, status, paymentStatus, reviewedBy || "unknown", reviewedBy ? "doctor" : "system")

  // Validate transition
  const validation = validateIntakeStatusTransition(currentStatus, status, paymentStatus)

  if (!validation.valid) {
    logTransitionFailure(intakeId, currentStatus, status, validation.error || "Unknown error", reviewedBy || "unknown")
    throw new IntakeLifecycleError(
      validation.error || "Invalid status transition",
      validation.code,
      { currentStatus, attemptedStatus: status, paymentStatus }
    )
  }

  // Perform update
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (reviewedBy) {
    updateData.reviewed_by = reviewedBy
    updateData.reviewed_at = new Date().toISOString()
  }

  // Set decision fields for terminal states
  if (status === "approved" || status === "completed") {
    updateData.decision = "approved"
    updateData.decided_at = new Date().toISOString()
    updateData.approved_at = new Date().toISOString()
  } else if (status === "declined") {
    updateData.decision = "declined"
    updateData.decided_at = new Date().toISOString()
    updateData.declined_at = new Date().toISOString()
  }

  // ATOMIC UPDATE: Only update if status hasn't changed since we fetched it
  // This prevents race conditions where concurrent updates could skip validation
  const { data, error } = await supabase
    .from("intakes")
    .update(updateData)
    .eq("id", intakeId)
    .eq("status", currentStatus) // Optimistic lock - fails if status changed
    .select()
    .single()

  if (error || !data) {
    // Check if this was a race condition (no rows matched)
    if (error?.code === "PGRST116") {
      logger.warn("[updateIntakeStatus] Race condition detected - status changed during update", {
        intakeId,
        expectedStatus: currentStatus,
        attemptedStatus: status,
      })
      throw new IntakeLifecycleError(
        "Status was modified by another process. Please refresh and try again.",
        "CONCURRENT_MODIFICATION",
        { currentStatus, attemptedStatus: status }
      )
    }
    logger.error("[updateIntakeStatus] Database error", { intakeId, status }, error instanceof Error ? error : new Error(String(error)))
    return null
  }

  logTransitionSuccess(intakeId, currentStatus, status, reviewedBy || "system")
  return data as unknown as Intake
}

/**
 * Update script sent status and mark as approved
 * Uses lifecycle validation to ensure valid state transition
 */
export async function updateScriptSent(
  intakeId: string,
  scriptSent: boolean,
  scriptNotes?: string,
  parchmentReference?: string,
  reviewedBy?: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()

  // First, update only the script-related fields
  const { error: scriptError } = await supabase
    .from("intakes")
    .update({
      script_sent: scriptSent,
      script_sent_at: scriptSent ? now : null,
      script_notes: scriptNotes || null,
      parchment_reference: parchmentReference || null,
      updated_at: now,
    })
    .eq("id", intakeId)

  if (scriptError) {
    logger.error("Error updating script sent status", {}, scriptError instanceof Error ? scriptError : new Error(String(scriptError)))
    return false
  }

  // If marking script as sent, use proper lifecycle transition to approved
  if (scriptSent) {
    try {
      const result = await updateIntakeStatus(intakeId, "approved", reviewedBy)
      if (!result) {
        logger.warn("[updateScriptSent] Status update returned null, script fields already saved", { intakeId })
        // Script fields saved, status update may have failed due to already being approved
        return true
      }
    } catch (error) {
      // If already approved/completed, that's fine - script fields are saved
      if (error instanceof IntakeLifecycleError && 
          (error.code === "TERMINAL_STATE" || error.code === "INVALID_TRANSITION")) {
        logger.info("[updateScriptSent] Intake already in terminal state, script fields saved", { intakeId })
        return true
      }
      logger.error("Error transitioning intake to approved", {}, error instanceof Error ? error : new Error(String(error)))
      return false
    }
  }

  return true
}

/**
 * Save doctor notes for an intake
 */
export async function saveDoctorNotes(intakeId: string, notes: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("intakes")
    .update({
      doctor_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)

  if (error) {
    logger.error("Error saving doctor notes", {}, error instanceof Error ? error : new Error(String(error)))
    return false
  }

  return true
}

/**
 * Mark intake as refunded (after manual Stripe refund)
 */
export async function markIntakeRefunded(
  intakeId: string, 
  doctorId: string, 
  reason?: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("intakes")
    .update({
      payment_status: "refunded",
      refunded_at: new Date().toISOString(),
      refunded_by: doctorId,
      refund_reason: reason || "Manual refund processed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)

  if (error) {
    logger.error("Error marking intake as refunded", {}, error instanceof Error ? error : new Error(String(error)))
    return false
  }

  return true
}

/**
 * Flag intake for follow-up
 */
export async function flagForFollowup(intakeId: string, reason: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("intakes")
    .update({
      flagged_for_followup: true,
      followup_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)

  if (error) {
    logger.error("Error flagging for followup", {}, error instanceof Error ? error : new Error(String(error)))
    return false
  }

  return true
}

/**
 * Mark intake as reviewed
 */
export async function markAsReviewed(intakeId: string, doctorId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("intakes")
    .update({
      reviewed_by: doctorId,
      reviewed_at: new Date().toISOString(),
      status: "in_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)

  if (error) {
    logger.error("Error marking as reviewed", {}, error instanceof Error ? error : new Error(String(error)))
    return false
  }

  return true
}

/**
 * Decline an intake with reason
 */
export async function declineIntake(
  intakeId: string,
  doctorId: string,
  reasonCode: string,
  reasonNote?: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("intakes")
    .update({
      status: "declined",
      decision: "declined",
      decline_reason_code: reasonCode,
      decline_reason_note: reasonNote || null,
      decline_reason: reasonNote || reasonCode,
      decided_at: new Date().toISOString(),
      declined_at: new Date().toISOString(),
      reviewed_by: doctorId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)

  if (error) {
    logger.error("Error declining intake", {}, error instanceof Error ? error : new Error(String(error)))
    return false
  }

  return true
}

// ============================================
// PATIENT NOTES (Longitudinal Encounter Notes)
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
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (noteType) {
    query = query.eq("note_type", noteType)
  }

  const { data, error } = await query

  if (error) {
    logger.error("Error fetching patient notes", {}, error instanceof Error ? error : new Error(String(error)))
    return []
  }

  return data as unknown as PatientNote[]
}

/**
 * Create a patient note
 */
export async function createPatientNote(
  patientId: string,
  createdBy: string,
  content: string,
  options?: {
    intakeId?: string
    noteType?: string
    title?: string
    metadata?: Record<string, unknown>
  }
): Promise<PatientNote | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("patient_notes")
    .insert({
      patient_id: patientId,
      intake_id: options?.intakeId || null,
      note_type: options?.noteType || "encounter",
      title: options?.title || null,
      content,
      metadata: options?.metadata || {},
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) {
    logger.error("Error creating patient note", {}, error instanceof Error ? error : new Error(String(error)))
    return null
  }

  return data as unknown as PatientNote
}

/**
 * Update a patient note
 */
export async function updatePatientNote(
  noteId: string,
  content: string,
  title?: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("patient_notes")
    .update({
      content,
      title: title || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)

  if (error) {
    logger.error("Error updating patient note", {}, error instanceof Error ? error : new Error(String(error)))
    return false
  }

  return true
}

// ============================================
// FORMATTING HELPERS
// ============================================

/**
 * Format service type for display
 */
export function formatServiceType(type: string | null | undefined): string {
  if (!type) return "Request"

  const typeMap: Record<string, string> = {
    weight_loss: "Weight Loss",
    mens_health: "Men's Health",
    womens_health: "Women's Health",
    common_scripts: "Prescription",
    med_certs: "Medical Certificate",
    referrals: "Referral",
    pathology: "Pathology",
  }

  return typeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Format intake status for display
 */
export function formatIntakeStatus(status: IntakeStatus | string | null | undefined): string {
  if (!status) return "Unknown"

  const statusMap: Record<string, string> = {
    draft: "Draft",
    pending_payment: "Awaiting Payment",
    paid: "In Queue",
    in_review: "Under Review",
    pending_info: "Needs Info",
    approved: "Approved",
    declined: "Declined",
    escalated: "Escalated",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
    awaiting_script: "Awaiting Script",
  }

  return statusMap[status] || status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Get status color for UI
 */
export function getIntakeStatusColor(status: IntakeStatus | string | null | undefined): string {
  if (!status) return "default"

  const colorMap: Record<string, string> = {
    draft: "default",
    pending_payment: "warning",
    paid: "primary",
    in_review: "primary",
    pending_info: "warning",
    approved: "success",
    declined: "danger",
    escalated: "warning",
    completed: "success",
    cancelled: "default",
    expired: "danger",
    awaiting_script: "warning",
  }

  return colorMap[status] || "default"
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
    logger.error("Error fetching intake documents", {}, error instanceof Error ? error : new Error(String(error)))
    return []
  }

  return data || []
}
