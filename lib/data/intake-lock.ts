import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logger } from "@/lib/observability/logger"

/**
 * Soft Session Lock for Intake Review
 * 
 * P1 EFFICIENCY: Prevents two doctors from reviewing the same case simultaneously.
 * Uses a soft lock with auto-expiry - does not block, only warns.
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
 * Attempt to acquire a soft lock on an intake for review
 * Returns success if no active lock exists, or if the lock is expired
 */
export async function acquireIntakeLock(
  intakeId: string,
  doctorId: string,
  doctorName: string
): Promise<LockResult> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const _expiresAt = new Date(now.getTime() + LOCK_TIMEOUT_MS) // Reserved for future lock metadata

  try {
    // Check for existing active lock (check both reviewing_doctor_id and claimed_by)
    const { data: intake } = await supabase
      .from("intakes")
      .select("reviewing_doctor_id, reviewing_doctor_name, review_started_at, claimed_by, claimed_at")
      .eq("id", intakeId)
      .single()

    // Check reviewing lock
    if (intake?.reviewing_doctor_id && intake.review_started_at) {
      const lockExpiry = new Date(new Date(intake.review_started_at).getTime() + LOCK_TIMEOUT_MS)
      
      // Check if lock is still active (not expired) and by a different doctor
      if (lockExpiry > now && intake.reviewing_doctor_id !== doctorId) {
        return {
          acquired: false,
          existingLock: {
            intakeId,
            lockedBy: intake.reviewing_doctor_id,
            lockedByName: intake.reviewing_doctor_name || "Another doctor",
            lockedAt: intake.review_started_at,
            expiresAt: lockExpiry.toISOString(),
          },
          warning: `This case is currently being reviewed by ${intake.reviewing_doctor_name || "another doctor"}. You may still proceed, but be aware of potential duplicate work.`,
        }
      }
    }
    
    // Also check claimed_by if reviewing_doctor_id not set (handles edge cases)
    if (!intake?.reviewing_doctor_id && intake?.claimed_by && intake.claimed_at) {
      const claimExpiry = new Date(new Date(intake.claimed_at).getTime() + LOCK_TIMEOUT_MS)
      if (claimExpiry > now && intake.claimed_by !== doctorId) {
        return {
          acquired: false,
          existingLock: {
            intakeId,
            lockedBy: intake.claimed_by,
            lockedByName: "Another doctor",
            lockedAt: intake.claimed_at,
            expiresAt: claimExpiry.toISOString(),
          },
          warning: `This case is currently claimed by another doctor. You may still proceed, but be aware of potential duplicate work.`,
        }
      }
    }

    // Acquire the lock - set BOTH reviewing fields AND claimed_by for approval flow
    // The approval flow checks claimed_by, so we must set it here
    const { error } = await supabase
      .from("intakes")
      .update({
        reviewing_doctor_id: doctorId,
        reviewing_doctor_name: doctorName,
        review_started_at: now.toISOString(),
        claimed_by: doctorId,
        claimed_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", intakeId)

    if (error) {
      logger.error("Failed to acquire intake lock", { intakeId, doctorId }, error)
      return { acquired: true } // Fail open - allow review
    }

    return { acquired: true }
  } catch (err) {
    logger.error("Error in acquireIntakeLock", { intakeId, doctorId }, err instanceof Error ? err : new Error(String(err)))
    return { acquired: true } // Fail open
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
    // Only release if this doctor holds the lock
    // Also clear claimed_by to match - but only if intake is still in reviewable state
    // (don't clear if already approved/declined)
    const { error } = await supabase
      .from("intakes")
      .update({
        reviewing_doctor_id: null,
        reviewing_doctor_name: null,
        review_started_at: null,
        claimed_by: null,
        claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)
      .eq("reviewing_doctor_id", doctorId)
      .in("status", ["paid", "in_review", "pending_info"])

    if (error) {
      logger.error("Failed to release intake lock", { intakeId, doctorId }, error)
    }
  } catch (err) {
    logger.error("Error in releaseIntakeLock", { intakeId, doctorId }, err instanceof Error ? err : new Error(String(err)))
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
