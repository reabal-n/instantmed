import "server-only"

import { unstable_cache } from "next/cache"

import { readDashboardQuery } from "@/lib/data/dashboard-read-model"
import { decryptProfilePhi } from "@/lib/data/profiles"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import {
  filterSeededE2EIntakes,
  SEEDED_E2E_PATIENT_PROFILE_ID,
} from "@/lib/data/seeded-e2e-data"
import { buildPatientHandoffSummary } from "@/lib/doctor/patient-handoff"
import { buildPatientSnapshot, getPatientSnapshotOptionsForCase } from "@/lib/doctor/patient-snapshot"
import { buildDoctorQueueServiceFilter, type QueueCapabilityService } from "@/lib/doctor/queue-capability-scope"
import { QUEUE_REVIEW_STATUSES } from "@/lib/doctor/queue-utils"
import { detectRenewalsForIntakes, type IntakeRenewalProbe } from "@/lib/doctor/renewal-detection"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { readAnswers, readDoctorNotes, readPatientNoteContent } from "@/lib/security/phi-field-wrappers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type {
  IntakeStatus,
  IntakeWithDetails,
  IntakeWithPatient,
  PatientNote,
  Profile,
} from "@/types/db"
import {
  asIntakeWithDetails,
  asIntakeWithPatient,
  asPatientNote,
} from "@/types/db"

import type { DashboardIntake, DashboardPrescription } from "./types"

const logger = createLogger("data-intakes")

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
        .select(`id, patient_id, service_id, assigned_admin_id, reference_number, status, previous_status, category, subtype, claimed_by, claimed_at, reviewing_doctor_id, reviewing_doctor_name, review_started_at, is_priority, sla_deadline, sla_warning_sent, sla_breached, risk_score, risk_tier, risk_reasons, risk_flags, triage_result, triage_reasons, requires_live_consult, live_consult_reason, payment_id, payment_status, amount_cents, refund_amount_cents, stripe_payment_intent_id, stripe_customer_id, admin_notes, doctor_notes, doctor_notes_enc, decline_reason, escalation_notes, decision, decline_reason_code, decline_reason_note, decided_at, reviewed_by, reviewed_at, flagged_for_followup, followup_reason, script_sent, script_sent_at, script_notes, parchment_reference, priority_review, submitted_at, paid_at, assigned_at, approved_at, declined_at, completed_at, cancelled_at, generated_document_url, generated_document_type, document_sent_at, client_ip, client_user_agent, created_at, updated_at, service:services!service_id(id, name, short_name, type, slug)`)
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
 * Get doctor queue - paid intakes ready for review
 * Supports pagination for scalability at high volume.
 * When doctorId is provided and that doctor has doctor_available=false, returns empty queue
 * so paused doctors do not see new intakes.
 */
export async function getDoctorQueue(
  options?: { page?: number; pageSize?: number; doctorId?: string; allowSeeded?: boolean; onlySeeded?: boolean }
): Promise<{ data: IntakeWithPatient[]; total: number; page: number; pageSize: number; degraded?: boolean }> {
  const supabase = createServiceRoleClient()
  const page = options?.page ?? 1
  const pageSize = Math.min(options?.pageSize ?? 50, 100) // Cap at 100
  const offset = (page - 1) * pageSize
  const allowSeeded = options?.allowSeeded ?? false
  const onlySeeded = allowSeeded && options?.onlySeeded === true

  const scope = await getDoctorQueueScope(options?.doctorId, supabase)
  if (scope.paused) {
    return { data: [], total: 0, page, pageSize, degraded: false }
  }

  // Get total count first. If this count path fails, still fetch the queue
  // data; a count problem should not blank the staff cockpit.
  const countResult = await readDashboardQuery({
    label: "staff review queue count",
    fallback: { count: 0, degraded: true },
    context: { surface: "staff-dashboard" },
    operation: async () => {
      let query = filterSeededE2EIntakes(supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .in("status", QUEUE_REVIEW_STATUSES)
        .eq("payment_status", "paid"), { allowSeeded })

      if (scope.serviceFilter) {
        query = query.or(scope.serviceFilter)
      }
      if (onlySeeded) {
        query = query.eq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)
      }

      const { count, error } = await query

      return { data: error ? null : { count: count ?? 0, degraded: false }, error }
    },
  })
  const countFallback = countResult.degraded

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
      patient:profiles!patient_id (id, full_name, email, date_of_birth, sex, medicare_number, medicare_irn, medicare_expiry, phone, address_line1, suburb, state, postcode),
      service:services!service_id (id, name, short_name, type, slug)
    `)
    .in("status", QUEUE_REVIEW_STATUSES)
    .eq("payment_status", "paid"), { allowSeeded })

  if (scope.serviceFilter) {
    dataQuery = dataQuery.or(scope.serviceFilter)
  }
  if (onlySeeded) {
    dataQuery = dataQuery.eq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)
  }

  const { data, error } = await dataQuery
    .order("is_priority", { ascending: false })
    .order("sla_deadline", { ascending: true, nullsFirst: false })
    .order("paid_at", { ascending: true, nullsFirst: false })
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (error) {
    logger.error("Error fetching doctor queue", {}, toError(error))
    return { data: [], total: countResult.count, page, pageSize, degraded: true }
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

  try {
    const data = await readDashboardQuery({
      label: "AI-approved intakes",
      fallback: [] as Array<Record<string, unknown>>,
      context: { surface: "staff-dashboard", limit },
      operation: async () => {
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

        return { data: error ? null : (data || []) as Array<Record<string, unknown>>, error }
      },
    })

    // Fetch soft flags from audit log for these intakes. This metadata is useful
    // but non-critical, so it must not take down the queue surface.
    const intakeIds = (data || []).map(r => r.id)
    const softFlagsMap: Record<string, string[]> = {}
    if (intakeIds.length > 0) {
      const auditRows = await readDashboardQuery({
        label: "AI-approved audit flags",
        fallback: [] as Array<{ intake_id: string; metadata: { softFlags?: string[] } | null }>,
        context: { surface: "staff-dashboard", intakeCount: intakeIds.length },
        operation: async () => {
          const { data, error } = await supabase
            .from("ai_audit_log")
            .select("intake_id, metadata")
            .in("intake_id", intakeIds)
            .eq("action", "auto_approve")
            .not("metadata->softFlags", "is", null)
            .order("created_at", { ascending: false })

          return {
            data: error ? null : (data || []) as Array<{ intake_id: string; metadata: { softFlags?: string[] } | null }>,
            error,
          }
        },
      })

      for (const row of auditRows) {
        const meta = row.metadata as { softFlags?: string[] } | null
        if (meta?.softFlags?.length && !softFlagsMap[row.intake_id]) {
          softFlagsMap[row.intake_id] = meta.softFlags
        }
      }
    }

    const unwrapped = (data || []).map(row => {
      const rowId = typeof row.id === "string" ? row.id : ""
      return {
        ...row,
        patient: Array.isArray(row.patient) ? row.patient[0] : row.patient,
        service: Array.isArray(row.service) ? row.service[0] : row.service,
        soft_flags: softFlagsMap[rowId] || null,
      }
    })
    return unwrapped.filter((r) => r.patient !== null) as unknown as IntakeWithPatient[]
  } catch (err) {
    logger.warn("AI-approved intakes failed after fallback", { error: toError(err).message })
    return []
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
      category,
      subtype,
      status,
      payment_status,
      refund_status,
      refund_amount_cents,
      amount_cents,
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
      answers:intake_answers(id, answers, answers_encrypted),
      patient:profiles!patient_id (
        id,
        full_name,
        email,
        date_of_birth,
        date_of_birth_encrypted,
        phone,
        phone_encrypted,
        sex,
        medicare_number,
        medicare_number_encrypted,
        medicare_irn,
        medicare_expiry,
        address_line1,
        suburb,
        state,
        postcode
      ),
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

  // Decrypt only long enough to calculate handoff completeness. Do not return raw
  // answers, Medicare, or structured address fields in the admin ledger payload.
  const unwrapped = await Promise.all((data || []).map(async (row) => {
    const rawPatient = Array.isArray(row.patient) ? row.patient[0] : row.patient
    const decryptedPatient = rawPatient ? decryptProfilePhi(rawPatient as Record<string, unknown>) : rawPatient
    const rawAnswers = Array.isArray(row.answers) ? row.answers[0] : null
    const answers = rawAnswers
      ? await readAnswers({
          answers: rawAnswers.answers as Record<string, unknown> | null,
          answers_enc: rawAnswers.answers_encrypted as never,
        })
      : null
    const service = Array.isArray(row.service) ? row.service[0] : row.service
    const handoff = decryptedPatient
      ? buildPatientHandoffSummary(buildPatientSnapshot(decryptedPatient as never, {
          ...getPatientSnapshotOptionsForCase({
            answers,
            category: row.category,
            serviceType: service?.type,
            subtype: row.subtype,
          }),
          answers,
        }))
      : null
    const patientForClient = decryptedPatient
      ? {
          id: decryptedPatient.id,
          full_name: decryptedPatient.full_name,
          email: decryptedPatient.email,
          date_of_birth: decryptedPatient.date_of_birth,
          phone: decryptedPatient.phone,
          suburb: decryptedPatient.suburb,
          state: decryptedPatient.state,
        }
      : decryptedPatient

    return {
      // Carry medicationName + service.type only long enough to feed the
      // renewal probe below; the ledger payload itself returns answers: null.
      __medicationName: pickAnswersMedicationName(answers),
      ...row,
      answers: null,
      patient: patientForClient,
      service,
      handoff,
    }
  }))
  const validData = unwrapped.filter((r) => r.patient !== null)

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
    total: count ?? 0,
    page,
    pageSize,
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
 * Get recently completed intakes for the unified staff cockpit.
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
