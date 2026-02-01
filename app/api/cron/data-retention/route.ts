import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-data-retention")

/**
 * Data Retention Policy Enforcement
 *
 * Australian health records retention requirements:
 * - Adult records: minimum 7 years from last entry
 * - Minor records: until patient turns 25, or 7 years from last entry (whichever is longer)
 *
 * This cron performs soft-deletion (anonymization) of PHI data that has exceeded
 * the retention period. Hard deletion is a manual admin operation.
 *
 * Runs daily.
 *
 * What gets cleaned:
 * 1. Rate limit records older than 7 days (not PHI, just operational)
 * 2. Expired intake answers for cancelled/expired intakes older than 7 years
 * 3. Audit log of all anonymizations
 */

// 7 years in milliseconds
const RETENTION_YEARS = 7
const RETENTION_MS = RETENTION_YEARS * 365.25 * 24 * 60 * 60 * 1000

// Operational data cleanup (non-PHI)
const RATE_LIMIT_RETENTION_DAYS = 7
const SESSION_DATA_RETENTION_DAYS = 90

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const now = new Date()
    const stats = {
      rate_limits_cleaned: 0,
      sessions_cleaned: 0,
      intakes_anonymized: 0,
      errors: 0,
    }

    // 1. Clean old rate limit records (operational, not PHI)
    const rateLimitCutoff = new Date(now.getTime() - RATE_LIMIT_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const { count: rateLimitCount, error: rlError } = await supabase
      .from("rate_limits")
      .delete({ count: "exact" })
      .lt("window_start", rateLimitCutoff.toISOString())

    if (rlError) {
      logger.warn("Failed to clean rate limits", {}, rlError)
      stats.errors++
    } else {
      stats.rate_limits_cleaned = rateLimitCount || 0
    }

    // 2. Clean old webhook event claims (operational)
    const sessionCutoff = new Date(now.getTime() - SESSION_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const { count: sessionCount, error: sessionError } = await supabase
      .from("webhook_event_claims")
      .delete({ count: "exact" })
      .lt("claimed_at", sessionCutoff.toISOString())

    if (sessionError) {
      // Table may not exist, that's ok
      if (sessionError.code !== "42P01") {
        logger.warn("Failed to clean webhook claims", {}, sessionError)
        stats.errors++
      }
    } else {
      stats.sessions_cleaned = sessionCount || 0
    }

    // 3. Anonymize PHI for expired/cancelled intakes past retention period
    const retentionCutoff = new Date(now.getTime() - RETENTION_MS)

    // Find intakes eligible for anonymization:
    // - Status is terminal (cancelled, expired, completed, declined)
    // - Updated more than 7 years ago
    // - Not already anonymized (client_ip is not null as proxy check)
    const { data: eligibleIntakes, error: findError } = await supabase
      .from("intakes")
      .select("id, patient_id, status, updated_at")
      .in("status", ["cancelled", "expired"])
      .lt("updated_at", retentionCutoff.toISOString())
      .not("client_ip", "is", null)
      .limit(50) // Process in batches

    if (findError) {
      logger.error("Failed to find intakes for anonymization", {}, findError)
      stats.errors++
    } else if (eligibleIntakes && eligibleIntakes.length > 0) {
      for (const intake of eligibleIntakes) {
        // Anonymize: remove IP address and user agent (PHI under Australian law)
        const { error: anonError } = await supabase
          .from("intakes")
          .update({
            client_ip: null,
            client_user_agent: null,
            updated_at: now.toISOString(),
          })
          .eq("id", intake.id)

        if (anonError) {
          logger.warn("Failed to anonymize intake", { intakeId: intake.id }, anonError)
          stats.errors++
        } else {
          stats.intakes_anonymized++

          // Log anonymization in audit trail
          await supabase.from("intake_events").insert({
            intake_id: intake.id,
            event_type: "phi_anonymized",
            actor_id: null,
            actor_type: "system",
            metadata: {
              reason: "data_retention_policy",
              retention_years: RETENTION_YEARS,
              fields_cleared: ["client_ip", "client_user_agent"],
            },
          }).then(({ error }) => {
            if (error) {
              logger.warn("Failed to log anonymization event", { intakeId: intake.id })
            }
          })
        }
      }
    }

    logger.info("Data retention policy executed", stats)

    return NextResponse.json({
      success: true,
      ...stats,
      retention_policy: {
        phi_retention_years: RETENTION_YEARS,
        rate_limit_retention_days: RATE_LIMIT_RETENTION_DAYS,
        session_retention_days: SESSION_DATA_RETENTION_DAYS,
      },
      checked_at: now.toISOString(),
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error("Data retention policy failed", { error: err.message })
    captureCronError(err, { jobName: "data-retention" })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
