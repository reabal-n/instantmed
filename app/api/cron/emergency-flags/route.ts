import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendSms } from "@/lib/sms/service"
import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"

const log = createLogger("emergency-flags-cron")

/**
 * P1 RF-1: Emergency SMS for Abandoned Intakes with Flags
 * 
 * Per MEDICOLEGAL_AUDIT_REPORT: "If patient abandons after red flag detected 
 * but before seeing the emergency message, no outbound notification occurs."
 * 
 * This cron job finds intakes that:
 * 1. Were abandoned (no payment completed)
 * 2. Had emergency red flags detected
 * 3. Haven't already received an emergency SMS
 * 
 * Sends emergency resources SMS to ensure patient safety.
 */

const EMERGENCY_SMS_TEMPLATE = (patientName: string) =>
  `Hi ${patientName}, we noticed you started a health request but didn't complete it. If you're experiencing a medical emergency, please call 000. For mental health support, call Lifeline 13 11 14. We're here if you need us.`

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    // Find abandoned intakes with emergency flags from the last 24 hours
    // that haven't received an emergency SMS yet
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: abandonedIntakes, error: fetchError } = await supabase
      .from("intakes")
      .select(`
        id,
        patient_id,
        answers,
        created_at,
        profiles:patient_id (
          full_name,
          phone
        )
      `)
      .is("stripe_payment_intent_id", null) // Not paid
      .eq("status", "draft") // Still in draft
      .gte("created_at", twentyFourHoursAgo) // Within last 24 hours
      .lte("created_at", oneHourAgo) // At least 1 hour old (give time to complete)
      .is("emergency_sms_sent_at", null) // Haven't sent SMS yet

    if (fetchError) {
      log.error("Failed to fetch abandoned intakes", { error: fetchError.message })
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!abandonedIntakes || abandonedIntakes.length === 0) {
      return NextResponse.json({ message: "No abandoned intakes with flags found", processed: 0 })
    }

    let processed = 0
    let smsSent = 0

    for (const intake of abandonedIntakes) {
      processed++

      // Check if intake had emergency flags
      const answers = intake.answers as Record<string, unknown> | null
      const hasEmergencyFlag = answers && (
        answers.emergency_symptoms ||
        answers.has_emergency_symptoms === true ||
        answers.red_flags_detected === true
      )

      if (!hasEmergencyFlag) {
        continue // Skip intakes without emergency flags
      }

      // Get patient info - profiles is joined as array, take first
      const profileData = intake.profiles as unknown as { full_name: string | null; phone: string | null }[] | null
      const profile = profileData?.[0] || null
      if (!profile?.phone) {
        log.warn("Abandoned intake with emergency flag has no phone number", { intakeId: intake.id })
        continue
      }

      // Send emergency resources SMS
      const patientName = profile.full_name?.split(" ")[0] || "there"
      const smsResult = await sendSms({
        to: profile.phone,
        message: EMERGENCY_SMS_TEMPLATE(patientName),
        requestId: intake.id,
      })

      if (smsResult.success) {
        smsSent++
        
        // Mark as SMS sent to avoid duplicate sends
        await supabase
          .from("intakes")
          .update({ emergency_sms_sent_at: new Date().toISOString() })
          .eq("id", intake.id)

        log.info("Emergency SMS sent for abandoned intake", { 
          intakeId: intake.id,
          messageId: smsResult.messageId 
        })

        // Alert Sentry for monitoring
        Sentry.captureMessage("Emergency SMS sent for abandoned intake with flags", {
          level: "warning",
          tags: { source: "emergency-flags-cron" },
          extra: { intakeId: intake.id },
        })
      } else {
        log.error("Failed to send emergency SMS", { 
          intakeId: intake.id, 
          error: smsResult.error 
        })
      }
    }

    return NextResponse.json({
      message: "Emergency flags check completed",
      processed,
      smsSent,
    })
  } catch (error) {
    log.error("Emergency flags cron error", { error })
    Sentry.captureException(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
