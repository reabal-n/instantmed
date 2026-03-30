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
 * Picks up med cert intakes that were paid but not auto-approved
 * (e.g. because the webhook timed out, draft gen was slow, or a transient error).
 * Runs every 3 minutes. Only processes intakes 2-30 minutes old to avoid
 * racing with the webhook's own attempt.
 *
 * If AI drafts are missing (e.g. webhook was killed before generating them),
 * this cron will generate them first, then attempt auto-approval.
 *
 * Required env: CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("retry-auto-approval")

  // Quick bail if feature flag is off
  const flags = await getFeatureFlags()
  if (!flags.ai_auto_approve_enabled) {
    return NextResponse.json({ skipped: true, reason: "Auto-approval disabled" })
  }

  const supabase = createServiceRoleClient()

  try {
    // -----------------------------------------------------------------------
    // Send "still reviewing" emails for intakes 45+ min old without one sent
    // -----------------------------------------------------------------------
    const fortyFiveMinAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString()
    const { data: followUpCandidates } = await supabase
      .from("intakes")
      .select(`
        id, patient_id, category, subtype,
        patient:profiles!patient_id(full_name, email)
      `)
      .eq("status", "paid")
      .is("follow_up_sent_at", null)
      .lt("paid_at", fortyFiveMinAgo)
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

    // -----------------------------------------------------------------------
    // Auto-approval: find med cert intakes eligible for AI review
    // -----------------------------------------------------------------------
    // - status = 'paid' (not yet approved)
    // - unclaimed (no doctor or system has claimed them)
    // - paid after configurable delay (admin setting) to 60 minutes ago
    const delayMinutes = Math.max(1, flags.auto_approve_delay_minutes)
    const delayAgo = new Date(Date.now() - delayMinutes * 60 * 1000).toISOString()
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

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
      .eq("auto_approval_skipped", false)
      .lt("paid_at", delayAgo)
      .gt("paid_at", sixtyMinAgo)
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
    const { generateDraftsForIntake } = await import("@/app/actions/generate-drafts")

    let approved = 0
    let skipped = 0
    let failed = 0
    let draftsGenerated = 0

    for (const intake of medCertIntakes) {
      try {
        // Check if AI drafts exist — if not, generate them first
        const { data: existingDrafts } = await supabase
          .from("document_drafts")
          .select("id")
          .eq("intake_id", intake.id)
          .eq("is_ai_generated", true)
          .limit(1)

        if (!existingDrafts || existingDrafts.length === 0) {
          logger.info("No AI drafts found, generating before auto-approval", { intakeId: intake.id })
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
      draftsGenerated,
    })

    return NextResponse.json({
      processed: medCertIntakes.length,
      approved,
      skipped,
      failed,
      draftsGenerated,
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = error instanceof Error ? error : new Error(String(error))
    captureCronError(err, { jobName: "retry-auto-approval" })
    logger.error("Unexpected error in retry-auto-approval cron", { error: err.message })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
