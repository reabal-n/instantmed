import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("DoctorSessionTimeout")

// Default timeout: 30 minutes of inactivity
const DEFAULT_TIMEOUT_MINUTES = 30

/**
 * Release intakes that have been claimed but not acted upon
 * This prevents doctors from "hoarding" intakes without reviewing them
 */
export async function releaseStaleClaimsWithLogging(
  timeoutMinutes: number = DEFAULT_TIMEOUT_MINUTES
): Promise<{ released: number; errors: string[] }> {
  const supabase = createServiceRoleClient()
  const errors: string[] = []

  logger.info("Starting stale claim release", { timeoutMinutes })

  // First, get the intakes that will be released (for logging)
  const { data: staleClaims, error: fetchError } = await supabase
    .from("intakes")
    .select("id, claimed_by, claimed_at, status")
    .not("claimed_by", "is", null)
    .lt("claimed_at", new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString())
    .in("status", ["paid", "in_review"])

  if (fetchError) {
    logger.error("Failed to fetch stale claims", {}, fetchError)
    errors.push(fetchError.message)
    return { released: 0, errors }
  }

  if (!staleClaims || staleClaims.length === 0) {
    logger.info("No stale claims to release")
    return { released: 0, errors }
  }

  // Log each stale claim before release
  for (const claim of staleClaims) {
    logger.info("Releasing stale claim", {
      intakeId: claim.id,
      claimedBy: claim.claimed_by,
      claimedAt: claim.claimed_at,
      status: claim.status,
    })

    // Log to audit table
    await supabase.from("audit_logs").insert({
      action: "claim_auto_released",
      request_id: claim.id,
      actor_id: claim.claimed_by,
      metadata: {
        reason: "session_timeout",
        timeout_minutes: timeoutMinutes,
        claimed_at: claim.claimed_at,
      },
    })
  }

  // Use the RPC function to atomically release
  const { data: releasedCount, error: releaseError } = await supabase.rpc(
    "release_stale_intake_claims",
    { p_timeout_minutes: timeoutMinutes }
  )

  if (releaseError) {
    logger.error("Failed to release stale claims", {}, releaseError)
    errors.push(releaseError.message)
    return { released: 0, errors }
  }

  logger.info("Stale claims released", { 
    released: releasedCount, 
    expected: staleClaims.length 
  })

  return { released: releasedCount || 0, errors }
}

/**
 * Get current claim statistics for monitoring
 */
export async function getClaimStatistics(): Promise<{
  activeClaims: number
  staleClaims: number
  warningClaims: number
}> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("v_concurrent_claims")
    .select("claim_status")

  if (error || !data) {
    logger.warn("Failed to get claim statistics", {}, error || undefined)
    return { activeClaims: 0, staleClaims: 0, warningClaims: 0 }
  }

  return {
    activeClaims: data.filter((c) => c.claim_status === "active").length,
    warningClaims: data.filter((c) => c.claim_status === "warning").length,
    staleClaims: data.filter((c) => c.claim_status === "stale").length,
  }
}
