import { type ClaimRow, formatClaimWarning } from "@/lib/data/intake-lock-warning"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("manual-cert-claim")

const ACTIVE_AUTO_APPROVAL_STATES = [
  "awaiting_drafts",
  "pending",
  "failed_retrying",
  "attempting",
] as const

type ClaimRpcError = { message?: string } | null

type ClaimResultRow = ClaimRow & {
  success?: boolean | null
}

type ClaimRpcResult = {
  data: ClaimResultRow | ClaimResultRow[] | null
  error: ClaimRpcError
}

type SupabaseManualClaimClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<ClaimRpcResult>
  from: (table: "intakes") => {
    update: (data: Record<string, unknown>) => {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => {
          in: (column: string, values: readonly string[]) => PromiseLike<{ error?: ClaimRpcError }> | unknown
        }
      }
    }
  }
}

type ClaimAttempt = {
  claim: ClaimResultRow | null
  error: ClaimRpcError
}

type ManualCertClaimInput = {
  supabase: SupabaseManualClaimClient
  intakeId: string
  doctorId: string
}

export type ManualCertClaimResult =
  | { success: true; forcedAutoApprovalTakeover: boolean }
  | { success: false; error: string; currentClaimant?: string | null }

function normalizeClaim(data: ClaimRpcResult["data"]): ClaimResultRow | null {
  return Array.isArray(data) ? data[0] ?? null : data
}

function isSystemAutoApprovalClaim(claim: ClaimResultRow | null): boolean {
  return (claim?.current_claimant ?? "").toLowerCase().includes("auto-approve")
}

async function claimIntake(
  supabase: SupabaseManualClaimClient,
  intakeId: string,
  doctorId: string,
  force: boolean,
): Promise<ClaimAttempt> {
  const { data, error } = await supabase.rpc("claim_intake_for_review", {
    p_intake_id: intakeId,
    p_doctor_id: doctorId,
    p_force: force,
  })

  return { claim: normalizeClaim(data), error }
}

async function stopAutoApprovalRetryAfterManualTakeover(
  supabase: SupabaseManualClaimClient,
  intakeId: string,
  doctorId: string,
): Promise<void> {
  const result = await supabase
    .from("intakes")
    .update({
      auto_approval_state: "needs_doctor",
      auto_approval_state_reason: "manual_doctor_override",
      auto_approval_state_updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)
    .eq("claimed_by", doctorId)
    .in("auto_approval_state", ACTIVE_AUTO_APPROVAL_STATES)

  const error = (result as { error?: ClaimRpcError } | undefined)?.error
  if (error) {
    log.warn("Manual certificate approval took over system claim but failed to park auto-approval state", {
      intakeId,
      error: error.message,
    })
  }
}

/**
 * Claim a med-cert intake for manual approval.
 *
 * A real doctor's active claim remains protected. The only forced takeover is
 * the system auto-approval actor, because the staff UI explicitly allows a
 * doctor to continue reviewing while that background check is running.
 */
export async function claimIntakeForManualCertApproval({
  supabase,
  intakeId,
  doctorId,
}: ManualCertClaimInput): Promise<ManualCertClaimResult> {
  const firstAttempt = await claimIntake(supabase, intakeId, doctorId, false)

  if (!firstAttempt.error && firstAttempt.claim?.success) {
    return { success: true, forcedAutoApprovalTakeover: false }
  }

  if (!isSystemAutoApprovalClaim(firstAttempt.claim)) {
    return {
      success: false,
      error: formatClaimWarning(firstAttempt.claim, firstAttempt.error?.message || "Failed to claim intake"),
      currentClaimant: firstAttempt.claim?.current_claimant,
    }
  }

  const takeoverAttempt = await claimIntake(supabase, intakeId, doctorId, true)
  if (takeoverAttempt.error || !takeoverAttempt.claim?.success) {
    return {
      success: false,
      error: formatClaimWarning(takeoverAttempt.claim, takeoverAttempt.error?.message || "Failed to claim intake"),
      currentClaimant: takeoverAttempt.claim?.current_claimant,
    }
  }

  await stopAutoApprovalRetryAfterManualTakeover(supabase, intakeId, doctorId)

  log.info("Manual certificate approval took over system auto-approval claim", { intakeId })
  return { success: true, forcedAutoApprovalTakeover: true }
}
