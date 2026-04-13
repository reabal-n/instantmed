import "server-only"

import * as React from "react"

import { getAppUrl } from "@/lib/config/env"
import { FollowUpReminderEmail, followUpReminderSubject } from "@/lib/email/components/templates/follow-up-reminder"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { sendEmail } from "./send-email"

const logger = createLogger("follow-up-reminder")

interface ApprovedMedCertIntake {
  id: string
  patient_id: string
  approved_at: string
  patient: {
    email: string | null
    first_name: string | null
    last_name: string | null
  } | null
}

/**
 * Find med-cert intakes approved 72–96 hours ago that haven't had a follow-up sent
 */
export async function findFollowUpCandidates(): Promise<ApprovedMedCertIntake[]> {
  const supabase = createServiceRoleClient()

  const FOLLOW_UP_WINDOW_CLOSE_HOURS = 72  // min hours after approval
  const FOLLOW_UP_WINDOW_OPEN_HOURS = 96   // max hours after approval

  const windowCloseAt = new Date(Date.now() - FOLLOW_UP_WINDOW_CLOSE_HOURS * 60 * 60 * 1000).toISOString()
  const windowOpenAt = new Date(Date.now() - FOLLOW_UP_WINDOW_OPEN_HOURS * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      approved_at,
      patient:profiles!patient_id(email, first_name, last_name)
    `)
    .in("status", ["approved", "completed"])
    .eq("category", "medical_certificate")
    .is("follow_up_sent_at", null)
    .lte("approved_at", windowCloseAt)
    .gte("approved_at", windowOpenAt)

  if (error) {
    logger.error("Failed to fetch follow-up candidates", { error: error.message })
    return []
  }

  return (data || []).map(item => {
    const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient
    return { ...item, patient: patient ?? null }
  }) as ApprovedMedCertIntake[]
}

/**
 * Send the day-3 follow-up email for a single intake
 */
export async function sendFollowUpReminderEmail(intake: ApprovedMedCertIntake): Promise<boolean> {
  const appUrl = getAppUrl()
  const patient = intake.patient

  if (!patient?.email) {
    logger.warn("Skipping follow-up email - no patient email", { intakeId: intake.id })
    return false
  }

  // Respect marketing opt-out - check only marketing_emails (not abandoned_checkout_emails)
  if (intake.patient_id) {
    const supabase = createServiceRoleClient()
    const { data: prefs } = await supabase
      .from("email_preferences")
      .select("marketing_emails")
      .eq("profile_id", intake.patient_id)
      .single()

    const canSend = prefs?.marketing_emails !== false  // default allow if no prefs record
    if (!canSend) {
      logger.info("Skipping follow-up email - user opted out", { intakeId: intake.id })
      // Mark as sent so we don't keep checking on every cron run
      await supabase
        .from("intakes")
        .update({ follow_up_sent_at: new Date().toISOString() })
        .eq("id", intake.id)
      return false
    }
  }

  const firstName = patient.first_name || ""
  const lastName = patient.last_name || ""
  const patientName = [firstName, lastName].filter(Boolean).join(" ") || "there"

  const result = await sendEmail({
    to: patient.email,
    subject: followUpReminderSubject,
    template: React.createElement(FollowUpReminderEmail, { patientName, appUrl }),
    emailType: "follow_up_reminder",
    intakeId: intake.id,
    patientId: intake.patient_id,
    tags: [
      { name: "category", value: "follow_up_reminder" },
      { name: "intake_id", value: intake.id },
    ],
  })

  if (result.success) {
    const supabase = createServiceRoleClient()
    await supabase
      .from("intakes")
      .update({ follow_up_sent_at: new Date().toISOString() })
      .eq("id", intake.id)

    logger.info("Sent follow-up reminder email", { intakeId: intake.id, email: patient.email })
  } else {
    logger.error("Failed to send follow-up reminder email", { intakeId: intake.id, error: result.error })
  }

  return result.success
}

/**
 * Process all follow-up reminder candidates
 * Called from the daily cron job
 */
export async function processFollowUpReminders(): Promise<{ sent: number; failed: number; skipped?: boolean }> {
  const candidates = await findFollowUpCandidates()

  let sent = 0
  let failed = 0

  for (const intake of candidates) {
    const success = await sendFollowUpReminderEmail(intake)
    if (success) {
      sent++
    } else {
      failed++
    }

    // Small delay to avoid Resend rate limits
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  logger.info("Processed follow-up reminders", { sent, failed, total: candidates.length })

  return { sent, failed }
}
