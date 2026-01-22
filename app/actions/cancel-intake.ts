"use server"

import { revalidatePath } from "next/cache"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { logger } from "@/lib/observability/logger"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"

interface CancelIntakeResult {
  success: boolean
  error?: string
}

/**
 * Server action to cancel a pending_payment intake.
 * Only the patient who owns the intake can cancel it.
 * 
 * @param intakeId - The ID of the intake to cancel
 */
export async function cancelIntake(intakeId: string): Promise<CancelIntakeResult> {
  try {
    const authUser = await getAuthenticatedUserWithProfile()
    
    if (!authUser) {
      return { success: false, error: "Please sign in to continue" }
    }

    // Rate limiting - prevent abuse
    const rateLimit = await checkServerActionRateLimit(authUser.user.id, "standard")
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error || "Too many requests. Please wait." }
    }

    const supabase = createServiceRoleClient()

    // Fetch the intake to verify ownership and status
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select("id, patient_id, status")
      .eq("id", intakeId)
      .single()

    if (fetchError || !intake) {
      logger.warn("Cancel intake: not found", { intakeId, userId: authUser.profile.id })
      return { success: false, error: "Request not found" }
    }

    // Verify ownership
    if (intake.patient_id !== authUser.profile.id) {
      logger.warn("Cancel intake: unauthorized", { 
        intakeId, 
        ownerId: intake.patient_id, 
        userId: authUser.profile.id 
      })
      return { success: false, error: "You can only cancel your own requests" }
    }

    // Verify status allows cancellation
    // Note: pending_info removed - doctor is waiting for response, patient should respond instead
    const cancellableStatuses = ["draft", "pending_payment"]
    if (!cancellableStatuses.includes(intake.status)) {
      logger.warn("Cancel intake: invalid status", { intakeId, status: intake.status })
      
      // Provide specific message for pending_info status
      if (intake.status === "pending_info") {
        return { 
          success: false, 
          error: "This request cannot be cancelled while the doctor is waiting for information. Please respond to the doctor's question first." 
        }
      }
      
      return { 
        success: false, 
        error: "This request cannot be cancelled. Only unpaid requests can be cancelled." 
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
      logger.error("Cancel intake: update failed", { intakeId, error: updateError })
      return { success: false, error: "Failed to cancel request. Please try again." }
    }

    logger.info("Intake cancelled successfully", { intakeId, userId: authUser.profile.id })

    // Revalidate paths
    revalidatePath("/patient")
    revalidatePath(`/patient/intakes/${intakeId}`)

    return { success: true }
  } catch (error) {
    logger.error("Cancel intake: unexpected error", {
      intakeId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: "An unexpected error occurred" }
  }
}
