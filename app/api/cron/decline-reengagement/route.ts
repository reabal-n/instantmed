import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { sendDeclineReengagementEmail } from "@/lib/email/senders"
import { canSendMarketingEmail } from "@/app/actions/email-preferences"

const logger = createLogger("cron-decline-reengagement")

const CATEGORY_LABELS: Record<string, string> = {
  medical_certificate: "medical certificate",
  prescription: "prescription",
  consult: "consultation",
}

/**
 * Cron: Decline re-engagement emails
 * Runs hourly - finds intakes declined ~2h ago that haven't received this email yet.
 *
 * Schedule: every hour (vercel.json)
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const supabase = createServiceRoleClient()

  // Find intakes declined between 2–3 hours ago (window prevents re-sending)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

  const { data: declinedIntakes, error } = await supabase
    .from("intakes")
    .select(`
      id,
      category,
      patient_id,
      patient:profiles!patient_id (id, full_name, email, auth_user_id)
    `)
    .eq("status", "declined")
    .gte("declined_at", threeHoursAgo)
    .lte("declined_at", twoHoursAgo)
    .limit(50)

  if (error) {
    logger.error("Failed to query declined intakes", {}, error)
    return NextResponse.json({ error: "Query failed" }, { status: 500 })
  }

  if (!declinedIntakes?.length) {
    return NextResponse.json({ sent: 0, message: "No eligible intakes" })
  }

  // Check which intakes already have a re-engagement email in the email log
  const intakeIds = declinedIntakes.map((i) => i.id)
  const { data: alreadySent } = await supabase
    .from("email_log")
    .select("intake_id")
    .in("intake_id", intakeIds)
    .eq("email_type", "decline_reengagement")

  const sentSet = new Set((alreadySent || []).map((r) => r.intake_id))

  let sent = 0
  let skipped = 0

  for (const intake of declinedIntakes) {
    if (sentSet.has(intake.id)) {
      skipped++
      continue
    }

    const patient = Array.isArray(intake.patient) ? intake.patient[0] : intake.patient
    if (!patient?.email || !patient?.full_name) {
      skipped++
      continue
    }

    // Check email preferences
    const canSend = await canSendMarketingEmail(patient.id)
    if (!canSend) {
      skipped++
      continue
    }

    try {
      await sendDeclineReengagementEmail({
        to: patient.email,
        patientName: patient.full_name,
        patientId: patient.id,
        intakeId: intake.id,
        declinedService: CATEGORY_LABELS[intake.category || ""] || "request",
      })
      sent++
    } catch (err) {
      logger.error("Failed to send decline reengagement email", { intakeId: intake.id },
        err instanceof Error ? err : undefined)
    }
  }

  logger.info("Decline reengagement cron complete", { sent, skipped, total: declinedIntakes.length })
  return NextResponse.json({ sent, skipped, total: declinedIntakes.length })
}
