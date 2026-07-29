import "server-only"

import { unstable_cache } from "next/cache"

import {
  BATCH_REVIEW_ELIGIBLE_STATUSES,
  BATCH_REVIEW_ENFORCEMENT_START,
} from "@/lib/clinical/batch-review-policy"
import {
  ADMIN_LEDGER_PATIENT_SEARCH_FIELDS,
  type AdminLedgerQuickFilterValue,
  buildAdminLedgerSearchOr,
  getAdminLedgerServiceCategory,
  getAdminLedgerStatus,
  getAdminLedgerWorkLaneStatuses,
  normalizeAdminLedgerQuickFilters,
  sanitizeAdminLedgerSearchTerm,
} from "@/lib/dashboard/admin-ledger-filters"
import type {
  AdminIntakeStatusFilterValue,
  AdminWorkLaneFilterValue,
} from "@/lib/dashboard/admin-work-lanes"
import {
  type QueueStatusFilter,
  sanitizeQueueSearchQuery,
} from "@/lib/dashboard/routes"
import { readDashboardQuery } from "@/lib/data/dashboard-read-model"
import { decryptProfilePhi } from "@/lib/data/profiles"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import {
  filterSeededE2EIntakes,
  SEEDED_E2E_PATIENT_PROFILE_ID,
} from "@/lib/data/seeded-e2e-data"
import { buildDoctorQueueServiceFilter, type QueueCapabilityService } from "@/lib/doctor/queue-capability-scope"
import {
  getQueueStatusesForFilter,
  QUEUE_REVIEW_STATUSES,
  type QueueStatusCounts,
  resolveQueueStatusCounts,
} from "@/lib/doctor/queue-utils"
import { detectRenewalsForIntakes, type IntakeRenewalProbe } from "@/lib/doctor/renewal-detection"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { startOfDayAEST, startOfDaySydney } from "@/lib/operator/cases/time-grouping"
import { derivePatientPaymentRecoveryReason } from "@/lib/patient/payment-recovery"
import { readAnswers, readDoctorNotes, readPatientNoteContent } from "@/lib/security/phi-field-wrappers"
import type { AdminServiceFilterValue } from "@/lib/services/service-presentation"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type {
  GovernanceReviewReceipt,
  IntakeStatus,
  IntakeWithDetails,
  IntakeWithPatient,
  PatientNote,
  Profile,
  RecentlyCompletedIntake,
} from "@/types/db"
import {
  asIntakeWithDetails,
  asIntakeWithPatient,
  asPatientNote,
} from "@/types/db"

import {
  ADMIN_LEDGER_SELECT,
  projectAdminLedgerPatient,
  projectSupportLedgerPatient,
  SUPPORT_LEDGER_SELECT,
} from "./admin-ledger-projection"
import type {
  DashboardIntake,
  DashboardPrescription,
  PatientIntakeWithPatient,
} from "./types"

const logger = createLogger("data-intakes")
const ADMIN_LEDGER_PATIENT_SEARCH_CANDIDATE_LIMIT = 250
const DOCTOR_QUEUE_PATIENT_SEARCH_CANDIDATE_LIMIT = 250
const DOCTOR_QUEUE_PATIENT_SEARCH_FIELDS = ["full_name", "email"] as const

/**
 * Extract the patient's stated medication name from a decrypted intake_answers
 * row. The intake form persists the field as `medicationName`; some legacy and
 * server-shaped paths also use `medication_name` / `medicationDisplay`. Return
 * the first non-empty string match, or null.
 */
function pickAnswersMedicationName(
  answers: Record<string, unknown> | null | undefined,
): string | null {
  if (!answers || typeof answers !== "object") return null
  const candidates = [
    answers["medicationName"],
    answers["medication_name"],
    answers["medicationDisplay"],
    answers["medication_display"],
  ]
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) return value
  }
  return null
}

type QueueDoctorScopeProfile = Pick<
  Profile,
  | "role"
  | "can_review_med_certs"
  | "can_review_repeat_rx"
  | "can_review_consults"
  | "can_review_ed"
  | "can_review_hair_loss"
> & {
  doctor_available?: boolean | null
}

async function getDoctorQueueScope(
  doctorId: string | undefined,
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<{ paused: boolean; serviceFilter: string | null; degraded: boolean }> {
  if (!doctorId) return { paused: false, serviceFilter: null, degraded: false }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      role,
      doctor_available,
      can_review_med_certs,
      can_review_repeat_rx,
      can_review_consults,
      can_review_ed,
      can_review_hair_loss
    `)
    .eq("id", doctorId)
    .single<QueueDoctorScopeProfile>()

  if (profileError || !profile) {
    logger.warn("Doctor queue scope could not load profile", { doctorId, error: profileError?.message })
    return { paused: false, serviceFilter: "id.is.null", degraded: true }
  }

  if (profile.doctor_available === false) {
    return { paused: true, serviceFilter: null, degraded: false }
  }

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, type")

  if (servicesError || !services) {
    logger.warn("Doctor queue scope could not load services", { doctorId, error: servicesError?.message })
    return { paused: false, serviceFilter: "id.is.null", degraded: true }
  }

  return {
    paused: false,
    serviceFilter: buildDoctorQueueServiceFilter(profile, services as QueueCapabilityService[]),
    degraded: false,
  }
}

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
): Promise<{ data: PatientIntakeWithPatient[]; total: number; page: number; pageSize: number }> {
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
        return { data: [] as PatientIntakeWithPatient[], total: 0, page, pageSize }
      }

      // Build data query with service join for UI display
      let query = supabase
        .from("intakes")
        .select(`id, patient_id, service_id, assigned_admin_id, reference_number, status, previous_status, category, subtype, claimed_by, claimed_at, reviewing_doctor_id, reviewing_doctor_name, review_started_at, is_priority, sla_deadline, sla_warning_sent, sla_breached, risk_score, risk_tier, risk_reasons, risk_flags, triage_result, triage_reasons, requires_live_consult, live_consult_reason, payment_id, payment_status, checkout_error, amount_cents, refund_amount_cents, stripe_payment_intent_id, stripe_customer_id, admin_notes, doctor_notes, doctor_notes_enc, decline_reason, escalation_notes, decision, decline_reason_code, decline_reason_note, decided_at, reviewed_by, reviewed_at, flagged_for_followup, followup_reason, script_sent, script_sent_at, script_notes, parchment_reference, priority_review, submitted_at, paid_at, assigned_at, approved_at, declined_at, completed_at, cancelled_at, generated_document_url, generated_document_type, document_sent_at, client_ip, client_user_agent, created_at, updated_at, service:services!service_id(id, name, short_name, type, slug)`)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (options?.status) {
        query = query.eq("status", options.status)
      }

      const { data, error } = await query

      if (error) {
        logger.error("Error fetching patient intakes", {}, toError(error))
        return { data: [] as PatientIntakeWithPatient[], total: count ?? 0, page, pageSize }
      }

      // Decrypt PHI fields (doctor_notes) before returning
      const unwrapped = await Promise.all(
        (data || []).map(async (row) => {
          const {
            checkout_error: _checkoutError,
            ...patientRow
          } = row as typeof row & { checkout_error?: unknown }
          const doctorNotes = await readDoctorNotes({
            doctor_notes: patientRow.doctor_notes,
            doctor_notes_enc: (patientRow as Record<string, unknown>).doctor_notes_enc as never,
          })
          return {
            ...patientRow,
            doctor_notes: doctorNotes,
            payment_recovery_reason: derivePatientPaymentRecoveryReason(_checkoutError),
            service: Array.isArray(patientRow.service) ? patientRow.service[0] : patientRow.service,
          }
        })
      )

      return {
        data: unwrapped as unknown as PatientIntakeWithPatient[],
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
 * Fetch a single intake for a patient (with ownership check)
 */
export async function getIntakeForPatient(
  intakeId: string,
  patientId: string,
): Promise<PatientIntakeWithPatient | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("intakes")
    .select(`
      *,
      patient:profiles!patient_id(id, full_name, email, date_of_birth, medicare_number, ihi_number, phone, suburb, state),
      answers:intake_answers(id, answers, answers_encrypted, encryption_metadata)
    `)
    .eq("id", intakeId)
    .eq("patient_id", patientId)
    .single()

  if (error || !data) {
    logger.error("Error fetching intake", {}, toError(error))
    return null
  }

  const {
    checkout_error: _checkoutError,
    ...patientData
  } = data as typeof data & { checkout_error?: unknown }
  const unwrapped = {
    ...patientData,
    patient: Array.isArray(data.patient) ? data.patient[0] : data.patient,
  }

  return {
    ...asIntakeWithPatient(unwrapped as Record<string, unknown>),
    payment_recovery_reason: derivePatientPaymentRecoveryReason(_checkoutError),
  }
}

// ============================================
// DOCTOR/ADMIN QUERIES
// ============================================

/**
 * Get doctor queue - paid intakes ready for review
 * Supports pagination for scalability at high volume.
 * When doctorId is provided and that doctor has doctor_available=false, returns empty queue
 * so paused doctors do not see new intakes.
 */
export async function getDoctorQueue(
  options?: {
    page?: number
    pageSize?: number
    doctorId?: string
    allowSeeded?: boolean
    onlySeeded?: boolean
    statusFilter?: QueueStatusFilter
    q?: string | null
  },
): Promise<DoctorQueueResult> {
  const supabase = createServiceRoleClient()
  const page = options?.page ?? 1
  const pageSize = Math.min(options?.pageSize ?? 50, 100) // Cap at 100
  const offset = (page - 1) * pageSize
  const allowSeeded = options?.allowSeeded ?? false
  const onlySeeded = allowSeeded && options?.onlySeeded === true
  const statusFilter = options?.statusFilter ?? "all"
  const activeStatuses = getQueueStatusesForFilter(statusFilter)
  const searchTerm = sanitizeQueueSearchQuery(options?.q)
  const defaultSearchState: DoctorQueueSearchState = searchTerm ? "ready" : "idle"

  const scope = await getDoctorQueueScope(options?.doctorId, supabase)
  if (scope.paused) {
    const emptyCounts = { all: 0, review: 0, pending_info: 0, scripts: 0 }
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      degraded: false,
      statusCounts: emptyCounts,
      globalStatusCounts: emptyCounts,
      searchState: defaultSearchState,
      oldestWaitingEnteredAt: null,
      oldestWaitingIntakeId: null,
    }
  }

  let matchingPatientIds: string[] = []
  if (searchTerm) {
    const profileSearch = DOCTOR_QUEUE_PATIENT_SEARCH_FIELDS
      .map((field) => `${field}.ilike.*${searchTerm}*`)
      .join(",")
    const { data: profiles, error: profileSearchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "patient")
      .or(profileSearch)
      .limit(DOCTOR_QUEUE_PATIENT_SEARCH_CANDIDATE_LIMIT)

    // A capped result is not an authoritative patient-id boundary. Fail
    // closed rather than paginating a silently truncated match set.
    if ((profiles?.length ?? 0) >= DOCTOR_QUEUE_PATIENT_SEARCH_CANDIDATE_LIMIT) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        degraded: false,
        statusCounts: null,
        globalStatusCounts: null,
        searchState: "too_broad",
        oldestWaitingEnteredAt: null,
        oldestWaitingIntakeId: null,
      }
    }

    if (profileSearchError) {
      logger.warn("Doctor queue patient search could not load", {
        error: profileSearchError.message,
      })
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        degraded: true,
        statusCounts: null,
        globalStatusCounts: null,
        searchState: "unavailable",
        oldestWaitingEnteredAt: null,
        oldestWaitingIntakeId: null,
      }
    }

    matchingPatientIds = (profiles ?? []).flatMap((profile) =>
      typeof profile.id === "string" ? [profile.id] : [],
    )
  }

  const searchOr = searchTerm
    ? buildAdminLedgerSearchOr(searchTerm, matchingPatientIds)
    : null

  // Count and page-data are independent; build both and run them together so
  // the hottest staff path doesn't pay COUNT latency before data starts. If the
  // count path fails, still fetch the queue data; a count problem should not
  // blank the staff cockpit.
  const countPromise = readDashboardQuery({
    label: "staff review queue count",
    fallback: { count: 0, degraded: true },
    context: { surface: "staff-dashboard" },
    operation: async () => {
      let query = filterSeededE2EIntakes(supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .in("status", [...activeStatuses])
        .eq("payment_status", "paid"), { allowSeeded })

      if (scope.serviceFilter) {
        query = query.or(scope.serviceFilter)
      }
      if (onlySeeded) {
        query = query.eq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)
      }
      if (searchOr) {
        query = query.or(searchOr)
      }

      const { count, error } = await query

      return { data: error ? null : { count: count ?? 0, degraded: false }, error }
    },
  })

  const buildStatusCountsPromise = (searchPredicate: string | null) => Promise.all(
    (["all", "review", "pending_info", "scripts"] as const).map(async (filter) => {
      let query = filterSeededE2EIntakes(supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .in("status", [...getQueueStatusesForFilter(filter)])
        .eq("payment_status", "paid"), { allowSeeded })

      if (scope.serviceFilter) query = query.or(scope.serviceFilter)
      if (onlySeeded) query = query.eq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)
      if (searchPredicate) query = query.or(searchPredicate)

      const { count, error } = await query
      return { filter, count: count ?? 0, error }
    }),
  ).then(resolveQueueStatusCounts)

  // Header pressure remains an exact, unsearched queue total. Tabs become
  // search-scoped while q is active so their counts describe the same result
  // universe as the paginated rows.
  const globalStatusCountsPromise = buildStatusCountsPromise(null)
  const statusCountsPromise = searchOr
    ? buildStatusCountsPromise(searchOr)
    : globalStatusCountsPromise

  let oldestQuery = filterSeededE2EIntakes(supabase
    .from("intakes")
    .select("id, paid_at, submitted_at, created_at")
    .in("status", QUEUE_REVIEW_STATUSES)
    .eq("payment_status", "paid"), { allowSeeded })

  if (scope.serviceFilter) oldestQuery = oldestQuery.or(scope.serviceFilter)
  if (onlySeeded) oldestQuery = oldestQuery.eq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)

  const oldestPromise = oldestQuery
    .order("paid_at", { ascending: true, nullsFirst: false })
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  // Fetch paginated data with only necessary fields for queue view
  let dataQuery = filterSeededE2EIntakes(supabase
    .from("intakes")
    .select(`
      id,
      reference_number,
      patient_id,
      service_id,
      category,
      subtype,
      status,
      payment_status,
      claimed_by,
      claimed_at,
      reviewing_doctor_id,
      reviewing_doctor_name,
      review_started_at,
      is_priority,
      sla_deadline,
      submitted_at,
      paid_at,
      reviewed_at,
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
      script_sent,
      parchment_reference,
      answers:intake_answers(id, answers, answers_encrypted),
      patient:profiles!patient_id (id, full_name, email, date_of_birth, sex, medicare_number, medicare_irn, medicare_expiry, ihi_number, phone, address_line1, suburb, state, postcode),
      service:services!service_id (id, name, short_name, type, slug)
    `)
    .in("status", [...activeStatuses])
    .eq("payment_status", "paid"), { allowSeeded })

  if (scope.serviceFilter) {
    dataQuery = dataQuery.or(scope.serviceFilter)
  }
  if (onlySeeded) {
    dataQuery = dataQuery.eq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)
  }
  if (searchOr) {
    dataQuery = dataQuery.or(searchOr)
  }

  const dataPromise = dataQuery
    .order("is_priority", { ascending: false })
    .order("sla_deadline", { ascending: true, nullsFirst: false })
    .order("paid_at", { ascending: true, nullsFirst: false })
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .range(offset, offset + pageSize - 1)

  const [countResult, statusCounts, globalStatusCounts, oldestResult, { data, error }] = await Promise.all([
    countPromise,
    statusCountsPromise,
    globalStatusCountsPromise,
    oldestPromise,
    dataPromise,
  ])
  const countFallback = countResult.degraded
  const oldestWaitingEnteredAt = oldestResult.data
    ? oldestResult.data.paid_at ?? oldestResult.data.submitted_at ?? oldestResult.data.created_at
    : null
  const oldestWaitingIntakeId = oldestResult.data?.id ?? null

  if (error) {
    logger.error("Error fetching doctor queue", {}, toError(error))
    return {
      data: [],
      total: countResult.count,
      page,
      pageSize,
      degraded: true,
      statusCounts,
      globalStatusCounts,
      searchState: defaultSearchState,
      oldestWaitingEnteredAt,
      oldestWaitingIntakeId,
    }
  }

  const unwrapped = await Promise.all((data || []).map(async (row) => {
    const rawAnswers = Array.isArray(row.answers) ? row.answers[0] : null
    const answers = rawAnswers
      ? await readAnswers({
          answers: rawAnswers.answers as Record<string, unknown> | null,
          answers_enc: rawAnswers.answers_encrypted as never,
        })
      : null

    return {
      ...row,
      answers: rawAnswers && answers ? [{ id: rawAnswers.id, answers }] : null,
      patient: Array.isArray(row.patient) ? row.patient[0] : row.patient,
      service: Array.isArray(row.service) ? row.service[0] : row.service,
    }
  }))
  const validData = unwrapped.filter((r) => r.patient !== null)

  // Renewal badge: one batched lookup per page against `prescriptions`.
  const renewalProbes: IntakeRenewalProbe[] = validData.map((row) => {
    const firstAnswers = Array.isArray(row.answers) && row.answers[0]
      ? (row.answers[0].answers as Record<string, unknown> | null)
      : null
    const service = row.service as { type?: string } | null | undefined
    return {
      intakeId: row.id,
      patientId: row.patient_id,
      category: row.category,
      serviceType: service?.type ?? null,
      medicationName: pickAnswersMedicationName(firstAnswers),
    }
  })
  const renewalMap = await detectRenewalsForIntakes(renewalProbes)
  const withRenewal = validData.map((row) => {
    const match = renewalMap.get(row.id) ?? null
    return {
      ...row,
      is_renewal: match !== null,
      renewal_match: match,
    }
  })

  return {
    data: withRenewal as unknown as IntakeWithPatient[],
    total: countFallback ? withRenewal.length : countResult.count,
    page,
    pageSize,
    degraded: countFallback || scope.degraded,
    statusCounts,
    globalStatusCounts,
    searchState: defaultSearchState,
    oldestWaitingEnteredAt,
    oldestWaitingIntakeId,
  }
}

export type DoctorQueueSearchState = "idle" | "ready" | "unavailable" | "too_broad"

export interface DoctorQueueResult {
  data: IntakeWithPatient[]
  total: number
  page: number
  pageSize: number
  degraded?: boolean
  statusCounts: QueueStatusCounts | null
  globalStatusCounts: QueueStatusCounts | null
  searchState: DoctorQueueSearchState
  oldestWaitingEnteredAt: string | null
  oldestWaitingIntakeId: string | null
}

export interface PendingBatchReviewResult {
  data: IntakeWithPatient[]
  total: number
  oldestApprovedAt: string | null
  degraded: boolean
}

/**
 * Read the unresolved post-auto-approval medical-certificate review queue.
 * The first row is always the oldest review obligation so the cockpit can
 * drive one certificate at a time.
 */
export async function getPendingBatchReviews(
  options?: { limit?: number }
): Promise<PendingBatchReviewResult> {
  const supabase = createServiceRoleClient()
  const limit = Math.max(1, Math.min(options?.limit ?? 20, 100))

  try {
    const { data, count, error } = await filterSeededE2EIntakes(supabase
      .from("intakes")
      .select(`
        id,
        reference_number,
        patient_id,
        service_id,
        category,
        subtype,
        status,
        payment_status,
        is_priority,
        sla_deadline,
        approved_at,
        created_at,
        updated_at,
        ai_approved,
        ai_approved_at,
        ai_approval_reason,
        batch_reviewed_at,
        batch_reviewed_by,
        patient:profiles!patient_id (id, full_name, email, date_of_birth),
        service:services!service_id (id, name, short_name, type, slug)
      `, { count: "exact" })
      .eq("ai_approved", true)
      .eq("category", "medical_certificate")
      .in("status", [...BATCH_REVIEW_ELIGIBLE_STATUSES])
      .gte("ai_approved_at", BATCH_REVIEW_ENFORCEMENT_START)
      .is("batch_reviewed_at", null))
      .order("ai_approved_at", { ascending: true, nullsFirst: false })
      .limit(limit)

    if (error) {
      logger.warn("Pending batch-review queue could not load", { error: error.message })
      return { data: [], total: 0, oldestApprovedAt: null, degraded: true }
    }

    const unwrapped = (data || []).map((row) => ({
      ...row,
      patient: Array.isArray(row.patient) ? row.patient[0] : row.patient,
      service: Array.isArray(row.service) ? row.service[0] : row.service,
    }))
    const validData = unwrapped.filter((row) => row.patient !== null) as unknown as IntakeWithPatient[]
    // Derive "oldest" from the openable rows, not the raw first row: the banner
    // age and the "review oldest" target must describe the same intake.
    const oldestApprovedAt = typeof validData[0]?.ai_approved_at === "string"
      ? validData[0].ai_approved_at
      : null

    return {
      data: validData,
      total: count ?? validData.length,
      oldestApprovedAt,
      degraded: false,
    }
  } catch (err) {
    logger.warn("Pending batch-review queue failed", { error: toError(err).message })
    return { data: [], total: 0, oldestApprovedAt: null, degraded: true }
  }
}

/**
 * Get the next intake ID in the queue after the current one.
 * Used for auto-advancing to the next case after approve/decline.
 */
export async function getNextQueueIntakeId(currentIntakeId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()

  // Fetch the next intake in queue order (same ordering as getDoctorQueue)
  const { data, error } = await filterSeededE2EIntakes(supabase
    .from("intakes")
    .select("id")
    .in("status", QUEUE_REVIEW_STATUSES)
    .eq("payment_status", "paid")
    .neq("id", currentIntakeId))
    .order("is_priority", { ascending: false })
    .order("sla_deadline", { ascending: true, nullsFirst: false })
    .order("paid_at", { ascending: true, nullsFirst: false })
    .order("submitted_at", { ascending: true, nullsFirst: false })
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
        sex,
        medicare_number,
        medicare_number_encrypted,
        medicare_irn,
        medicare_expiry,
        ihi_number,
        ihi_number_encrypted,
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
  options: {
    viewerRole: "admin" | "support"
    page?: number
    pageSize?: number
    dateFrom?: string  // ISO date string
    dateTo?: string    // ISO date string
    q?: string
    service?: AdminServiceFilterValue
    status?: AdminIntakeStatusFilterValue
    workLane?: AdminWorkLaneFilterValue
    chips?: readonly AdminLedgerQuickFilterValue[]
  }
): Promise<{
  data: IntakeWithPatient[]
  total: number | null
  page: number
  pageSize: number
  degraded: boolean
  patientSearchUnavailable: boolean
  patientSearchSaturated: boolean
}> {
  const supabase = createServiceRoleClient()
  const page = Math.max(1, options.page ?? 1)
  const pageSize = Math.min(Math.max(options.pageSize ?? 50, 10), 100)
  const offset = (page - 1) * pageSize
  const searchTerm = sanitizeAdminLedgerSearchTerm(options.q)
  const status = getAdminLedgerStatus(options.status)
  const workLaneStatuses = getAdminLedgerWorkLaneStatuses(options.workLane)
  const serviceCategory = getAdminLedgerServiceCategory(options.service)
  const chips = normalizeAdminLedgerQuickFilters(options.chips ?? [])
  let patientSearchUnavailable = false

  // Patient contact/name search is admin-only and resolved to profile ids before
  // the intake query. Support searches only request references/ids; no contact
  // fields are selected or queried on its behalf.
  let matchingPatientIds: string[] = []
  if (searchTerm && options.viewerRole === "admin") {
    const profileSearch = ADMIN_LEDGER_PATIENT_SEARCH_FIELDS
      .map((field) => `${field}.ilike.*${searchTerm}*`)
      .join(",")
    const { data: profiles, error: profileSearchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "patient")
      .or(profileSearch)
      .limit(ADMIN_LEDGER_PATIENT_SEARCH_CANDIDATE_LIMIT)

    // Hitting the query cap means more matching profiles may exist. Saturation
    // wins even if Supabase also reports an error: either signal makes the
    // candidate set unsafe to use as an authoritative patient-id boundary.
    if ((profiles?.length ?? 0) >= ADMIN_LEDGER_PATIENT_SEARCH_CANDIDATE_LIMIT) {
      return {
        data: [],
        total: null,
        page,
        pageSize,
        degraded: false,
        patientSearchUnavailable: false,
        patientSearchSaturated: true,
      }
    } else if (profileSearchError) {
      patientSearchUnavailable = true
      logger.warn("Admin ledger patient search could not load", {
        error: profileSearchError.message,
      })
    } else {
      matchingPatientIds = (profiles ?? []).flatMap((profile) =>
        typeof profile.id === "string" ? [profile.id] : [],
      )
    }
  }
  const searchOr = searchTerm
    ? buildAdminLedgerSearchOr(searchTerm, matchingPatientIds)
    : null

  // Build count query with filters
  let countQuery = supabase
    .from("intakes")
    .select("id", { count: "exact", head: true })

  // Default browsing stays bounded to 30 days. An explicit search spans the
  // ledger so an older request/reference is still recoverable.
  const defaultFrom = new Date()
  defaultFrom.setDate(defaultFrom.getDate() - 30)
  const dateFrom = options.dateFrom || (searchTerm ? null : defaultFrom.toISOString())
  if (dateFrom) countQuery = countQuery.gte("created_at", dateFrom)

  if (options.dateTo) {
    countQuery = countQuery.lte("created_at", options.dateTo)
  }
  if (status) countQuery = countQuery.eq("status", status)
  if (workLaneStatuses) countQuery = countQuery.in("status", [...workLaneStatuses])
  if (serviceCategory) countQuery = countQuery.eq("category", serviceCategory)
  if (searchOr) countQuery = countQuery.or(searchOr)
  if (chips.includes("priority")) countQuery = countQuery.eq("is_priority", true)
  if (chips.includes("awaiting_script")) countQuery = countQuery.eq("status", "awaiting_script")
  if (chips.includes("failed_payment")) {
    countQuery = countQuery.or("status.eq.checkout_failed,payment_status.eq.failed")
  }
  if (chips.includes("refunded")) {
    countQuery = countQuery.in("payment_status", ["refunded", "partially_refunded"])
  }
  if (chips.includes("refund_failed")) countQuery = countQuery.eq("refund_status", "failed")

  // Fetch paginated data with only necessary fields
  const ledgerSelect: string = options.viewerRole === "support"
    ? SUPPORT_LEDGER_SELECT
    : ADMIN_LEDGER_SELECT
  let dataQuery = supabase
    .from("intakes")
    .select(ledgerSelect)

  // Apply same filters as count query
  if (dateFrom) dataQuery = dataQuery.gte("created_at", dateFrom)
  if (options.dateTo) {
    dataQuery = dataQuery.lte("created_at", options.dateTo)
  }
  if (status) dataQuery = dataQuery.eq("status", status)
  if (workLaneStatuses) dataQuery = dataQuery.in("status", [...workLaneStatuses])
  if (serviceCategory) dataQuery = dataQuery.eq("category", serviceCategory)
  if (searchOr) dataQuery = dataQuery.or(searchOr)
  if (chips.includes("priority")) dataQuery = dataQuery.eq("is_priority", true)
  if (chips.includes("awaiting_script")) dataQuery = dataQuery.eq("status", "awaiting_script")
  if (chips.includes("failed_payment")) {
    dataQuery = dataQuery.or("status.eq.checkout_failed,payment_status.eq.failed")
  }
  if (chips.includes("refunded")) {
    dataQuery = dataQuery.in("payment_status", ["refunded", "partially_refunded"])
  }
  if (chips.includes("refund_failed")) dataQuery = dataQuery.eq("refund_status", "failed")

  // Count and page-data share filters but are independent; run them together.
  const [{ count, error: countError }, { data, error }] = await Promise.all([
    countQuery,
    dataQuery.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1),
  ])

  if (countError) {
    logger.error("Error fetching admin intake count", {}, countError instanceof Error ? countError : new Error(String(countError)))
  }
  if (error) {
    logger.error("Error fetching all intakes", {}, toError(error))
    return {
      data: [],
      total: countError ? null : count ?? 0,
      page,
      pageSize,
      degraded: true,
      patientSearchUnavailable,
      patientSearchSaturated: false,
    }
  }

  // Support rows never select contact/clinical payloads in the first place.
  // Admin rows decrypt the phone and answers only for search/renewal detection;
  // neither raw answers nor encrypted fields are returned to the client.
  const ledgerRows = (data ?? []) as unknown as Array<Record<string, unknown> & {
    answers?: unknown
    category: string | null
    id: string
    patient_id: string
    patient?: unknown
    service?: unknown
  }>
  const unwrapped = await Promise.all(ledgerRows.map(async (row) => {
    const rawPatient = Array.isArray(row.patient) ? row.patient[0] : row.patient
    if (options.viewerRole === "support") {
      return {
        ...row,
        answers: null,
        risk_flags: null,
        patient: projectSupportLedgerPatient(rawPatient as Record<string, unknown> | null),
        service: Array.isArray(row.service) ? row.service[0] : row.service,
      }
    }

    const decryptedPatient = rawPatient ? decryptProfilePhi(rawPatient as Record<string, unknown>) : rawPatient
    const rawAnswers = Array.isArray(row.answers) ? row.answers[0] : null
    const answers = rawAnswers
      ? await readAnswers({
          answers: rawAnswers.answers as Record<string, unknown> | null,
          answers_enc: rawAnswers.answers_encrypted as never,
        })
      : null
    const service = Array.isArray(row.service) ? row.service[0] : row.service
    const patientForClient = projectAdminLedgerPatient(decryptedPatient)

    return {
      // Carry medicationName + service.type only long enough to feed the
      // renewal probe below; the ledger payload itself returns answers: null.
      __medicationName: pickAnswersMedicationName(answers),
      ...row,
      answers: null,
      patient: patientForClient,
      service,
    }
  }))
  const validData = unwrapped.filter((r) => r.patient !== null)

  if (options.viewerRole === "support") {
    return {
      data: validData as unknown as IntakeWithPatient[],
      total: countError ? null : count ?? 0,
      page,
      pageSize,
      degraded: Boolean(countError) || patientSearchUnavailable,
      patientSearchUnavailable,
      patientSearchSaturated: false,
    }
  }

  // Renewal badge: one batched lookup per page against `prescriptions`.
  const renewalProbes: IntakeRenewalProbe[] = validData.map((row) => {
    const service = row.service as { type?: string } | null | undefined
    return {
      intakeId: row.id,
      patientId: row.patient_id,
      category: row.category,
      serviceType: service?.type ?? null,
      medicationName: (row as { __medicationName?: string | null }).__medicationName ?? null,
    }
  })
  const renewalMap = await detectRenewalsForIntakes(renewalProbes)
  const withRenewal = validData.map((row) => {
    const { __medicationName: _scratch, ...rest } = row as typeof row & {
      __medicationName?: string | null
    }
    void _scratch
    const match = renewalMap.get(row.id) ?? null
    return {
      ...rest,
      is_renewal: match !== null,
      renewal_match: match,
    }
  })

  return {
    data: withRenewal as unknown as IntakeWithPatient[],
    total: countError ? null : count ?? 0,
    page,
    pageSize,
    degraded: Boolean(countError) || patientSearchUnavailable,
    patientSearchUnavailable,
    patientSearchSaturated: false,
  }
}

/**
 * Get live intake monitoring stats for the staff cockpit and compact analytics.
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

  // Start of today in AEST, not UTC or server-local time — this is an
  // AU-only platform and staff read "today" on the AEST wall clock.
  // See lib/operator/cases/time-grouping.ts for why the naive UTC/local
  // boundary is wrong (it silently drops anything approved before 10am AEST).
  const todayStartISO = startOfDayAEST(new Date()).toISOString()

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
      filterReportableIntakes(supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .gte("paid_at", todayStartISO)),
      // Queue size
      filterReportableIntakes(supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .in("status", QUEUE_REVIEW_STATUSES)
        .eq("payment_status", "paid")),
      // Paid count
      filterReportableIntakes(supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "paid")
        .not("status", "in", '("draft","cancelled")')),
      // Pending count
      filterReportableIntakes(supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "pending")
        .not("status", "in", '("draft","cancelled")')),
      // Approved today
      filterReportableIntakes(supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .gte("approved_at", todayStartISO)),
      // Declined today
      filterReportableIntakes(supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .gte("declined_at", todayStartISO)),
      // Oldest in queue (single row, ordered by paid_at/created_at)
      filterReportableIntakes(supabase
        .from("intakes")
        .select("paid_at, submitted_at, created_at")
        .in("status", QUEUE_REVIEW_STATUSES)
        .eq("payment_status", "paid"))
        .order("paid_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      // Recent completed for avg review time (last 100 to keep query fast)
      filterReportableIntakes(supabase
        .from("intakes")
        .select("paid_at, approved_at, declined_at")
        .not("paid_at", "is", null)
        .in("status", ["approved", "declined", "completed"]))
        .order("approved_at", { ascending: false, nullsFirst: true })
        .limit(100),
    ])

  // Calculate oldest in queue minutes
  let oldestInQueueMinutes: number | null = null
  if (oldestInQueueResult.data) {
    const oldestTime = new Date(
      oldestInQueueResult.data.paid_at ||
      oldestInQueueResult.data.submitted_at ||
      oldestInQueueResult.data.created_at
    ).getTime()
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

/**
 * Count every note attached to a patient without loading or decrypting note content.
 */
export async function getPatientNoteCount(patientId: string): Promise<number> {
  const supabase = createServiceRoleClient()
  const { count, error } = await supabase
    .from("patient_notes")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)

  if (error) {
    logger.error("Error counting patient notes", {}, toError(error))
    return 0
  }

  return count ?? 0
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

      const [intakesResult, prescriptionsResult, certificatesResult] = await Promise.all([
        supabase
          .from("intakes")
          .select(`id, status, checkout_error, created_at, updated_at, service_id, service:services!service_id(id, name, short_name, type, slug)`)
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(20),

        supabase
          .from("prescriptions")
          .select("id, medication_name, dosage_instructions, issued_date, expiry_date, status")
          .eq("patient_id", patientId)
          .order("issued_date", { ascending: false })
          .limit(10),

        supabase
          .from("issued_certificates")
          .select("intake_id")
          .eq("patient_id", patientId)
          .eq("status", "valid")
          .order("created_at", { ascending: false })
          .limit(50),
      ])

      if (intakesResult.error) {
        logger.error("Failed to fetch dashboard intakes", {}, toError(intakesResult.error))
      }
      if (prescriptionsResult.error) {
        logger.error("Failed to fetch dashboard prescriptions", {}, toError(prescriptionsResult.error))
      }
      if (certificatesResult.error) {
        logger.error("Failed to fetch dashboard certificate readiness", {}, toError(certificatesResult.error))
      }

      const fetchError = intakesResult.error || prescriptionsResult.error || certificatesResult.error
        ? "Unable to load some data. Please refresh the page or try again later."
        : null

      const readyCertificateIntakeIds = new Set(
        (certificatesResult.data || []).map((certificate) => certificate.intake_id),
      )

      const intakes = (intakesResult.data || []).map(row => ({
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        service_id: row.service_id,
        document_ready: readyCertificateIntakeIds.has(row.id),
        payment_recovery_reason: derivePatientPaymentRecoveryReason(row.checkout_error),
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
// STAFF COCKPIT - RECENTLY COMPLETED & EARNINGS
// ============================================

export interface FormToInboxStats {
  medianMinutes: number
  sampleSize: number
  windowDays: number
}

type CertificateTimingRow = {
  intake_id: string | null
  email_sent_at: string | null
}

type FormToInboxIntakeRow = {
  id: string
  category: string | null
  paid_at: string | null
  submitted_at: string | null
  created_at: string | null
  service: { type: string | null } | { type: string | null }[] | null
}

const DEFAULT_FORM_TO_INBOX_WINDOW_DAYS = 7
const DEFAULT_FORM_TO_INBOX_MIN_SAMPLE_SIZE = 3

/**
 * Real-only staff KPI: med-cert form/payment completion to patient inbox.
 * Hidden by callers when the recent sample is too small. This keeps the
 * dashboard honest and avoids turning the public speed promise into a stale
 * hard-coded operator metric.
 */
export async function getFormToInboxStats(opts: {
  windowDays?: number
  minSampleSize?: number
  limit?: number
} = {}): Promise<FormToInboxStats | null> {
  const supabase = createServiceRoleClient()
  const windowDays = opts.windowDays ?? DEFAULT_FORM_TO_INBOX_WINDOW_DAYS
  const minSampleSize = opts.minSampleSize ?? DEFAULT_FORM_TO_INBOX_MIN_SAMPLE_SIZE
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: certRows, error: certError } = await supabase
    .from("issued_certificates")
    .select("intake_id, email_sent_at")
    .eq("status", "valid")
    .not("email_sent_at", "is", null)
    .gte("email_sent_at", since)
    .order("email_sent_at", { ascending: false })
    .limit(opts.limit ?? 100)

  if (certError) {
    logger.warn("Failed to fetch form-to-inbox certificate timings", { error: certError.message })
    return null
  }

  const certificateRows = (certRows ?? []) as CertificateTimingRow[]
  const intakeIds = Array.from(new Set(certificateRows.flatMap((row) => row.intake_id ? [row.intake_id] : [])))
  if (intakeIds.length === 0) return null

  const { data: intakeRows, error: intakeError } = await supabase
    .from("intakes")
    .select("id, category, paid_at, submitted_at, created_at, service:services!service_id(type)")
    .in("id", intakeIds)

  if (intakeError) {
    logger.warn("Failed to fetch form-to-inbox intake timings", { error: intakeError.message })
    return null
  }

  const intakeById = new Map(
    ((intakeRows ?? []) as FormToInboxIntakeRow[]).map((row) => [row.id, row]),
  )

  const durations = certificateRows.flatMap((certificate) => {
    if (!certificate.intake_id || !certificate.email_sent_at) return []
    const intake = intakeById.get(certificate.intake_id)
    if (!intake) return []
    const service = Array.isArray(intake.service) ? intake.service[0] : intake.service
    const isMedCert = intake.category === "medical_certificate" || service?.type === "med_certs"
    if (!isMedCert) return []

    const startValue = intake.paid_at ?? intake.submitted_at ?? intake.created_at
    if (!startValue) return []
    const start = new Date(startValue).getTime()
    const end = new Date(certificate.email_sent_at).getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return []

    return [Math.round((end - start) / 60000)]
  }).sort((a, b) => a - b)

  if (durations.length < minSampleSize) return null

  const middle = Math.floor(durations.length / 2)
  const medianMinutes = durations.length % 2 === 1
    ? durations[middle]!
    : Math.round((durations[middle - 1]! + durations[middle]!) / 2)

  return {
    medianMinutes,
    sampleSize: durations.length,
    windowDays,
  }
}

/**
 * Get the signed-in clinician's decisions plus an identity-free aggregate of
 * post-issuance governance work for the unified staff cockpit. Cohort
 * governance must never be serialized as a per-patient clinician decision.
 */
export async function getRecentlyCompletedIntakes(opts: {
  limit?: number
  reviewerId: string
}): Promise<{
  data: RecentlyCompletedIntake[]
  governanceReceipt: GovernanceReviewReceipt | null
  degraded: boolean
  truncated: boolean
}> {
  const supabase = createServiceRoleClient()
  const limit = opts.limit || 8
  const queryLimit = limit + 1
  // The actor's Sydney calendar day, including AEST/AEDT transitions.
  const todayStartISO = startOfDaySydney(new Date()).toISOString()

  try {
    const ordinaryQuery = supabase
      .from("intakes")
      .select(`
        id,
        patient_id,
        status,
        reviewed_at,
        patient:profiles!patient_id(full_name),
        service:services!service_id(name, type, short_name)
      `)
      .in("status", ["approved", "declined", "completed"])
      .gte("reviewed_at", todayStartISO)
      .eq("reviewed_by", opts.reviewerId)
      // Legacy manual decisions may have NULL here. Only explicit TRUE marks
      // protocol issuance, which belongs in the governance stream below.
      .or("ai_approved.is.false,ai_approved.is.null")
      .order("reviewed_at", { ascending: false })
      .limit(queryLimit)

    const governanceQuery = supabase
      .from("intakes")
      .select("batch_reviewed_at", { count: "exact" })
      .eq("ai_approved", true)
      .eq("category", "medical_certificate")
      .eq("batch_reviewed_by", opts.reviewerId)
      .gte("batch_reviewed_at", todayStartISO)
      .order("batch_reviewed_at", { ascending: false })
      .limit(1)

    const [ordinaryResult, governanceResult] = await Promise.all([
      ordinaryQuery,
      governanceQuery,
    ])

    if (
      ordinaryResult.error ||
      governanceResult.error ||
      typeof governanceResult.count !== "number"
    ) {
      logger.error("Failed to fetch actor-scoped review history", {
        ordinaryError: ordinaryResult.error?.message ?? null,
        governanceError: governanceResult.error?.message ?? null,
      })
      // A partial stream is not a truthful review history.
      return { data: [], governanceReceipt: null, degraded: true, truncated: false }
    }

    type RelatedPatient = RecentlyCompletedIntake["patient"]
    type RelatedService = NonNullable<RecentlyCompletedIntake["service"]>
    type BaseRow = {
      id: string
      patient_id: string
      status: IntakeStatus
      patient: RelatedPatient | RelatedPatient[]
      service: RelatedService | RelatedService[] | null
    }
    type OrdinaryRow = BaseRow & { reviewed_at: string | null }
    const normalize = (row: OrdinaryRow): RecentlyCompletedIntake | null => {
      const patient = Array.isArray(row.patient) ? row.patient[0] : row.patient
      const service = Array.isArray(row.service) ? row.service[0] : row.service
      if (!patient || !row.reviewed_at) return null

      return {
        id: row.id,
        patient_id: row.patient_id,
        status: row.status,
        activity_at: row.reviewed_at,
        activity_provenance: "clinician_decision",
        patient,
        service: service ?? null,
      }
    }

    const ordinary = ((ordinaryResult.data || []) as unknown as OrdinaryRow[])
      .map((row) => normalize(row))
      .filter((row): row is RecentlyCompletedIntake => row !== null)
    const governanceCount = governanceResult.count
    const latestGovernanceAt = (governanceResult.data?.[0] as {
      batch_reviewed_at?: string | null
    } | undefined)?.batch_reviewed_at ?? null
    if (governanceCount > 0 && !latestGovernanceAt) {
      logger.error("Governance receipt count returned without a receipt timestamp", {
        governanceCount,
      })
      return { data: [], governanceReceipt: null, degraded: true, truncated: false }
    }

    const truncated = ordinary.length > limit
    const data = ordinary.slice(0, limit)
    const governanceReceipt = governanceCount > 0 && latestGovernanceAt
      ? { certificateCount: governanceCount, latestActivityAt: latestGovernanceAt }
      : null

    return { data, governanceReceipt, degraded: false, truncated }
  } catch (error) {
    logger.error("Actor-scoped review history query failed", {
      error: toError(error).message,
    })
    return { data: [], governanceReceipt: null, degraded: true, truncated: false }
  }
}
