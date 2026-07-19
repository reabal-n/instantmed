import "server-only"

import { finalizeOutboxSequenceDisposition } from "@/lib/email/outbox-disposition"
import { PARTIAL_RECOVERY_BATCH_SIZE } from "@/lib/email/partial-intake-recovery-candidates"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Heal only from the schema RPC's confirmed email_outbox.status='sent' proof.
 * skipped_e2e, pending, sending, and failed rows are intentionally invisible.
 */
export async function reconcileSentPartialIntakeRecoveryMarkers(
  limit = PARTIAL_RECOVERY_BATCH_SIZE,
): Promise<{ reconciled: number; failed: number }> {
  const boundedLimit = Math.max(
    1,
    Math.min(limit, PARTIAL_RECOVERY_BATCH_SIZE),
  )
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc(
    "get_unmarked_sent_partial_recoveries",
    { p_limit: boundedLimit },
  )

  if (error) {
    throw new Error(
      `Failed to fetch sent partial recovery outbox proof: ${error.message}`,
    )
  }

  let reconciled = 0
  let failed = 0
  for (const row of data ?? []) {
    const recoveryTrackingId = row.recovery_tracking_id
    if (typeof recoveryTrackingId !== "string" || !recoveryTrackingId) {
      failed += 1
      continue
    }

    const result = await finalizeOutboxSequenceDisposition(
      {
        id: `partial-recovery:${recoveryTrackingId}:policy`,
        email_type: "partial_intake_recovery",
        intake_id: null,
        metadata: {
          recovery_tracking_id: recoveryTrackingId,
        },
      },
      "sent",
    )
    if (result.finalized) reconciled += 1
    else failed += 1
  }

  return { reconciled, failed }
}
