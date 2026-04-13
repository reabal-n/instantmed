"use server"

import { withServerAction } from "@/lib/actions/with-server-action"
import { acquireIntakeLock, extendIntakeLock, releaseIntakeLock } from "@/lib/data/intake-lock"
import type { ActionResult } from "@/types/shared"

/**
 * Server Actions for Intake Locking
 *
 * P1 EFFICIENCY: Soft session lock to prevent duplicate review work
 */

interface AcquireLockData {
  warning?: string
  lockedByName?: string
}

export const acquireIntakeLockAction = withServerAction<string, AcquireLockData>(
  { roles: ["doctor", "admin"], name: "acquire-intake-lock" },
  async (intakeId, { profile }): Promise<ActionResult<AcquireLockData>> => {
    const result = await acquireIntakeLock(
      intakeId,
      profile.id,
      profile.full_name || "Doctor"
    )

    if (!result.acquired && result.existingLock) {
      return {
        success: true, // Still allow access, just warn
        data: {
          warning: result.warning,
          lockedByName: result.existingLock.lockedByName,
        },
      }
    }

    return { success: true }
  }
)

export const releaseIntakeLockAction = withServerAction<string>(
  { roles: ["doctor", "admin"], name: "release-intake-lock" },
  async (intakeId, { profile }): Promise<ActionResult> => {
    await releaseIntakeLock(intakeId, profile.id)
    return { success: true }
  }
)

export const extendIntakeLockAction = withServerAction<string>(
  { roles: ["doctor", "admin"], name: "extend-intake-lock" },
  async (intakeId, { profile }): Promise<ActionResult> => {
    const extended = await extendIntakeLock(intakeId, profile.id)
    return { success: extended }
  }
)
