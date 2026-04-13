"use server"

import { revalidatePath } from "next/cache"

import { withServerAction } from "@/lib/actions/with-server-action"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import type { ActionResult } from "@/types/shared"

/**
 * Server action to cancel a pending_payment intake.
 * Only the patient who owns the intake can cancel it.
 */
export const cancelIntake = withServerAction<string>(
  { auth: "apiAuth", name: "cancel-intake" },
  async (intakeId, { supabase, profile, userId, log }): Promise<ActionResult> => {
    // Rate limiting - prevent abuse
    const rateLimit = await checkServerActionRateLimit(userId, "standard")
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error || "Too many requests. Please wait." }
    }

    // Fetch the intake to verify ownership and status
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select("id, patient_id, status")
      .eq("id", intakeId)
      .single()

    if (fetchError || !intake) {
      log.warn("Cancel intake: not found", { intakeId, userId: profile.id })
      return { success: false, error: "Request not found" }
    }

    // Verify ownership
    if (intake.patient_id !== profile.id) {
      log.warn("Cancel intake: unauthorized", {
        intakeId,
        ownerId: intake.patient_id,
        userId: profile.id,
      })
      return { success: false, error: "You can only cancel your own requests" }
    }

    // Verify status allows cancellation
    // Note: pending_info removed - doctor is waiting for response, patient should respond instead
    const cancellableStatuses = ["draft", "pending_payment"]
    if (!cancellableStatuses.includes(intake.status)) {
      log.warn("Cancel intake: invalid status", { intakeId, status: intake.status })

      // Provide specific message for pending_info status
      if (intake.status === "pending_info") {
        return {
          success: false,
          error: "This request cannot be cancelled while the doctor is waiting for information. Please respond to the doctor's question first.",
        }
      }

      return {
        success: false,
        error: "This request cannot be cancelled. Only unpaid requests can be cancelled.",
      }
    }

    // Update intake status to cancelled
    const { error: updateError } = await supabase
      .from("intakes")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)

    if (updateError) {
      log.error("Cancel intake: update failed", { intakeId, error: updateError })
      return { success: false, error: "Failed to cancel request. Please try again." }
    }

    log.info("Intake cancelled successfully", { intakeId, userId: profile.id })

    // Revalidate paths
    revalidatePath("/patient")
    revalidatePath(`/patient/intakes/${intakeId}`)

    return { success: true }
  }
)
