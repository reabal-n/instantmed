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
  BATCH_REVIEW_ENFORCEMENT_START,
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

const cohortIdsSchema = z.array(z.string().uuid()).min(1).max(100)

export interface CohortBatchReviewResult {
  success: boolean
  error?: string
  reviewedIds: string[]
  skippedIds: string[]
}

/**
 * Record one cohort-level governance review over every eligible pending
 * auto-approved certificate the doctor was shown (operator decision
 * 2026-07-22: cohort attestation replaces mandatory per-certificate
 * acknowledgement). The audit trail says what actually happened — a cohort
 * governance review, not a per-patient clinical re-review. Per-certificate
 * revocation remains the correction path and is unchanged.
 */
export async function markBatchReviewedCohort(
  intakeIds: string[],
): Promise<CohortBatchReviewResult> {
  const parsedIds = cohortIdsSchema.safeParse(intakeIds)
  if (!parsedIds.success) {
    return { success: false, error: "Invalid intake IDs", reviewedIds: [], skippedIds: [] }
  }
  const requestedIds = [...new Set(parsedIds.data)]

  const user = await requireRoleOrNull(["doctor", "admin"])
  if (!user) {
    return { success: false, error: "Unauthorized", reviewedIds: [], skippedIds: [] }
  }
  if (!doctorHasCapability(user.profile, "review_med_certs")) {
    return {
      success: false,
      error: "You are not authorised to review medical certificates",
      reviewedIds: [],
      skippedIds: [],
    }
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intakes")
    .update(buildBatchReviewResolutionFields(user.profile.id))
    .in("id", requestedIds)
    .eq("ai_approved", true)
    .eq("category", "medical_certificate")
    .in("status", [...BATCH_REVIEW_ELIGIBLE_STATUSES])
    .gte("ai_approved_at", BATCH_REVIEW_ENFORCEMENT_START)
    .is("batch_reviewed_at", null)
    .select("id")

  if (error) {
    log.error("Failed to record cohort batch review", {
      requestedCount: requestedIds.length,
      error: error.message,
    })
    return { success: false, error: error.message, reviewedIds: [], skippedIds: [] }
  }

  const reviewedIds = (data ?? []).map((row) => row.id)
  const reviewedSet = new Set(reviewedIds)
  const skippedIds = requestedIds.filter((id) => !reviewedSet.has(id))

  if (reviewedIds.length === 0) {
    // Nothing eligible remained (already reviewed elsewhere, revoked, or
    // grandfathered). Idempotent success so a double-submit is harmless.
    return { success: true, reviewedIds: [], skippedIds }
  }

  const { error: auditError } = await supabase.from("ai_audit_log").insert(
    reviewedIds.map((intakeId) => ({
      intake_id: intakeId,
      action: "approve",
      actor_id: user.profile.id,
      actor_type: "doctor",
      metadata: {
        review_type: "post_auto_approval_cohort_review",
        outcome: "reviewed_no_change",
        cohort_size: reviewedIds.length,
      },
    })),
  )
  if (auditError) {
    log.error("Cohort review persisted but audit insert failed", {
      reviewedCount: reviewedIds.length,
      error: auditError.message,
    })
  }

  for (const intakeId of reviewedIds) {
    revalidateStaff({ intakeId })
  }
  return { success: true, reviewedIds, skippedIds }
}
