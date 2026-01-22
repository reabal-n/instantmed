"use server"

import { requireAuth } from "@/lib/auth"
import { acquireIntakeLock, releaseIntakeLock, extendIntakeLock } from "@/lib/data/intake-lock"

/**
 * Server Actions for Intake Locking
 * 
 * P1 EFFICIENCY: Soft session lock to prevent duplicate review work
 */

export async function acquireIntakeLockAction(
  intakeId: string
): Promise<{ success: boolean; warning?: string; lockedByName?: string }> {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false }
    }

    const result = await acquireIntakeLock(
      intakeId,
      profile.id,
      profile.full_name || "Doctor"
    )

    if (!result.acquired && result.existingLock) {
      return {
        success: true, // Still allow access, just warn
        warning: result.warning,
        lockedByName: result.existingLock.lockedByName,
      }
    }

    return { success: true }
  } catch {
    return { success: true } // Fail open
  }
}

export async function releaseIntakeLockAction(
  intakeId: string
): Promise<{ success: boolean }> {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false }
    }

    await releaseIntakeLock(intakeId, profile.id)
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function extendIntakeLockAction(
  intakeId: string
): Promise<{ success: boolean }> {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return { success: false }
    }

    const extended = await extendIntakeLock(intakeId, profile.id)
    return { success: extended }
  } catch {
    return { success: false }
  }
}
