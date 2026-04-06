import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendViaResend } from "./resend"
import { renderSubscriptionNudgeEmail, subscriptionNudgeSubject } from "@/components/email/templates/subscription-nudge"
import { getAppUrl } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"
import { canSendMarketingEmail } from "@/app/actions/email-preferences"

const logger = createLogger("subscription-nudge")

interface RepeatRxIntake {
  id: string
  patient_id: string
  approved_at: string
  patient: {
    email: string | null
    first_name: string | null
  } | null
}

/**
 * Find repeat prescription intakes approved 29-31 days ago
 * where the patient has no active subscription and hasn't been nudged yet
 */
export async function findSubscriptionNudgeCandidates(): Promise<RepeatRxIntake[]> {
  const supabase = createServiceRoleClient()

  const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      approved_at,
      patient:profiles!patient_id(email, first_name)
    `)
    .in("status", ["approved", "completed"])
    .eq("category", "prescription")
    .eq("subtype", "repeat")
    .is("subscription_nudge_sent_at", null)
    .lte("approved_at", twentyNineDaysAgo)
    .gte("approved_at", thirtyOneDaysAgo)

  if (error) {
    logger.error("Failed to fetch subscription nudge candidates", { error: error.message })
    return []
  }

  const intakes = (data || []).map(item => {
    const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient
    return { ...item, patient: patient ?? null }
  }) as RepeatRxIntake[]

  // Filter out patients who already have an active subscription
  const filtered: RepeatRxIntake[] = []
  for (const intake of intakes) {
    if (!intake.patient_id) continue

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("profile_id", intake.patient_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    if (!sub) {
      filtered.push(intake)
    }
  }

  return filtered
}

/**
 * Send the day-30 subscription nudge email
 */
export async function sendSubscriptionNudgeEmail(intake: RepeatRxIntake): Promise<boolean> {
  const appUrl = getAppUrl()
  const patient = intake.patient

  if (!patient?.email) {
    logger.warn("Skipping subscription nudge - no patient email", { intakeId: intake.id })
    return false
  }

  if (intake.patient_id) {
    const canSend = await canSendMarketingEmail(intake.patient_id)
    if (!canSend) {
      logger.info("Skipping subscription nudge - user opted out", { intakeId: intake.id })
      const supabase = createServiceRoleClient()
      await supabase
        .from("intakes")
        .update({ subscription_nudge_sent_at: new Date().toISOString() })
        .eq("id", intake.id)
      return false
    }
  }

  const patientName = patient.first_name || "there"

  const html = renderSubscriptionNudgeEmail({ patientName, appUrl })
  const unsubscribeUrl = `${appUrl}/patient/settings?unsubscribe=marketing`

  const result = await sendViaResend({
    to: patient.email,
    subject: subscriptionNudgeSubject,
    html,
    tags: [
      { name: "category", value: "subscription_nudge" },
      { name: "intake_id", value: intake.id },
    ],
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  })

  try {
    const supabase = createServiceRoleClient()
    await supabase.from("email_outbox").insert({
      email_type: "subscription_nudge",
      to_email: patient.email,
      intake_id: intake.id,
      patient_id: intake.patient_id,
      subject: subscriptionNudgeSubject,
      status: result.success ? "sent" : "failed",
      provider_message_id: result.id,
      sent_at: result.success ? new Date().toISOString() : null,
      error_message: result.error,
      metadata: { category: "prescription" },
    })
  } catch { /* non-blocking */ }

  if (result.success) {
    const supabase = createServiceRoleClient()
    await supabase
      .from("intakes")
      .update({ subscription_nudge_sent_at: new Date().toISOString() })
      .eq("id", intake.id)

    logger.info("Sent subscription nudge email", { intakeId: intake.id, email: patient.email })
  } else {
    logger.error("Failed to send subscription nudge email", { intakeId: intake.id, error: result.error })
  }

  return result.success
}

/**
 * Process all subscription nudge candidates
 * Called from the daily cron job
 */
export async function processSubscriptionNudges(): Promise<{ sent: number; failed: number }> {
  const candidates = await findSubscriptionNudgeCandidates()

  let sent = 0
  let failed = 0

  for (const intake of candidates) {
    const success = await sendSubscriptionNudgeEmail(intake)
    if (success) { sent++ } else { failed++ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  logger.info("Processed subscription nudges", { sent, failed, total: candidates.length })

  return { sent, failed }
}
