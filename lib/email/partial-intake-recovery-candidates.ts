import "server-only"

import {
  PARTIAL_RECOVERY_MAX_IDLE_HOURS,
  PARTIAL_RECOVERY_MIN_IDLE_MINUTES,
} from "@/lib/email/partial-intake-recovery-policy"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const PARTIAL_RECOVERY_BATCH_SIZE = 50

export interface PartialIntakeRecoveryCandidate {
  recovery_tracking_id: string
  email: string
  updated_at: string
}

export async function findPartialIntakeRecoveryCandidates(
  now: Date,
): Promise<PartialIntakeRecoveryCandidate[]> {
  const eligibleBefore = new Date(
    now.getTime() - PARTIAL_RECOVERY_MIN_IDLE_MINUTES * 60 * 1000,
  ).toISOString()
  const eligibleAfter = new Date(
    now.getTime() - PARTIAL_RECOVERY_MAX_IDLE_HOURS * 60 * 60 * 1000,
  ).toISOString()

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc(
    "get_partial_intake_recovery_candidates",
    {
      p_eligible_after: eligibleAfter,
      p_eligible_before: eligibleBefore,
      p_limit: PARTIAL_RECOVERY_BATCH_SIZE,
    },
  )

  if (error) {
    throw new Error(`Failed to fetch eligible recovery drafts: ${error.message}`)
  }

  // The RPC's NOT EXISTS anti-join treats every outbox row as a durable owner,
  // regardless of status or retry exhaustion. That exclusion happens before
  // the oldest-first limit and has no PostgREST row or URL-size ceiling.
  return (data ?? []) as PartialIntakeRecoveryCandidate[]
}
