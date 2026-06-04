"use server"

/**
 * Bulk Decline Operations
 *
 * Processes multiple intake declines in throttled chunks to avoid
 * overwhelming the database and Stripe API.
 *
 * Extracted from decline-intake.ts for single-responsibility.
 */

import { requireRoleOrNull } from "@/lib/auth/helpers"

import { declineIntake } from "./decline-intake"

// ============================================================================
// BULK DECLINE
// ============================================================================

/**
 * Decline multiple intakes.
 * Processes in chunks of 5 to balance throughput and database load.
 */
export async function declineIntakesBulk(
  intakeIds: string[],
  reason?: string,
): Promise<{
  succeeded: string[]
  failed: Array<{ intakeId: string; error: string }>
}> {
  const authUser = await requireRoleOrNull(["doctor", "admin"])
  if (!authUser) {
    return { succeeded: [], failed: intakeIds.map(intakeId => ({ intakeId, error: "Only doctors and admins can decline requests" })) }
  }

  const succeeded: string[] = []
  const failed: Array<{ intakeId: string; error: string }> = []

  // Process in chunks of 5 to avoid overwhelming the database
  const CHUNK_SIZE = 5
  for (let i = 0; i < intakeIds.length; i += CHUNK_SIZE) {
    const chunk = intakeIds.slice(i, i + CHUNK_SIZE)
    const chunkResults = await Promise.all(
      chunk.map(intakeId => declineIntake({ intakeId, reason }))
    )
    chunkResults.forEach((result, idx) => {
      if (result.success) {
        succeeded.push(chunk[idx])
      } else {
        failed.push({ intakeId: chunk[idx], error: result.error || "Unknown error" })
      }
    })
  }

  return { succeeded, failed }
}
