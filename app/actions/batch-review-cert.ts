"use server"

/**
 * Batch Review - Mark Auto-Reviewed Certificate as Doctor-Reviewed
 *
 * Allows doctors to confirm they've reviewed an auto-approved certificate.
 * Part of AHPRA compliance: every auto-approved cert must be doctor-reviewed
 * within 24 hours. This action records the review timestamp and doctor ID.
 */

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { revalidatePath } from "next/cache"

const log = createLogger("batch-review-cert")

export interface BatchReviewResult {
  success: boolean
  error?: string
  reviewedCount?: number
}

/**
 * Mark a single auto-approved intake as batch-reviewed by the doctor.
 */
export async function markBatchReviewed(intakeId: string): Promise<BatchReviewResult> {
  const user = await requireRoleOrNull(["doctor", "admin"])
  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("intakes")
    .update({
      batch_reviewed_at: new Date().toISOString(),
      batch_reviewed_by: user.profile.id,
    })
    .eq("id", intakeId)
    .eq("ai_approved", true)
    .is("batch_reviewed_at", null)

  if (error) {
    log.error("Failed to mark intake as batch-reviewed", { intakeId, error: error.message })
    return { success: false, error: error.message }
  }

  revalidatePath("/doctor/dashboard")
  return { success: true, reviewedCount: 1 }
}

/**
 * Mark multiple auto-approved intakes as batch-reviewed in one action.
 * Used by the "Confirm All Reviewed" button on the doctor dashboard.
 */
export async function markAllBatchReviewed(): Promise<BatchReviewResult> {
  const user = await requireRoleOrNull(["doctor", "admin"])
  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("intakes")
    .update({
      batch_reviewed_at: new Date().toISOString(),
      batch_reviewed_by: user.profile.id,
    })
    .eq("ai_approved", true)
    .eq("status", "approved")
    .is("batch_reviewed_at", null)
    .select("id")

  if (error) {
    log.error("Failed to batch-review intakes", { error: error.message })
    return { success: false, error: error.message }
  }

  const count = data?.length ?? 0
  log.info("Batch review completed", { doctorId: user.profile.id, reviewedCount: count })

  revalidatePath("/doctor/dashboard")
  return { success: true, reviewedCount: count }
}
