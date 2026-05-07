import "server-only"

import { toError } from "@/lib/errors"
import { logger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const LOCKABLE_STATUSES = ["paid", "in_review", "pending_info", "awaiting_script"] as const

/**
 * Review claim for intake review.
 *
 * Prevents two doctors from mutating the same case simultaneously.
 * The database claim is the enforcement boundary; reviewing fields are UI context.
 */

const LOCK_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

export interface IntakeLock {
  intakeId: string
  lockedBy: string
  lockedByName: string
  lockedAt: string
  expiresAt: string
}

export interface LockResult {
  acquired: boolean
  existingLock?: IntakeLock
  warning?: string
}

/**
 * Attempt to acquire the review claim for an intake.
 * The claim itself is atomic in Postgres; reviewing fields are just UI context.
 */
export async function acquireIntakeLock(
  intakeId: string,
  doctorId: string,
  doctorName: string
): Promise<LockResult> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  try {
    const { data: claimResult, error: claimError } = await supabase.rpc("claim_intake_for_review", {
      p_intake_id: intakeId,
      p_doctor_id: doctorId,
      p_force: false,
    })

    const claim = Array.isArray(claimResult) ? claimResult[0] : claimResult

    if (claimError || !claim?.success) {
      const lockedByName = claim?.current_claimant || "another doctor"
      const lockedAt = now.toISOString()
      const expiresAt = new Date(now.getTime() + LOCK_TIMEOUT_MS).toISOString()
      return {
        acquired: false,
        existingLock: {
          intakeId,
          lockedBy: "unknown",
          lockedByName,
          lockedAt,
          expiresAt,
        },
        warning: claim?.error_message || "This case could not be claimed for review.",
      }
    }

    const { error } = await supabase
      .from("intakes")
      .update({
        reviewing_doctor_id: doctorId,
        reviewing_doctor_name: doctorName,
        review_started_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", intakeId)
      .eq("claimed_by", doctorId)
      .in("status", LOCKABLE_STATUSES)

    if (error) {
      logger.error("Failed to write intake review context after claim", { intakeId, doctorId }, error)
    }

    return { acquired: true }
  } catch (err) {
    logger.error("Error in acquireIntakeLock", { intakeId, doctorId }, toError(err))
    return {
      acquired: false,
      warning: "This case could not be claimed for review.",
    }
  }
}

/**
 * Release the lock on an intake (called when doctor navigates away or completes action)
 */
export async function releaseIntakeLock(
  intakeId: string,
  doctorId: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  try {
    const { error: releaseError } = await supabase.rpc("release_intake_claim", {
      p_intake_id: intakeId,
      p_doctor_id: doctorId,
    })

    if (releaseError) {
      logger.error("Failed to release intake claim", { intakeId, doctorId }, releaseError)
    }

    const { error } = await supabase
      .from("intakes")
      .update({
        reviewing_doctor_id: null,
        reviewing_doctor_name: null,
        review_started_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)
      .eq("reviewing_doctor_id", doctorId)
      .in("status", LOCKABLE_STATUSES)

    if (error) {
      logger.error("Failed to release intake lock", { intakeId, doctorId }, error)
    }
  } catch (err) {
    logger.error("Error in releaseIntakeLock", { intakeId, doctorId }, toError(err))
  }
}

/**
 * Extend the lock (called periodically while doctor is actively reviewing)
 */
export async function extendIntakeLock(
  intakeId: string,
  doctorId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  try {
    const { error } = await supabase
      .from("intakes")
      .update({
        review_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)
      .eq("reviewing_doctor_id", doctorId)

    return !error
  } catch {
    return false
  }
}
