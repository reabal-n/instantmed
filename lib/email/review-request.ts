import "server-only"

import * as React from "react"

import { getAppUrl } from "@/lib/config/env"
import { signHeardAboutUsToken } from "@/lib/crypto/heard-about-us-token"
import { SEEDED_E2E_PATIENT_PROFILE_ID } from "@/lib/data/seeded-e2e-data"
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
  // Best-effort: skip the attribution links if the signing secret is unset
  // rather than failing the whole review email.
  let heardToken: string | undefined
  try {
    heardToken = signHeardAboutUsToken(intake.id)
  } catch {
    heardToken = undefined
  }
  const result = await sendEmail({
    to: patient.email,
    subject: reviewRequestSubject,
    template: React.createElement(ReviewRequestEmail, {
      patientName,
      serviceName,
      appUrl,
      intakeId: intake.id,
      heardToken,
    }),
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
 * Process all review request emails.
 * Called from the daily cron job
 */
export async function processReviewRequests(): Promise<{
  requestSent: number
  requestFailed: number
}> {
  const requestCandidates = await findReviewRequestCandidates()
  let requestSent = 0
  let requestFailed = 0

  for (const intake of requestCandidates) {
    const success = await sendReviewRequestEmail(intake)
    if (success) { requestSent++ } else { requestFailed++ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  logger.info("Processed review requests", {
    requestSent,
    requestFailed,
    total: requestCandidates.length,
  })

  return { requestSent, requestFailed }
}

/**
 * One-time / catch-up backfill: approved or completed intakes that NEVER got a
 * review email (fell outside the daily cron's 48-72h window, or predate it).
 * Same satisfied-outcome filter as the cron, but no upper time bound — only a
 * recency floor. Reuses sendReviewRequestEmail, so each send is marketing-
 * consent gated, deduped via review_email_sent_at (won't double-send with the
 * cron), and points at the current rotating review surface (ProductReview).
 */
export async function findReviewRequestBackfillCandidates(
  opts: { sinceDays?: number; limit?: number } = {},
): Promise<ApprovedIntake[]> {
  const supabase = createServiceRoleClient()
  const sinceDays = opts.sinceDays ?? 120
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()

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
    .gte("approved_at", since)
    .not("patient_id", "is", null)
    .neq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)
    .order("approved_at", { ascending: false })

  if (error) {
    logger.error("Failed to fetch review backfill candidates", { error: error.message })
    return []
  }

  const rows = (data || [])
    .map((item) => {
      const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient
      return { ...item, patient: patient ?? null }
    })
    .filter((item) => item.patient?.email && !(item.patient as Record<string, unknown>).email_bounced) as ApprovedIntake[]

  return typeof opts.limit === "number" ? rows.slice(0, opts.limit) : rows
}

/**
 * Process the review backfill. dryRun returns the candidate count without
 * sending; pass limit to stage a partial first send.
 */
export async function processReviewRequestBackfill(
  opts: { sinceDays?: number; limit?: number; dryRun?: boolean } = {},
): Promise<{ candidates: number; sent: number; failed: number; dryRun: boolean }> {
  const candidates = await findReviewRequestBackfillCandidates({
    sinceDays: opts.sinceDays,
    limit: opts.limit,
  })

  if (opts.dryRun) {
    return { candidates: candidates.length, sent: 0, failed: 0, dryRun: true }
  }

  let sent = 0
  let failed = 0
  for (const intake of candidates) {
    const ok = await sendReviewRequestEmail(intake)
    if (ok) sent++
    else failed++
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  logger.info("Processed review backfill", { sent, failed, candidates: candidates.length })
  return { candidates: candidates.length, sent, failed, dryRun: false }
}
