import { NextRequest, NextResponse } from "next/server"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { getFeatureFlags } from "@/lib/feature-flags"

const logger = createLogger("cron-retry-auto-approval")

/**
 * GET /api/cron/retry-auto-approval
 *
 * Picks up med cert intakes that were paid but not auto-approved
 * (e.g. because the webhook timed out, draft gen was slow, or a transient error).
 * Runs every 3 minutes. Only processes intakes 3-30 minutes old to avoid
 * racing with the webhook's own attempt.
 *
 * Required env: CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  // Quick bail if feature flag is off
  const flags = await getFeatureFlags()
  if (!flags.ai_auto_approve_enabled) {
    return NextResponse.json({ skipped: true, reason: "Auto-approval disabled" })
  }

  const supabase = createServiceRoleClient()

  try {
    // Find med cert intakes that are:
    // - status = 'paid' (not yet approved)
    // - unclaimed (no doctor or system has claimed them)
    // - have AI drafts (document_drafts with is_ai_generated = true)
    // - paid 3-30 minutes ago (avoid racing with webhook, don't pick up ancient ones)
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString()
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const { data: eligibleIntakes, error: fetchError } = await supabase
      .from("intakes")
      .select(`
        id,
        service:services!service_id(type),
        ai_approved
      `)
      .eq("status", "paid")
      .is("claimed_by", null)
      .eq("ai_approved", false)
      .lt("paid_at", threeMinAgo)
      .gt("paid_at", thirtyMinAgo)
      .order("paid_at", { ascending: true })
      .limit(5)

    if (fetchError) {
      logger.error("Failed to fetch eligible intakes", { error: fetchError.message })
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!eligibleIntakes || eligibleIntakes.length === 0) {
      return NextResponse.json({ processed: 0, reason: "No eligible intakes" })
    }

    // Filter to med certs only
    const medCertIntakes = eligibleIntakes.filter((intake) => {
      const serviceRaw = intake.service as unknown
      const service = (Array.isArray(serviceRaw) ? serviceRaw[0] : serviceRaw) as { type: string } | null
      return service?.type === "med_certs"
    })

    if (medCertIntakes.length === 0) {
      return NextResponse.json({ processed: 0, reason: "No med cert intakes in window" })
    }

    // Dynamically import to avoid cold start cost when no work to do
    const { attemptAutoApproval } = await import("@/lib/clinical/auto-approval-pipeline")

    let approved = 0
    let skipped = 0
    let failed = 0

    for (const intake of medCertIntakes) {
      try {
        const result = await attemptAutoApproval(intake.id)
        if (result.autoApproved) {
          approved++
          logger.info("Retry auto-approval succeeded", {
            intakeId: intake.id,
            certificateId: result.certificateId,
          })
        } else {
          skipped++
          logger.info("Retry auto-approval skipped", {
            intakeId: intake.id,
            reason: result.reason,
          })
        }
      } catch (err) {
        failed++
        logger.warn("Retry auto-approval error", {
          intakeId: intake.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    logger.info("Retry auto-approval cron complete", {
      total: medCertIntakes.length,
      approved,
      skipped,
      failed,
    })

    return NextResponse.json({
      processed: medCertIntakes.length,
      approved,
      skipped,
      failed,
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    captureCronError(err, { jobName: "retry-auto-approval" })
    logger.error("Unexpected error in retry-auto-approval cron", { error: err.message })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
