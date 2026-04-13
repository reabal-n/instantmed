import "server-only"

import * as React from "react"

import { getAppUrl } from "@/lib/config/env"
import { ReviewFollowupEmail,reviewFollowupSubject } from "@/lib/email/components/templates/review-followup"
import { ReviewRequestEmail,reviewRequestSubject } from "@/lib/email/components/templates/review-request"
import { canSendMarketingEmail } from "@/lib/email/preferences"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { sendEmail } from "./send-email"

const logger = createLogger("review-request")

interface ApprovedIntake {
  id: string
  patient_id: string
  category: string | null
  approved_at: string
  patient: {
    email: string | null
    first_name: string | null
  } | null
}

const SERVICE_NAMES: Record<string, string> = {
  medical_certificate: "Medical Certificate",
  prescription: "Repeat Prescription",
  consult: "GP Consult",
}

/**
 * Find approved intakes 48-72 hours old that haven't had a review email sent
 */
export async function findReviewRequestCandidates(): Promise<ApprovedIntake[]> {
  const supabase = createServiceRoleClient()

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      category,
      approved_at,
      patient:profiles!patient_id(email, first_name, email_bounced)
    `)
    .in("status", ["approved", "completed"])
    .is("review_email_sent_at", null)
    .lte("approved_at", fortyEightHoursAgo)
    .gte("approved_at", seventyTwoHoursAgo)

  if (error) {
    logger.error("Failed to fetch review request candidates", { error: error.message })
    return []
  }

  return (data || []).map(item => {
    const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient
    return { ...item, patient: patient ?? null }
  }).filter(item => !item.patient || !(item.patient as Record<string, unknown>).email_bounced) as ApprovedIntake[]
}

/**
 * Find approved intakes 7-8 days old that received the day-2 email but not the day-7 followup
 */
export async function findReviewFollowupCandidates(): Promise<ApprovedIntake[]> {
  const supabase = createServiceRoleClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      category,
      approved_at,
      patient:profiles!patient_id(email, first_name, email_bounced)
    `)
    .in("status", ["approved", "completed"])
    .not("review_email_sent_at", "is", null)
    .is("review_followup_sent_at", null)
    .lte("approved_at", sevenDaysAgo)
    .gte("approved_at", eightDaysAgo)

  if (error) {
    logger.error("Failed to fetch review followup candidates", { error: error.message })
    return []
  }

  return (data || []).map(item => {
    const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient
    return { ...item, patient: patient ?? null }
  }).filter(item => !item.patient || !(item.patient as Record<string, unknown>).email_bounced) as ApprovedIntake[]
}

/**
 * Send the day-2 review request email via the centralized sendEmail system
 */
export async function sendReviewRequestEmail(intake: ApprovedIntake): Promise<boolean> {
  const appUrl = getAppUrl()
  const patient = intake.patient

  if (!patient?.email) {
    logger.warn("Skipping review request email - no patient email", { intakeId: intake.id })
    return false
  }

  if (intake.patient_id) {
    const canSend = await canSendMarketingEmail(intake.patient_id)
    if (!canSend) {
      logger.info("Skipping review request email - user opted out", { intakeId: intake.id })
      // Mark as sent so we don't keep checking
      const supabase = createServiceRoleClient()
      await supabase
        .from("intakes")
        .update({ review_email_sent_at: new Date().toISOString() })
        .eq("id", intake.id)
      return false
    }
  }

  const patientName = patient.first_name || "there"
  const serviceName = SERVICE_NAMES[intake.category || ""] || "your request"
  const result = await sendEmail({
    to: patient.email,
    subject: reviewRequestSubject,
    template: React.createElement(ReviewRequestEmail, { patientName, serviceName, appUrl }),
    emailType: "review_request" as import("./send-email").EmailType,
    intakeId: intake.id,
    patientId: intake.patient_id,
    metadata: { category: intake.category },
    tags: [
      { name: "category", value: "review_request" },
      { name: "intake_id", value: intake.id },
    ],
  })

  if (result.success) {
    const supabase = createServiceRoleClient()
    await supabase
      .from("intakes")
      .update({ review_email_sent_at: new Date().toISOString() })
      .eq("id", intake.id)

    logger.info("Sent review request email", { intakeId: intake.id, email: patient.email })
  } else {
    logger.error("Failed to send review request email", { intakeId: intake.id, error: result.error })
  }

  return result.success
}

/**
 * Send the day-7 review followup email via the centralized sendEmail system
 */
export async function sendReviewFollowupEmail(intake: ApprovedIntake): Promise<boolean> {
  const appUrl = getAppUrl()
  const patient = intake.patient

  if (!patient?.email) {
    logger.warn("Skipping review followup email - no patient email", { intakeId: intake.id })
    return false
  }

  if (intake.patient_id) {
    const canSend = await canSendMarketingEmail(intake.patient_id)
    if (!canSend) {
      logger.info("Skipping review followup email - user opted out", { intakeId: intake.id })
      const supabase = createServiceRoleClient()
      await supabase
        .from("intakes")
        .update({ review_followup_sent_at: new Date().toISOString() })
        .eq("id", intake.id)
      return false
    }
  }

  const patientName = patient.first_name || "there"
  const result = await sendEmail({
    to: patient.email,
    subject: reviewFollowupSubject,
    template: React.createElement(ReviewFollowupEmail, { patientName, appUrl }),
    emailType: "review_followup" as import("./send-email").EmailType,
    intakeId: intake.id,
    patientId: intake.patient_id,
    metadata: { category: intake.category },
    tags: [
      { name: "category", value: "review_followup" },
      { name: "intake_id", value: intake.id },
    ],
  })

  if (result.success) {
    const supabase = createServiceRoleClient()
    await supabase
      .from("intakes")
      .update({ review_followup_sent_at: new Date().toISOString() })
      .eq("id", intake.id)

    logger.info("Sent review followup email", { intakeId: intake.id, email: patient.email })
  } else {
    logger.error("Failed to send review followup email", { intakeId: intake.id, error: result.error })
  }

  return result.success
}

/**
 * Process all review request and followup emails
 * Called from the daily cron job
 */
export async function processReviewRequests(): Promise<{
  requestSent: number
  requestFailed: number
  followupSent: number
  followupFailed: number
}> {
  // Day-2 review requests
  const requestCandidates = await findReviewRequestCandidates()
  let requestSent = 0
  let requestFailed = 0

  for (const intake of requestCandidates) {
    const success = await sendReviewRequestEmail(intake)
    if (success) { requestSent++ } else { requestFailed++ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Day-7 review followups
  const followupCandidates = await findReviewFollowupCandidates()
  let followupSent = 0
  let followupFailed = 0

  for (const intake of followupCandidates) {
    const success = await sendReviewFollowupEmail(intake)
    if (success) { followupSent++ } else { followupFailed++ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  logger.info("Processed review requests", {
    requestSent, requestFailed, followupSent, followupFailed,
    total: requestCandidates.length + followupCandidates.length,
  })

  return { requestSent, requestFailed, followupSent, followupFailed }
}
