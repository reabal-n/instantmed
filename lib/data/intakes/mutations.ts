import "server-only"

import { revalidateTag } from "next/cache"

import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { prepareDoctorNotesWrite, preparePatientNoteContentWrite, readPatientNoteContent } from "@/lib/security/phi-field-wrappers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type {
  Intake,
  IntakeStatus,
  PatientNote,
} from "@/types/db"
import {
  asIntake,
  asPatientNote,
} from "@/types/db"

import { logStatusChange } from "../intake-events"
import {
  IntakeLifecycleError,
  logTransitionAttempt,
  logTransitionFailure,
  logTransitionSuccess,
  validateIntakeStatusTransition,
} from "../intake-lifecycle"
import { triggerStatusEmail } from "./email-triggers"

const logger = createLogger("data-intakes-mutations")

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
      logger.error("Error transitioning intake to approved", {}, toError(error))
      return false
    }
  }

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
    logger.error("Error marking intake as refunded", {}, toError(error))
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
    logger.error("Error declining intake", {}, toError(error))
    return false
  }

  // Revalidate patient dashboard caches after decline
  revalidateTag("patient-intakes")
  revalidateTag("patient-dashboard")

  return true
}

// ============================================
// PATIENT NOTES (Longitudinal Encounter Notes)
// ============================================

/**
 * Create a patient note
 */
export async function createPatientNote(
  patientId: string,
  createdBy: string,
  content: string,
  options?: {
    noteType?: string
  }
): Promise<PatientNote | null> {
  const supabase = createServiceRoleClient()

  // Encrypt content (dual-write: plaintext + encrypted during migration)
  const contentFields = await preparePatientNoteContentWrite(content)

  const { data, error } = await supabase
    .from("patient_notes")
    .insert({
      patient_id: patientId,
      note_type: options?.noteType || "encounter",
      ...contentFields,
      created_by: createdBy,
    })
    .select("id, patient_id, note_type, content, content_enc, created_by, created_by_name, created_at, updated_at")
    .single()

  if (error) {
    logger.error("Error creating patient note", {}, toError(error))
    return null
  }

  return asPatientNote({
    ...data,
    content: await readPatientNoteContent(data),
    content_enc: undefined,
  } as Record<string, unknown>)
}

/**
 * Update a patient note
 */
export async function updatePatientNote(
  noteId: string,
  content: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  // Encrypt content (dual-write: plaintext + encrypted during migration)
  const contentFields = await preparePatientNoteContentWrite(content)

  const { error } = await supabase
    .from("patient_notes")
    .update({
      ...contentFields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)

  if (error) {
    logger.error("Error updating patient note", {}, toError(error))
    return false
  }

  return true
}
