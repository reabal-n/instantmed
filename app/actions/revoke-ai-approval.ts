"use server"

/**
 * Revoke AI Auto-Approval
 *
 * Allows a doctor to revoke an AI-approved certificate during batch review.
 * The certificate is revoked via the existing revocation flow, and the
 * intake is moved back to in_review for manual doctor assessment.
 */

import * as Sentry from "@sentry/nextjs"
import { revalidatePath } from "next/cache"

import { revokeCertificateAction } from "@/app/actions/revoke-cert"
import { withServerAction } from "@/lib/actions/with-server-action"
import { createNotification } from "@/lib/notifications/service"
import type { ActionResult } from "@/types/shared"

interface RevokeAIApprovalInput {
  intakeId: string
  reason: string
}

export const revokeAIApproval = withServerAction<RevokeAIApprovalInput>(
  { roles: ["doctor", "admin"], name: "revoke-ai-approval" },
  async ({ intakeId, reason }, { supabase, profile, log }): Promise<ActionResult> => {
    if (!reason || reason.trim().length < 5) {
      return { success: false, error: "Please provide a reason for revocation (min 5 characters)" }
    }

    // Verify intake has ai_approved = true
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

    // Revoke the certificate using existing action
    const revokeResult = await revokeCertificateAction({
      intakeId,
      reason: `[AI Review Revocation] ${reason.trim()}`,
    })

    if (!revokeResult.success && !revokeResult.alreadyRevoked) {
      log.error("Failed to revoke AI-approved certificate", { intakeId, error: revokeResult.error })
      return { success: false, error: revokeResult.error || "Failed to revoke certificate" }
    }

    // Move intake back to in_review (keep ai_approved=true for audit trail)
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

    // Log to ai_audit_log
    await supabase.from("ai_audit_log").insert({
      intake_id: intakeId,
      action: "reject",
      draft_type: "med_cert",
      draft_id: null,
      actor_id: profile.id,
      actor_type: "doctor",
      reason: reason.trim(),
      metadata: {
        revoked_by: profile.full_name,
        original_status: intake.status,
      },
    })

    // Notify patient that their certificate is under review
    if (intake.patient_id) {
      await createNotification({
        userId: intake.patient_id,
        type: "request_update",
        title: "Certificate under review",
        message: "A doctor is reviewing your medical certificate. We'll update you shortly with the outcome.",
        actionUrl: `/patient/intakes/${intakeId}`,
        metadata: { intakeId, revoked: true },
      })
    }

    // Sentry alert for monitoring
    Sentry.captureMessage("Auto-reviewed certificate revoked by doctor", {
      level: "warning",
      tags: {
        subsystem: "cert-pipeline",
        intake_id: intakeId,
        doctor_id: profile.id,
      },
      extra: { reason: reason.trim() },
    })

    log.info("AI-approved certificate revoked", {
      intakeId,
      doctorId: profile.id,
      reason: reason.trim(),
    })

    revalidatePath("/doctor/queue")
    revalidatePath("/doctor/dashboard")
    revalidatePath(`/patient/intakes/${intakeId}`)

    return { success: true }
  }
)
