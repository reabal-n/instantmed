import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest, acquireCronLock, releaseCronLock } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"
import { toError } from "@/lib/errors"
import { canSendMarketingEmail } from "@/app/actions/email-preferences"

const logger = createLogger("cron-repeat-rx-reminders")

/**
 * Cron: Repeat prescription reminders
 * Runs daily at 8am AEST (22:00 UTC previous day)
 *
 * Finds completed repeat-script intakes from ~30 days ago and enqueues
 * a reminder email via the email_outbox (picked up by email-dispatcher cron).
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const lock = await acquireCronLock("repeat-rx-reminders")
  if (!lock.acquired) {
    return NextResponse.json({ sent: 0, skipped: true, message: lock.existingLockAge ? `Lock held for ${lock.existingLockAge}s` : "Lock held by another run" })
  }

  try {
    const supabase = createServiceRoleClient()

    // Find intakes completed 25-35 days ago (prescription cycle window)
    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - 35)
    const to = new Date(now)
    to.setDate(to.getDate() - 25)

    const { data: intakes, error: fetchError } = await supabase
      .from("intakes")
      .select(`
        id,
        category,
        completed_at,
        intake_answers:intake_answers(answers),
        patient:profiles!patient_id (
          id,
          email,
          full_name
        )
      `)
      .in("category", ["prescription", "repeat_script"])
      .eq("status", "completed")
      .gte("completed_at", from.toISOString())
      .lte("completed_at", to.toISOString())
      .limit(100)

    if (fetchError) {
      logger.error("Failed to fetch eligible intakes", {}, new Error(fetchError.message))
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!intakes || intakes.length === 0) {
      return NextResponse.json({ sent: 0, message: "No eligible intakes" })
    }

    let enqueued = 0
    let skipped = 0

    for (const intake of intakes) {
      try {
        // Dedup: check if we already enqueued a reminder for this intake
        const { count } = await supabase
          .from("email_outbox")
          .select("id", { count: "exact", head: true })
          .eq("intake_id", intake.id)
          .eq("email_type", "repeat_rx_reminder")

        if (count && count > 0) {
          skipped++
          continue
        }

        // Get patient email from profile join
        const patientRaw = intake.patient as unknown as { id: string; email: string | null; full_name: string | null }[] | { id: string; email: string | null; full_name: string | null } | null
        const patient = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw
        if (!patient?.email) continue

        // Marketing opt-out check (Spam Act compliance)
        if (patient.id) {
          const canSend = await canSendMarketingEmail(patient.id)
          if (!canSend) {
            skipped++
            continue
          }
        }

        const email = patient.email

        // Extract medication name from intake_answers join
        const answersArr = intake.intake_answers as { answers: Record<string, unknown> }[] | null
        const answers = answersArr?.[0]?.answers || {}
        const medicationName = String(answers.medicationName || answers.medication_name || "medication")

        // Enqueue to outbox - the email-dispatcher cron will render and send
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
        const unsubscribeUrl = `${appUrl}/patient/settings?unsubscribe=marketing`

        const { error: insertError } = await supabase.from("email_outbox").insert({
          email_type: "repeat_rx_reminder",
          to_email: email,
          to_name: patient.full_name,
          subject: `Reminder: Time to renew your ${medicationName} prescription`,
          status: "pending",
          provider: "resend",
          intake_id: intake.id,
          patient_id: patient.id,
          metadata: {
            patientName: patient.full_name || "there",
            medicationName,
            headers: {
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          },
        })

        if (insertError) {
          logger.warn("Failed to enqueue reminder", { intakeId: intake.id, error: insertError.message })
          continue
        }

        enqueued++
      } catch (err) {
        logger.warn("Failed to process reminder for intake", { intakeId: intake.id })
        captureCronError(toError(err), { jobName: "repeat-rx-reminders" })
      }
    }

    logger.info("Repeat Rx reminders complete", { enqueued, skipped, total: intakes.length })
    return NextResponse.json({ enqueued, skipped, total: intakes.length })
  } catch (error) {
    Sentry.captureException(error)
    logger.error("Repeat Rx reminder cron failed", {}, toError(error))
    captureCronError(toError(error), { jobName: "repeat-rx-reminders" })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    await releaseCronLock("repeat-rx-reminders")
  }
}
