"use server"

/**
 * Record an individual doctor's post-auto-approval review of a medical
 * certificate. The 24-hour review window is an InstantMed governance control,
 * not a statutory AHPRA requirement.
 */

import { z } from "zod"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { doctorHasCapability } from "@/lib/auth/staff-capabilities"
import {
  BATCH_REVIEW_ELIGIBLE_STATUSES,
  buildBatchReviewResolutionFields,
} from "@/lib/clinical/batch-review-policy"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("batch-review-cert")
const intakeIdSchema = z.string().uuid()

export interface BatchReviewResult {
  success: boolean
  error?: string
  reviewedAt?: string
}

export async function markBatchReviewed(intakeId: string): Promise<BatchReviewResult> {
  if (!intakeIdSchema.safeParse(intakeId).success) {
    return { success: false, error: "Invalid intake ID" }
  }

  const user = await requireRoleOrNull(["doctor", "admin"])
  if (!user) {
    return { success: false, error: "Unauthorized" }
  }
  if (!doctorHasCapability(user.profile, "review_med_certs")) {
    return {
      success: false,
      error: "You are not authorised to review medical certificates",
    }
  }

  const supabase = createServiceRoleClient()
  const reviewedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from("intakes")
    .update(buildBatchReviewResolutionFields(user.profile.id, new Date(reviewedAt)))
    .eq("id", intakeId)
    .eq("ai_approved", true)
    .eq("category", "medical_certificate")
    .in("status", [...BATCH_REVIEW_ELIGIBLE_STATUSES])
    .is("batch_reviewed_at", null)
    .select("id, batch_reviewed_at")

  if (error) {
    log.error("Failed to mark certificate as batch-reviewed", {
      intakeId,
      error: error.message,
    })
    return { success: false, error: error.message }
  }

  const updated = data?.[0]
  if (!updated) {
    const { data: existing, error: lookupError } = await supabase
      .from("intakes")
      .select("batch_reviewed_at")
      .eq("id", intakeId)
      .maybeSingle()

    if (lookupError) {
      log.error("Failed to verify certificate batch-review state", {
        intakeId,
        error: lookupError.message,
      })
      return { success: false, error: lookupError.message }
    }
    if (existing?.batch_reviewed_at) {
      return { success: true, reviewedAt: existing.batch_reviewed_at }
    }
    return { success: false, error: "Certificate is not eligible for batch review" }
  }

  const { error: auditError } = await supabase.from("ai_audit_log").insert({
    intake_id: intakeId,
    action: "approve",
    actor_id: user.profile.id,
    actor_type: "doctor",
    metadata: {
      review_type: "post_auto_approval_batch_review",
      outcome: "reviewed_no_change",
    },
  })
  if (auditError) {
    log.error("Certificate review persisted but audit insert failed", {
      intakeId,
      error: auditError.message,
    })
  }

  revalidateStaff({ intakeId })
  return { success: true, reviewedAt: updated.batch_reviewed_at }
}
