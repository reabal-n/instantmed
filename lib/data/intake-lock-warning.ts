/**
 * Shared formatter for claim-error messages returned by the Postgres
 * `claim_intake_for_review` RPC.
 *
 * The SQL function builds its `error_message` from `current_claimant` +
 * minutes since `review_started_at`. When the System (Auto-Approve) cron
 * holds the claim, the minutes value is unavailable, leaving an empty
 * `( minutes remaining)` parenthesis on screen.
 *
 * Any caller of the RPC must run the raw error through `formatClaimWarning`
 * so operators see a clear "auto-approval check is running" message instead
 * of the broken template. Used by `acquireIntakeLock` and by
 * `executeCertApproval` on its direct claim path.
 */

const BROKEN_MINUTES_TEMPLATE = /\(\s*minutes remaining\s*\)/

export interface ClaimRow {
  error_message?: string | null
  current_claimant?: string | null
}

const DEFAULT_FALLBACK = "This case could not be claimed for review."

const SYSTEM_AUTO_APPROVE_MESSAGE =
  "Auto-approval check is running on this case. You can still review and act if needed."

/**
 * Returns the operator-facing warning string for a failed claim attempt.
 * When the System (Auto-Approve) actor holds the claim with the broken
 * minutes template, returns a hand-written status string instead.
 */
export function formatClaimWarning(claim: ClaimRow | null | undefined, fallback: string = DEFAULT_FALLBACK): string {
  const errorMessage = claim?.error_message ?? ""
  const claimantName = (claim?.current_claimant ?? "").toLowerCase()
  const isSystemClaim = claimantName.includes("auto-approve")
  const hasBrokenMinutesTemplate = BROKEN_MINUTES_TEMPLATE.test(errorMessage)

  if (isSystemClaim && hasBrokenMinutesTemplate) {
    return SYSTEM_AUTO_APPROVE_MESSAGE
  }

  return errorMessage || fallback
}
