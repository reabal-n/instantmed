"use server"

import { revalidatePath } from "next/cache"
import {
  updateIntakeStatus,
  saveDoctorNotes,
  flagForFollowup,
  markAsReviewed,
  declineIntake,
  updateScriptSent,
  createPatientNote,
} from "@/lib/data/intakes"
import { requireAuth } from "@/lib/auth"
import { IntakeLifecycleError } from "@/lib/data/intake-lifecycle"
import type { IntakeStatus } from "@/types/db"

// UUID validation helper
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export async function updateStatusAction(
  intakeId: string,
  status: IntakeStatus,
  _doctorId: string,
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const result = await updateIntakeStatus(intakeId, status, profile.id)
    if (!result) {
      return { success: false, error: "Failed to update status" }
    }

    // Mark as reviewed if going to in_review
    if (status === "in_review") {
      await markAsReviewed(intakeId, profile.id)
    }

    revalidatePath("/doctor")
    revalidatePath("/doctor/queue")
    revalidatePath(`/doctor/intakes/${intakeId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof IntakeLifecycleError) {
      switch (error.code) {
        case "PAYMENT_REQUIRED":
          return {
            success: false,
            error: "Cannot update status - payment not completed",
            code: error.code,
          }
        case "TERMINAL_STATE":
          return {
            success: false,
            error: "This intake has already been finalized",
            code: error.code,
          }
        case "INVALID_TRANSITION":
          return {
            success: false,
            error: `Invalid status change. ${error.message}`,
            code: error.code,
          }
        default:
          return {
            success: false,
            error: error.message,
            code: error.code,
          }
      }
    }
    throw error
  }
}

export async function saveDoctorNotesAction(
  intakeId: string,
  notes: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await saveDoctorNotes(intakeId, notes)
  if (!success) {
    return { success: false, error: "Failed to save notes" }
  }

  return { success: true }
}

export async function declineIntakeAction(
  intakeId: string,
  reasonCode: string,
  reasonNote?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  // Get intake details for email before declining
  const { getIntakeWithDetails } = await import("@/lib/data/intakes")
  const intake = await getIntakeWithDetails(intakeId)
  
  const success = await declineIntake(intakeId, profile.id, reasonCode, reasonNote)
  if (!success) {
    return { success: false, error: "Failed to decline" }
  }

  // Send decline notification email (P0 fix)
  if (intake?.patient?.email) {
    try {
      const { sendRequestDeclinedEmail } = await import("@/lib/email/resend")
      const service = intake.service as { name?: string; type?: string } | undefined
      const requestType = service?.name || "medical request"
      
      const emailResult = await sendRequestDeclinedEmail(
        intake.patient.email,
        intake.patient.full_name || "Patient",
        requestType,
        intakeId,
        reasonNote || undefined
      )
      
      // Track email delivery status on intake
      if (!emailResult.success) {
        const { createClient } = await import("@/lib/supabase/server")
        const supabase = await createClient()
        await supabase
          .from("intakes")
          .update({ 
            notification_email_status: "failed",
            notification_email_error: emailResult.error,
            updated_at: new Date().toISOString(),
          })
          .eq("id", intakeId)
        
        // Log to Sentry for visibility
        const { captureMessage } = await import("@sentry/nextjs")
        captureMessage("Decline notification email failed", {
          level: "warning",
          tags: { intakeId, action: "decline" },
          extra: { error: emailResult.error, patientEmail: intake.patient.email },
        })
      } else {
        const { createClient } = await import("@/lib/supabase/server")
        const supabase = await createClient()
        await supabase
          .from("intakes")
          .update({ 
            notification_email_status: "sent",
            updated_at: new Date().toISOString(),
          })
          .eq("id", intakeId)
      }
    } catch (emailError) {
      // Log email failure but don't fail the action
      const { createLogger } = await import("@/lib/observability/logger")
      const logger = createLogger("decline-intake")
      logger.error("Failed to send decline email", { intakeId }, emailError instanceof Error ? emailError : new Error(String(emailError)))
      
      // Track failure on intake
      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()
      await supabase
        .from("intakes")
        .update({ 
          notification_email_status: "failed",
          notification_email_error: emailError instanceof Error ? emailError.message : "Unknown error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", intakeId)
    }
  }

  revalidatePath("/doctor")
  revalidatePath("/doctor/queue")
  revalidatePath(`/doctor/intakes/${intakeId}`)
  revalidatePath(`/patient/intakes/${intakeId}`)

  return { success: true }
}

export async function flagForFollowupAction(
  intakeId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await flagForFollowup(intakeId, reason)
  if (!success) {
    return { success: false, error: "Failed to flag" }
  }

  return { success: true }
}

export async function markScriptSentAction(
  intakeId: string,
  scriptNotes?: string,
  parchmentReference?: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const success = await updateScriptSent(intakeId, true, scriptNotes, parchmentReference)
  if (!success) {
    return { success: false, error: "Failed to mark script sent" }
  }

  // Send email notification to patient
  try {
    const { sendScriptSentEmail } = await import("@/lib/email/resend")
    const { getIntakeWithDetails } = await import("@/lib/data/intakes")
    
    const intake = await getIntakeWithDetails(intakeId)
    if (intake?.patient?.email) {
      await sendScriptSentEmail(
        intake.patient.email,
        intake.patient.full_name || "Patient",
        intakeId,
        parchmentReference
      )
    }
  } catch {
    // Email is non-critical, don't fail the action
  }

  revalidatePath("/doctor")
  revalidatePath("/doctor/queue")
  revalidatePath(`/doctor/intakes/${intakeId}`)
  revalidatePath(`/patient/intakes/${intakeId}`)

  return { success: true }
}

export async function addPatientNoteAction(
  patientId: string,
  content: string,
  options?: {
    intakeId?: string
    noteType?: string
    title?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const note = await createPatientNote(patientId, profile.id, content, options)
  if (!note) {
    return { success: false, error: "Failed to create note" }
  }

  return { success: true }
}

/**
 * Claim an intake for review (concurrent review lock)
 */
export async function claimIntakeAction(
  intakeId: string,
  force: boolean = false
): Promise<{ success: boolean; error?: string; claimedBy?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()

  // Use the database function for atomic claim
  const { data, error } = await supabase.rpc("claim_intake_for_review", {
    p_intake_id: intakeId,
    p_doctor_id: profile.id,
    p_force: force,
  })

  if (error) {
    return { success: false, error: "Failed to claim intake" }
  }

  const result = data?.[0]
  if (!result?.success) {
    return { 
      success: false, 
      error: result?.error_message || "Intake already claimed",
      claimedBy: result?.current_claimant 
    }
  }

  return { success: true }
}

/**
 * Release claim on an intake
 */
export async function releaseIntakeClaimAction(
  intakeId: string
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()

  const { error } = await supabase.rpc("release_intake_claim", {
    p_intake_id: intakeId,
    p_doctor_id: profile.id,
  })

  if (error) {
    return { success: false, error: "Failed to release claim" }
  }

  return { success: true }
}

/**
 * Get decline reason templates
 */
export async function getDeclineReasonTemplatesAction(): Promise<{
  success: boolean
  templates?: Array<{ code: string; label: string; description: string | null; requires_note: boolean }>
  error?: string
}> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("decline_reason_templates")
    .select("code, label, description, requires_note")
    .eq("is_active", true)
    .order("display_order", { ascending: true })

  if (error) {
    return { success: false, error: "Failed to fetch templates" }
  }

  return { success: true, templates: data }
}

export async function markAsRefundedAction(
  intakeId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  try {
    const { markIntakeRefunded } = await import("@/lib/data/intakes")
    const success = await markIntakeRefunded(intakeId, profile.id, reason)
    
    if (!success) {
      return { success: false, error: "Failed to mark as refunded" }
    }

    revalidatePath("/doctor")
    revalidatePath("/doctor/queue")
    revalidatePath(`/doctor/intakes/${intakeId}`)
    revalidatePath(`/patient/intakes/${intakeId}`)

    return { success: true }
  } catch {
    return { success: false, error: "Failed to mark as refunded" }
  }
}
