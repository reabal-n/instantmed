"use server"

/**
 * Revoke AI Auto-Approval
 *
 * Allows a doctor to revoke an AI-approved certificate during batch review.
 * The certificate is revoked via the existing revocation flow, and the
 * intake is moved back to in_review for manual doctor assessment.
 */

import { requireRoleOrNull } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { revokeCertificateAction } from "@/app/actions/revoke-cert"
import { createNotification } from "@/lib/notifications/service"
import { revalidatePath } from "next/cache"
import * as Sentry from "@sentry/nextjs"

const log = createLogger("revoke-ai-approval")

export interface RevokeAIApprovalResult {
  success: boolean
  error?: string
}

export async function revokeAIApproval(
  intakeId: string,
  reason: string
): Promise<RevokeAIApprovalResult> {
  // 1. Auth check
  const user = await requireRoleOrNull(["doctor", "admin"])
  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  if (!reason || reason.trim().length < 5) {
    return { success: false, error: "Please provide a reason for revocation (min 5 characters)" }
  }

  const supabase = createServiceRoleClient()

  try {
    // 2. Verify intake has ai_approved = true
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select("id, status, ai_approved, patient_id")
      .eq("id", intakeId)
      .single()

    if (fetchError || !intake) {
      return { success: false, error: "Intake not found" }
    }

    if (!intake.ai_approved) {
      return { success: false, error: "This intake was not AI-approved" }
    }

    // 3. Revoke the certificate using existing action
    const revokeResult = await revokeCertificateAction({
      intakeId,
      reason: `[AI Review Revocation] ${reason.trim()}`,
    })

    if (!revokeResult.success && !revokeResult.alreadyRevoked) {
      log.error("Failed to revoke AI-approved certificate", { intakeId, error: revokeResult.error })
      return { success: false, error: revokeResult.error || "Failed to revoke certificate" }
    }

    // 4. Move intake back to in_review (keep ai_approved=true for audit trail)
    const { error: updateError } = await supabase
      .from("intakes")
      .update({
        status: "in_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)

    if (updateError) {
      log.error("Failed to update intake status after revocation", { intakeId, error: updateError.message })
      // Certificate is already revoked, so this is a partial failure
    }

    // 5. Log to ai_audit_log
    await supabase.from("ai_audit_log").insert({
      intake_id: intakeId,
      action: "reject",
      draft_type: "med_cert",
      draft_id: null,
      actor_id: user.profile.id,
      actor_type: "doctor",
      reason: reason.trim(),
      metadata: {
        revoked_by: user.profile.full_name,
        original_status: intake.status,
      },
    })

    // 6. Notify patient that their certificate is under review
    if (intake.patient_id) {
      await createNotification({
        userId: intake.patient_id,
        type: "document_ready",
        title: "Certificate under review",
        message: "A doctor is reviewing your medical certificate. We'll update you shortly with the outcome.",
        actionUrl: `/patient/intakes/${intakeId}`,
        metadata: { intakeId, revoked: true },
      })
    }

    // 7. Sentry alert for monitoring
    Sentry.captureMessage("AI-approved certificate revoked by doctor", {
      level: "warning",
      tags: {
        subsystem: "auto-approval",
        intake_id: intakeId,
        doctor_id: user.profile.id,
      },
      extra: { reason: reason.trim() },
    })

    log.info("AI-approved certificate revoked", {
      intakeId,
      doctorId: user.profile.id,
      reason: reason.trim(),
    })

    revalidatePath("/doctor/queue")
    revalidatePath("/doctor/dashboard")
    revalidatePath(`/patient/intakes/${intakeId}`)

    return { success: true }
  } catch (error) {
    log.error("Error revoking AI approval", { intakeId, error })
    Sentry.captureException(error, {
      tags: { action: "revoke_ai_approval", intake_id: intakeId },
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error",
    }
  }
}
