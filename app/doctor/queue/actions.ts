"use server"

import { revalidatePath } from "next/cache"
import * as Sentry from "@sentry/nextjs"
import {
  updateIntakeStatus,
  saveDoctorNotes,
  flagForFollowup,
  markAsReviewed,
  updateScriptSent,
  createPatientNote,
} from "@/lib/data/intakes"
import { requireRole } from "@/lib/auth"
import { IntakeLifecycleError } from "@/lib/data/intake-lifecycle"
import { createLogger } from "@/lib/observability/logger"
import type { IntakeStatus } from "@/types/db"
import { declineIntake as declineIntakeCanonical } from "@/app/actions/decline-intake"

const logger = createLogger("doctor-queue-actions")

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

  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  // CRITICAL GUARD: Block direct approval of med certs - they MUST go through document builder
  // Med certs require PDF generation and email sending via approveAndSendCert
  if (status === "approved") {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()
    const { data: intake } = await supabase
      .from("intakes")
      .select("service:services(type)")
      .eq("id", intakeId)
      .single()
    
    const serviceType = (intake?.service as { type?: string } | null)?.type
    if (serviceType === "med_certs") {
      return { 
        success: false, 
        error: "Medical certificates must be approved through the document builder to generate PDFs and send emails.",
        code: "MED_CERT_REQUIRES_DOCUMENT_BUILDER"
      }
    }
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
  const { profile } = await requireRole(["doctor", "admin"])
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
): Promise<{ success: boolean; error?: string; refund?: { status: string } }> {
  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  // Use canonical decline action - handles refund + email + audit consistently
  const result = await declineIntakeCanonical({
    intakeId,
    reason: reasonNote,
    reasonCode,
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  revalidatePath("/doctor")
  revalidatePath("/doctor/queue")
  revalidatePath(`/doctor/intakes/${intakeId}`)
  revalidatePath(`/patient/intakes/${intakeId}`)

  return { 
    success: true,
    refund: result.refund ? { status: result.refund.status } : undefined,
  }
}

export async function flagForFollowupAction(
  intakeId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireRole(["doctor", "admin"])
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
  const { profile } = await requireRole(["doctor", "admin"])
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
  const { profile } = await requireRole(["doctor", "admin"])
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
 * Note: This feature requires the claim_intake_for_review migration to be run
 */
export async function claimIntakeAction(
  intakeId: string,
  force: boolean = false
): Promise<{ success: boolean; error?: string; claimedBy?: string }> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  Sentry.setTag("action", "claim_intake")
  Sentry.setTag("intake_id", intakeId)

  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()

    logger.info("[ClaimIntake] Attempting claim", { intakeId, doctorId: profile.id, force })

    // Use the database function for atomic claim
    const { data, error } = await supabase.rpc("claim_intake_for_review", {
      p_intake_id: intakeId,
      p_doctor_id: profile.id,
      p_force: force,
    })

    if (error) {
      // If RPC doesn't exist (migration not run), return graceful message
      if (error.message?.includes("function") || error.code === "42883") {
        logger.info("[ClaimIntake] RPC not available, fallback to success", { intakeId })
        return { success: true }
      }
      logger.error("[ClaimIntake] RPC failed", { intakeId, error: error.message })
      Sentry.captureMessage("Intake claim RPC failed", {
        level: "error",
        tags: { action: "claim_intake", intake_id: intakeId, step_id: "rpc_call" },
        extra: { error: error.message, doctorId: profile.id },
      })
      return { success: false, error: "Failed to claim intake" }
    }

    const result = data?.[0]
    if (!result?.success) {
      logger.info("[ClaimIntake] Intake already claimed", { 
        intakeId, 
        claimedBy: result?.current_claimant 
      })
      return {
        success: false,
        error: result?.error_message || "Intake already claimed",
        claimedBy: result?.current_claimant
      }
    }

    logger.info("[ClaimIntake] Claim successful", { intakeId, doctorId: profile.id })
    return { success: true }
  } catch (error) {
    logger.error("[ClaimIntake] Unexpected error", { intakeId }, error instanceof Error ? error : undefined)
    Sentry.captureException(error, {
      tags: { action: "claim_intake", intake_id: intakeId, step_id: "claim_outer_catch" },
    })
    // Graceful fallback if function doesn't exist
    return { success: true }
  }
}

/**
 * Release claim on an intake
 * Note: This feature requires the release_intake_claim migration to be run
 */
export async function releaseIntakeClaimAction(
  intakeId: string
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()

    const { error } = await supabase.rpc("release_intake_claim", {
      p_intake_id: intakeId,
      p_doctor_id: profile.id,
    })

    if (error) {
      // If RPC doesn't exist (migration not run), return graceful success
      if (error.message?.includes("function") || error.code === "42883") {
        return { success: true }
      }
      return { success: false, error: "Failed to release claim" }
    }

    return { success: true }
  } catch {
    // Graceful fallback if function doesn't exist
    return { success: true }
  }
}

/**
 * Get decline reason templates
 */
export async function getDeclineReasonTemplatesAction(): Promise<{
  success: boolean
  templates?: Array<{ code: string; label: string; description: string | null; requires_note: boolean }>
  error?: string
}> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
  const supabase = createServiceRoleClient()

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
  reason?: string,
  processStripeRefund: boolean = false
): Promise<{ success: boolean; error?: string; refundId?: string; amountRefunded?: number }> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  try {
    // If processStripeRefund is true, actually process the Stripe refund
    if (processStripeRefund) {
      const { refundIfEligible } = await import("@/lib/stripe/refunds")
      const refundResult = await refundIfEligible(intakeId, profile.id)
      
      if (!refundResult.success) {
        return { 
          success: false, 
          error: refundResult.reason || "Failed to process Stripe refund" 
        }
      }
      
      if (refundResult.refunded) {
        revalidatePath("/doctor")
        revalidatePath("/doctor/queue")
        revalidatePath(`/doctor/intakes/${intakeId}`)
        revalidatePath(`/patient/intakes/${intakeId}`)
        
        return { 
          success: true, 
          refundId: refundResult.stripeRefundId,
          amountRefunded: refundResult.amountRefunded
        }
      }
      
      // If not refunded but successful (e.g., not eligible), fall through to manual marking
    }
    
    // Manual marking (for cases already refunded externally or not eligible for auto-refund)
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
