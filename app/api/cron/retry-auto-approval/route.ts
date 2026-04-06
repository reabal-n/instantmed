import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { getFeatureFlags } from "@/lib/feature-flags"

const logger = createLogger("cron-retry-auto-approval")

function formatRequestType(category: string | null, subtype: string | null): string {
  if (category === "medical_certificate") return "medical certificate"
  if (category === "prescription") return "prescription"
  if (category === "consult") return "general consultation"
  if (category === "referral") {
    if (subtype === "imaging") return "imaging referral"
    if (subtype === "pathology") return "pathology referral"
    return "referral"
  }
  return "request"
}

/**
 * GET /api/cron/retry-auto-approval
 *
 * Picks up med cert intakes that were paid but not AI-reviewed
 * (e.g. because the webhook timed out, draft gen was slow, or a transient error).
 * Runs every 3 minutes. Only processes intakes 2-30 minutes old to avoid
 * racing with the webhook's own attempt.
 *
 * If AI drafts are missing (e.g. webhook was killed before generating them),
 * this cron will generate them first, then attempt AI review.
 *
 * Required env: CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("retry-auto-approval")

  const supabase = createServiceRoleClient()

  // -----------------------------------------------------------------------
  // Send "still reviewing" emails — runs regardless of auto-approval flag
  // -----------------------------------------------------------------------
  try {
    const fortyFiveMinAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString()
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    const { data: followUpCandidates } = await supabase
      .from("intakes")
      .select(`
        id, patient_id, category, subtype,
        patient:profiles!patient_id(full_name, email)
      `)
      .eq("status", "paid")
      .is("follow_up_sent_at", null)
      .lt("paid_at", fortyFiveMinAgo)
      .gt("paid_at", fourHoursAgo)
      .not("patient_id", "is", null)
      .limit(20)

    if (followUpCandidates && followUpCandidates.length > 0) {
      const [{ sendEmail }, { StillReviewingEmail, stillReviewingSubject }, React] =
        await Promise.all([
          import("@/lib/email/send-email"),
          import("@/components/email/templates/still-reviewing"),
          import("react"),
        ])

      await Promise.allSettled(
        followUpCandidates.map(async (intake) => {
          const patientRaw = intake.patient as
            | { full_name: string; email: string }[]
            | { full_name: string; email: string }
            | null
          const patient = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw
          if (!patient?.email) return

          const requestType = formatRequestType(
            intake.category as string | null,
            intake.subtype as string | null,
          )

          try {
            await sendEmail({
              to: patient.email,
              toName: patient.full_name || undefined,
              subject: stillReviewingSubject(requestType),
              template: React.createElement(StillReviewingEmail, {
                patientName: patient.full_name || "there",
                requestType,
                requestId: intake.id,
              }),
              emailType: "still_reviewing",
              intakeId: intake.id,
              patientId: intake.patient_id ?? undefined,
            })
            // Mark sent so we don't send twice
            await supabase
              .from("intakes")
              .update({ follow_up_sent_at: new Date().toISOString() })
              .eq("id", intake.id)
          } catch (err) {
            logger.error(
              "Failed to send still-reviewing email",
              { intakeId: intake.id },
              err as Error,
            )
          }
        }),
      )
    }
  } catch (followUpError) {
    logger.error("Error in still-reviewing follow-up block", {}, followUpError as Error)
    // Don't return early — AI review should still run
  }

  // Quick bail if feature flag is off
  const flags = await getFeatureFlags()
  if (!flags.ai_auto_approve_enabled) {
    logger.warn(
      "AI review feature flag is OFF — skipping all AI review processing. " +
      "Enable via admin dashboard (feature_flags.ai_auto_approve_enabled) or DB.",
    )
    return NextResponse.json({ skipped: true, reason: "AI review disabled via feature flag" })
  }

  try {
    // -----------------------------------------------------------------------
    // AI review: find intakes eligible for processing via state machine
    // -----------------------------------------------------------------------
    const delayMinutes = Math.max(1, flags.auto_approve_delay_minutes)
    const delayAgo = new Date(Date.now() - delayMinutes * 60 * 1000).toISOString()
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()

    const { data: eligibleIntakes, error: fetchError } = await supabase
      .from("intakes")
      .select("id, auto_approval_state, auto_approval_attempts, auto_approval_state_updated_at")
      .in("auto_approval_state", ["pending", "failed_retrying"])
      .lt("paid_at", delayAgo)
      .gt("paid_at", eightHoursAgo)
      .order("paid_at", { ascending: true })
      .limit(5)

    if (fetchError) {
      logger.error("Failed to fetch eligible intakes", { error: fetchError.message })
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Timeout recovery: rescue intakes stuck in "attempting" for > 10 minutes
    let recovered = 0
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: stuckIntakes } = await supabase
      .from("intakes")
      .select("id")
      .eq("auto_approval_state", "attempting")
      .lt("auto_approval_state_updated_at", tenMinutesAgo)
      .limit(5)

    if (stuckIntakes && stuckIntakes.length > 0) {
      const { recoverStale } = await import("@/lib/clinical/auto-approval-state")
      for (const stuck of stuckIntakes) {
        await recoverStale(supabase, stuck.id)
        recovered++
      }
    }

    // Recovery: intakes stuck in "awaiting_drafts" for > 10 minutes
    // (after() callback killed before draft generation completed, AND draft retry queue failed)
    const { data: stuckDrafts } = await supabase
      .from("intakes")
      .select("id")
      .eq("auto_approval_state", "awaiting_drafts")
      .lt("auto_approval_state_updated_at", tenMinutesAgo)
      .limit(5)

    if (stuckDrafts && stuckDrafts.length > 0) {
      const { generateDraftsForIntake: genDrafts } = await import("@/app/actions/generate-drafts")
      const { markDraftsReady } = await import("@/lib/clinical/auto-approval-state")
      for (const stuck of stuckDrafts) {
        try {
          const draftResult = await genDrafts(stuck.id)
          if (draftResult.success) {
            await markDraftsReady(supabase, stuck.id)
            recovered++
          }
        } catch (err) {
          logger.warn("Failed to recover awaiting_drafts intake", {
            intakeId: stuck.id,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    if (!eligibleIntakes || eligibleIntakes.length === 0) {
      return NextResponse.json({ processed: 0, recovered, reason: "No eligible intakes" })
    }

    // Dynamically import to avoid cold start cost when no work to do
    const { attemptAutoApproval } = await import("@/lib/clinical/auto-approval-pipeline")
    const { generateDraftsForIntake } = await import("@/app/actions/generate-drafts")

    let approved = 0
    let skipped = 0
    let failed = 0
    let draftsGenerated = 0

    for (const intake of eligibleIntakes) {
      try {
        // Check if AI drafts exist — if not, generate them first
        const { data: existingDrafts } = await supabase
          .from("document_drafts")
          .select("id")
          .eq("intake_id", intake.id)
          .eq("is_ai_generated", true)
          .limit(1)

        if (!existingDrafts || existingDrafts.length === 0) {
          logger.info("No AI drafts found, generating before AI review", { intakeId: intake.id })
          const draftResult = await generateDraftsForIntake(intake.id)
          if (!draftResult.success) {
            logger.warn("Draft generation failed in retry cron", {
              intakeId: intake.id,
              error: draftResult.error,
            })
            failed++
            continue
          }
          draftsGenerated++
        }

        // AI review handles claiming via state machine internally
        const result = await attemptAutoApproval(intake.id)
        if (result.autoApproved) {
          approved++
          logger.info("Retry AI review succeeded", {
            intakeId: intake.id,
            certificateId: result.certificateId,
          })
        } else {
          skipped++
          logger.info("Retry AI review skipped", {
            intakeId: intake.id,
            reason: result.reason,
          })
        }
      } catch (err) {
        failed++
        logger.warn("Retry AI review error", {
          intakeId: intake.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
      // No finally block needed — state machine handles failure states
    }

    // Check for intakes that recently hit needs_doctor via max retries
    const { data: maxedOut } = await supabase
      .from("intakes")
      .select("id")
      .eq("auto_approval_state", "needs_doctor")
      .like("auto_approval_state_reason", "max_retries%")
      .gt("auto_approval_state_updated_at", eightHoursAgo)
      .limit(10)

    if (maxedOut && maxedOut.length > 0) {
      const ids = maxedOut.map(i => i.id.slice(0, 8)).join(", ")
      Sentry.captureMessage(`${maxedOut.length} intake(s) hit AI review retry cap`, {
        level: "warning",
        tags: { subsystem: "cert-pipeline" },
        extra: { intakeIds: maxedOut.map(i => i.id) },
      })
      logger.warn("Intakes hit AI review retry cap — in doctor queue", {
        count: maxedOut.length,
        intakeIds: ids,
      })
    }

    logger.info("Retry AI review cron complete", {
      total: eligibleIntakes.length,
      approved,
      skipped,
      failed,
      draftsGenerated,
      recovered,
    })

    return NextResponse.json({
      processed: eligibleIntakes.length,
      approved,
      skipped,
      failed,
      draftsGenerated,
      recovered,
      maxedOut: maxedOut?.length ?? 0,
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = error instanceof Error ? error : new Error(String(error))
    captureCronError(err, { jobName: "retry-auto-approval" })
    logger.error("Unexpected error in retry AI review cron", { error: err.message })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
