import "server-only"

import { revalidateTag } from "next/cache"

import {
  getParchmentPrescribingEligibility,
  getParchmentScriptCompletionEligibility,
} from "@/lib/doctor/parchment-claim"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { prepareDoctorNotesWrite } from "@/lib/security/phi-field-wrappers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type {
  Intake,
  IntakeStatus,
} from "@/types/db"
import { asIntake } from "@/types/db"

import { logScriptSent, logStatusChange } from "../intake-events"
import {
  IntakeLifecycleError,
  logTransitionAttempt,
  logTransitionFailure,
  logTransitionSuccess,
  validateIntakeStatusTransition,
} from "../intake-lifecycle"
import { triggerStatusEmail } from "./email-triggers"

const logger = createLogger("data-intakes-mutations")

type ServiceRelation = { type?: string | null } | { type?: string | null }[] | null

function getServiceType(service: ServiceRelation | undefined): string | null {
  return Array.isArray(service) ? service[0]?.type ?? null : service?.type ?? null
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
    .select("id, status, created_at")
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

  return asIntake(intake as Record<string, unknown>)
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
    .select("id, status, updated_at")
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
    logger.error("[updateIntakeStatus] Database error", { intakeId, status }, toError(error))
    return null
  }

  logTransitionSuccess(intakeId, currentStatus, status, reviewedBy || "system")

  // Log intake event for SLA monitoring (non-blocking)
  logStatusChange(
    intakeId,
    currentStatus,
    status,
    reviewedBy || null,
    reviewedBy ? "doctor" : "system",
    { source: "updateIntakeStatus" }
  ).catch((err) => {
    logger.warn("[updateIntakeStatus] Failed to log intake event", { intakeId }, toError(err))
  })

  // Trigger status notification email for key transitions (non-blocking)
  if (["approved", "declined", "pending_info"].includes(status)) {
    triggerStatusEmail(intakeId, status, reviewedBy).catch((err) => {
      logger.error("[updateIntakeStatus] Failed to trigger status email", { intakeId, status }, toError(err))
    })
  }

  // Revalidate patient dashboard caches after status mutations
  revalidateTag("patient-intakes")
  revalidateTag("patient-dashboard")

  return asIntake(data as Record<string, unknown>)
}

/**
 * Move a paid prescribing request into the explicit internal state used for a
 * live Parchment/manual prescribing session. This is not final clinical
 * approval; it creates a narrow webhook target before script_sent evidence is
 * accepted.
 */
export async function startParchmentPrescribing(
  intakeId: string,
  reviewedBy: string,
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .select(`
      status, payment_status, category, subtype,
      service:services!service_id(type)
    `)
    .eq("id", intakeId)
    .single()

  if (intakeError || !intake) {
    logger.warn("[startParchmentPrescribing] Failed to fetch intake", { intakeId })
    return false
  }

  if (intake.status === "awaiting_script") {
    return true
  }

  const serviceType = getServiceType(intake.service as ServiceRelation)
  const eligibility = getParchmentPrescribingEligibility({
    status: intake.status,
    payment_status: intake.payment_status,
    category: intake.category,
    subtype: intake.subtype,
    serviceType,
  })

  if (!eligibility.eligible) {
    logger.warn("[startParchmentPrescribing] Blocked prescribing-session start for ineligible intake", {
      intakeId,
      status: intake.status,
      paymentStatus: intake.payment_status,
      category: intake.category,
      subtype: intake.subtype,
      serviceType,
    })
    return false
  }

  try {
    const result = await updateIntakeStatus(intakeId, "awaiting_script", reviewedBy)
    return Boolean(result)
  } catch (error) {
    logger.warn("[startParchmentPrescribing] Failed to transition intake to awaiting_script", { intakeId }, toError(error))
    return false
  }
}

/**
 * Record durable evidence that the prescription was sent.
 *
 * This intentionally does not approve/complete the intake. The doctor-facing
 * flow is prescribe first, then final approval once script_sent is present.
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

  if (!scriptSent) {
    logger.warn("[updateScriptSent] Script sent reversal blocked; use the audited prescription reversal workflow", { intakeId })
    return false
  }

  if (scriptSent) {
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(`
        status, payment_status, category, subtype, script_sent,
        service:services!service_id(type)
      `)
      .eq("id", intakeId)
      .single()

    if (intakeError || !intake) {
      logger.warn("[updateScriptSent] Failed to fetch intake before script completion", { intakeId })
      return false
    }

    if (intake.script_sent === true) {
      return true
    }

    const serviceType = getServiceType(intake.service as ServiceRelation)
    const eligibility = getParchmentScriptCompletionEligibility({
      status: intake.status,
      payment_status: intake.payment_status,
      category: intake.category,
      subtype: intake.subtype,
      serviceType,
    })

    if (!eligibility.eligible) {
      logger.warn("[updateScriptSent] Blocked script completion for ineligible intake", {
        intakeId,
        status: intake.status,
        paymentStatus: intake.payment_status,
        category: intake.category,
        subtype: intake.subtype,
        serviceType,
      })
      return false
    }
  }

  const scriptUpdate: Record<string, unknown> = {
    script_sent: scriptSent,
    script_sent_at: now,
    updated_at: now,
  }

  if (scriptNotes) {
    scriptUpdate.script_notes = scriptNotes
  }

  if (parchmentReference) {
    scriptUpdate.parchment_reference = parchmentReference
  }

  const { data: scriptRow, error: scriptError } = await supabase
    .from("intakes")
    .update(scriptUpdate)
    .eq("id", intakeId)
    .eq("status", "awaiting_script")
    .eq("payment_status", "paid")
    .eq("script_sent", false)
    .select("id")
    .maybeSingle()

  if (scriptError) {
    logger.error("Error updating script sent status", {}, scriptError instanceof Error ? scriptError : new Error(String(scriptError)))
    return false
  }

  if (!scriptRow) {
    logger.warn("[updateScriptSent] Script sent update matched no eligible intake", { intakeId })
    return false
  }

  logScriptSent(intakeId, reviewedBy || null, {
    parchmentReference,
    scriptNotes,
  }).catch((err) => {
    logger.warn("[updateScriptSent] Failed to log script_sent event", { intakeId }, toError(err))
  })

  revalidateTag("patient-intakes")
  revalidateTag("patient-dashboard")

  return true
}

/**
 * Final doctor approval after Parchment/manual prescribing has already
 * recorded script_sent. This closes and notifies the request.
 */
export async function approvePrescribedScript(
  intakeId: string,
  reviewedBy: string,
): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()

  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .select(`
      status, payment_status, category, subtype, script_sent,
      service:services!service_id(type)
    `)
    .eq("id", intakeId)
    .single()

  if (intakeError || !intake) {
    logger.warn("[approvePrescribedScript] Failed to fetch intake before approval", { intakeId })
    return false
  }

  if (intake.script_sent === true && intake.status === "completed") {
    return true
  }

  const serviceType = getServiceType(intake.service as ServiceRelation)
  const eligibility = getParchmentScriptCompletionEligibility({
    status: intake.status,
    payment_status: intake.payment_status,
    category: intake.category,
    subtype: intake.subtype,
    serviceType,
  })

  if (!eligibility.eligible || intake.script_sent !== true) {
    logger.warn("[approvePrescribedScript] Blocked approval before script completion", {
      intakeId,
      status: intake.status,
      paymentStatus: intake.payment_status,
      category: intake.category,
      subtype: intake.subtype,
      serviceType,
      scriptSent: intake.script_sent,
    })
    return false
  }

  const validation = validateIntakeStatusTransition(
    intake.status as IntakeStatus,
    "completed",
    intake.payment_status,
  )

  if (!validation.valid) {
    logger.warn("[approvePrescribedScript] Lifecycle validation blocked completion", {
      intakeId,
      status: intake.status,
      paymentStatus: intake.payment_status,
      error: validation.error,
    })
    return false
  }

  const { data: completedRow, error: completionError } = await supabase
    .from("intakes")
    .update({
      status: "completed",
      decision: "approved",
      decided_at: now,
      approved_at: now,
      completed_at: now,
      reviewed_by: reviewedBy,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", intakeId)
    .eq("script_sent", true)
    .eq("status", "awaiting_script")
    .eq("payment_status", "paid")
    .select("id, status")
    .maybeSingle()

  if (completionError) {
    logger.error("Error approving prescribed script", {}, toError(completionError))
    return false
  }

  if (!completedRow) {
    logger.warn("[approvePrescribedScript] Status update returned null", { intakeId })
    return false
  }

  logStatusChange(
    intakeId,
    intake.status as IntakeStatus,
    "completed",
    reviewedBy,
    "doctor",
    { source: "approvePrescribedScript" },
  ).catch((err) => {
    logger.warn("[approvePrescribedScript] Failed to log intake event", { intakeId }, toError(err))
  })

  revalidateTag("patient-intakes")
  revalidateTag("patient-dashboard")

  return true
}

/**
 * Save doctor notes for an intake
 * Encrypts notes via PHI envelope encryption when enabled.
 * During migration, writes both plaintext (for rollback) and encrypted.
 */
export async function saveDoctorNotes(intakeId: string, notes: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { doctor_notes, doctor_notes_enc } = await prepareDoctorNotesWrite(notes)

  const { error } = await supabase
    .from("intakes")
    .update({
      doctor_notes,
      doctor_notes_enc,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)

  if (error) {
    logger.error("Error saving doctor notes", {}, toError(error))
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
    logger.error("Error flagging for followup", {}, toError(error))
    return false
  }

  return true
}

/**
 * Mark intake as reviewed (paid -> in_review).
 * Uses optimistic lock to prevent race conditions when two doctors
 * attempt to claim the same intake simultaneously.
 */
export async function markAsReviewed(intakeId: string, doctorId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("intakes")
    .update({
      reviewed_by: doctorId,
      reviewed_at: new Date().toISOString(),
      status: "in_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)
    .eq("status", "paid") // Optimistic lock: only transition from paid
    .select("id")
    .maybeSingle()

  if (error) {
    logger.error("Error marking as reviewed", {}, toError(error))
    return false
  }

  // If no row was updated, intake was already claimed or not in 'paid' status
  if (!data) {
    logger.warn("markAsReviewed: intake not in 'paid' status, skipping", { intakeId, doctorId })
    return false
  }

  return true
}

// Legacy declineIntake() removed -- use canonical app/actions/decline-intake.ts
// which handles refund + email + audit consistently.
