import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("emergency-flags-cron")

/**
 * Emergency Flag Monitor for Abandoned Intakes
 *
 * Detects intakes that were abandoned after emergency red flags were detected
 * (e.g. patient didn't see the emergency resources message before leaving).
 *
 * Logs to Sentry for clinical monitoring - does NOT send outbound SMS/email.
 * The intake flow itself shows emergency resources (000, Lifeline 13 11 14)
 * inline when red flags are detected.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("emergency-flags")

  try {
    const supabase = createServiceRoleClient()

    // Find abandoned intakes with emergency flags from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: abandonedIntakes, error: fetchError } = await supabase
      .from("intakes")
      .select(`
        id,
        patient_id,
        created_at,
        intake_answers:intake_answers(answers)
      `)
      .is("stripe_payment_intent_id", null) // Not paid
      .eq("status", "draft") // Still in draft
      .gte("created_at", twentyFourHoursAgo) // Within last 24 hours
      .lte("created_at", oneHourAgo) // At least 1 hour old (give time to complete)

    if (fetchError) {
      log.error("Failed to fetch abandoned intakes", { error: fetchError.message })
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!abandonedIntakes || abandonedIntakes.length === 0) {
      return NextResponse.json({ message: "No abandoned intakes with flags found", flagged: 0 })
    }

    let processed = 0
    let flagged = 0

    for (const intake of abandonedIntakes) {
      processed++

      // Check if intake had emergency flags
      const answersArr = intake.intake_answers as { answers: Record<string, unknown> }[] | null
      const answers = answersArr?.[0]?.answers || null
      const hasEmergencyFlag = answers && (
        answers.emergency_symptoms ||
        answers.has_emergency_symptoms === true ||
        answers.red_flags_detected === true
      )

      if (!hasEmergencyFlag) {
        continue
      }

      flagged++

      // Log to Sentry for clinical monitoring
      Sentry.captureMessage("Abandoned intake with emergency flags detected", {
        level: "warning",
        tags: { source: "emergency-flags-cron" },
        extra: { intakeId: intake.id, patientId: intake.patient_id },
      })

      log.warn("Abandoned intake with emergency flags", { intakeId: intake.id })
    }

    return NextResponse.json({
      message: "Emergency flags check completed",
      processed,
      flagged,
    })
  } catch (error) {
    log.error("Emergency flags cron error", { error })
    Sentry.captureException(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
