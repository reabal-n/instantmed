"use server"

import * as Sentry from "@sentry/nextjs"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendEmail } from "@/lib/email/send-email"
import { getAppUrl } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"
import { isEmailSuppressed } from "@/lib/email/utils"
import { PRICING } from "@/lib/constants"
import { signExitIntentToken } from "@/lib/crypto/exit-intent-token"
import { getPostHogClient } from "@/lib/posthog-server"
import {
  ExitIntentSocialProofEmail,
  exitIntentSocialProofSubject,
} from "@/components/email/templates/exit-intent-social-proof"
import {
  ExitIntentLastChanceEmail,
  exitIntentLastChanceSubject,
} from "@/components/email/templates/exit-intent-last-chance"

const logger = createLogger("exit-intent-nurture")

// Lock duration: 10 minutes. If a row is locked longer, assume the process died.
const LOCK_DURATION_MS = 10 * 60 * 1000

interface ExitIntentCapture {
  id: string
  email: string
  service: string
  created_at: string
}

const SERVICE_LABELS: Record<string, string> = {
  "medical-certificate": "Medical Certificate",
  prescription: "Repeat Prescription",
  consult: "GP Consult",
}

const SERVICE_PRICES: Record<string, number> = {
  "medical-certificate": PRICING.MED_CERT,
  prescription: PRICING.REPEAT_SCRIPT,
  consult: PRICING.CONSULT,
}

function buildCtaUrl(appUrl: string, service: string): string {
  const slug = service === "medical-certificate" ? "med-cert" : service
  return `${appUrl}/request?service=${slug}`
}

function buildUnsubscribeUrl(appUrl: string, captureId: string): string {
  const token = signExitIntentToken(captureId, "unsubscribe")
  return `${appUrl}/api/exit-intent/unsubscribe?token=${token}`
}

function buildOpenTrackingUrl(appUrl: string, captureId: string, reminder: "2" | "3"): string {
  const token = signExitIntentToken(captureId, "open")
  return `${appUrl}/api/exit-intent/open?t=${token}&r=${reminder}`
}

/**
 * Acquire a row-level lock on a capture to prevent double-sending.
 * Sets processing_lock_until to now + LOCK_DURATION.
 * Returns true if lock acquired, false if already locked by another process.
 */
async function acquireRowLock(captureId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const lockUntil = new Date(now.getTime() + LOCK_DURATION_MS)

  // Only lock if not currently locked (or lock expired)
  const { data, error } = await supabase
    .from("exit_intent_captures")
    .update({ processing_lock_until: lockUntil.toISOString() })
    .eq("id", captureId)
    .or(`processing_lock_until.is.null,processing_lock_until.lt.${now.toISOString()}`)
    .select("id")
    .maybeSingle()

  if (error) {
    logger.warn("Failed to acquire row lock", { captureId, error: error.message })
    return false
  }

  return !!data
}

/**
 * Release the row-level lock after processing.
 */
async function releaseRowLock(captureId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase
    .from("exit_intent_captures")
    .update({ processing_lock_until: null })
    .eq("id", captureId)
}

/**
 * Find captures ready for email 2 (social proof, ~24h after capture)
 * Window: 20h–48h after capture, reminder_1 sent, reminder_2 not sent
 */
async function findEmail2Candidates(): Promise<ExitIntentCapture[]> {
  const supabase = createServiceRoleClient()
  const now = new Date()

  const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString()
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("exit_intent_captures")
    .select("id, email, service, created_at")
    .not("reminder_1_sent_at", "is", null)
    .is("reminder_2_sent_at", null)
    .lte("created_at", twentyHoursAgo)
    .gte("created_at", fortyEightHoursAgo)
    .eq("converted", false)
    .eq("unsubscribed", false)
    // Skip rows currently locked by another process
    .or(`processing_lock_until.is.null,processing_lock_until.lt.${now.toISOString()}`)
    .limit(50)

  if (error) {
    logger.error("Failed to fetch email 2 candidates", { error: error.message })
    return []
  }

  return (data || []) as ExitIntentCapture[]
}

/**
 * Find captures ready for email 3 (last chance, ~72h after capture)
 * Window: 68h–120h after capture, reminder_2 sent, reminder_3 not sent
 */
async function findEmail3Candidates(): Promise<ExitIntentCapture[]> {
  const supabase = createServiceRoleClient()
  const now = new Date()

  const sixtyEightHoursAgo = new Date(now.getTime() - 68 * 60 * 60 * 1000).toISOString()
  const oneHundredTwentyHoursAgo = new Date(now.getTime() - 120 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("exit_intent_captures")
    .select("id, email, service, created_at")
    .not("reminder_2_sent_at", "is", null)
    .is("reminder_3_sent_at", null)
    .lte("created_at", sixtyEightHoursAgo)
    .gte("created_at", oneHundredTwentyHoursAgo)
    .eq("converted", false)
    .eq("unsubscribed", false)
    .or(`processing_lock_until.is.null,processing_lock_until.lt.${now.toISOString()}`)
    .limit(50)

  if (error) {
    logger.error("Failed to fetch email 3 candidates", { error: error.message })
    return []
  }

  return (data || []) as ExitIntentCapture[]
}

/**
 * Send social proof email (email 2) and mark as sent
 */
async function sendSocialProofEmail(capture: ExitIntentCapture): Promise<boolean> {
  // Acquire row lock for idempotency
  if (!(await acquireRowLock(capture.id))) {
    logger.info("Skipping email 2 — row locked", { captureId: capture.id })
    return false
  }

  try {
    const appUrl = getAppUrl()
    const label = SERVICE_LABELS[capture.service] || "Medical Certificate"
    const price = `$${(SERVICE_PRICES[capture.service] || PRICING.MED_CERT).toFixed(2)}`
    const ctaUrl = buildCtaUrl(appUrl, capture.service)
    const unsubscribeUrl = buildUnsubscribeUrl(appUrl, capture.id)
    const openTrackingUrl = buildOpenTrackingUrl(appUrl, capture.id, "2")

    // Check global suppression (bounces/complaints)
    if (await isEmailSuppressed(capture.email)) {
      logger.info("Skipping email 2 — suppressed", { captureId: capture.id })
      return false
    }

    const result = await sendEmail({
      to: capture.email,
      subject: exitIntentSocialProofSubject(),
      template: ExitIntentSocialProofEmail({
        service: label,
        price,
        ctaUrl,
        appUrl,
        unsubscribeUrl,
        openTrackingUrl,
      }),
      emailType: "exit_intent_social_proof",
      tags: [
        { name: "category", value: "exit_intent_social_proof" },
        { name: "service", value: capture.service },
      ],
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    })

    if (result.success) {
      const supabase = createServiceRoleClient()
      await supabase
        .from("exit_intent_captures")
        .update({
          reminder_2_sent_at: new Date().toISOString(),
          processing_lock_until: null,
        })
        .eq("id", capture.id)

      // Track in PostHog
      trackNurtureEvent("exit_intent_email_2_sent", capture)

      logger.info("Sent exit intent email 2 (social proof)", { captureId: capture.id })
    } else {
      await releaseRowLock(capture.id)
    }

    return result.success
  } catch (error) {
    await releaseRowLock(capture.id)
    throw error
  }
}

/**
 * Send last-chance email (email 3) and mark as sent
 */
async function sendLastChanceEmail(capture: ExitIntentCapture): Promise<boolean> {
  if (!(await acquireRowLock(capture.id))) {
    logger.info("Skipping email 3 — row locked", { captureId: capture.id })
    return false
  }

  try {
    const appUrl = getAppUrl()
    const label = SERVICE_LABELS[capture.service] || "Medical Certificate"
    const price = `$${(SERVICE_PRICES[capture.service] || PRICING.MED_CERT).toFixed(2)}`
    const ctaUrl = buildCtaUrl(appUrl, capture.service)
    const unsubscribeUrl = buildUnsubscribeUrl(appUrl, capture.id)
    const openTrackingUrl = buildOpenTrackingUrl(appUrl, capture.id, "3")

    if (await isEmailSuppressed(capture.email)) {
      logger.info("Skipping email 3 — suppressed", { captureId: capture.id })
      return false
    }

    const result = await sendEmail({
      to: capture.email,
      subject: exitIntentLastChanceSubject(label),
      template: ExitIntentLastChanceEmail({
        service: label,
        price,
        ctaUrl,
        appUrl,
        unsubscribeUrl,
        openTrackingUrl,
      }),
      emailType: "exit_intent_last_chance",
      tags: [
        { name: "category", value: "exit_intent_last_chance" },
        { name: "service", value: capture.service },
      ],
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    })

    if (result.success) {
      const supabase = createServiceRoleClient()
      await supabase
        .from("exit_intent_captures")
        .update({
          reminder_3_sent_at: new Date().toISOString(),
          processing_lock_until: null,
        })
        .eq("id", capture.id)

      trackNurtureEvent("exit_intent_email_3_sent", capture)

      logger.info("Sent exit intent email 3 (last chance)", { captureId: capture.id })
    } else {
      await releaseRowLock(capture.id)
    }

    return result.success
  } catch (error) {
    await releaseRowLock(capture.id)
    throw error
  }
}

/**
 * Track nurture events in PostHog for funnel analysis
 */
function trackNurtureEvent(event: string, capture: ExitIntentCapture): void {
  try {
    const posthog = getPostHogClient()
    posthog.capture({
      // Use email hash as anonymous distinctId (no PII in PostHog)
      distinctId: `exit_intent_${capture.id}`,
      event,
      properties: {
        capture_id: capture.id,
        service: capture.service,
        service_label: SERVICE_LABELS[capture.service] || "Medical Certificate",
        hours_since_capture: Math.round(
          (Date.now() - new Date(capture.created_at).getTime()) / (1000 * 60 * 60)
        ),
      },
    })
  } catch {
    // Non-blocking
  }
}

/**
 * Process all pending exit intent nurture emails.
 * Called by the cron route on an hourly schedule.
 */
export async function processExitIntentNurture(): Promise<{
  email2: { sent: number; failed: number }
  email3: { sent: number; failed: number }
  skipped?: boolean
}> {
  const [email2Candidates, email3Candidates] = await Promise.all([
    findEmail2Candidates(),
    findEmail3Candidates(),
  ])

  const result = {
    email2: { sent: 0, failed: 0 },
    email3: { sent: 0, failed: 0 },
  }

  // Process email 2 candidates
  for (const capture of email2Candidates) {
    try {
      const success = await sendSocialProofEmail(capture)
      if (success) result.email2.sent++
      else result.email2.failed++
    } catch (error) {
      result.email2.failed++
      Sentry.addBreadcrumb({
        category: "exit-intent-nurture",
        message: `Email 2 failed for capture ${capture.id}`,
        level: "error",
      })
      logger.error("Email 2 send error", { captureId: capture.id, error })
    }

    // Small delay between emails to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Process email 3 candidates
  for (const capture of email3Candidates) {
    try {
      const success = await sendLastChanceEmail(capture)
      if (success) result.email3.sent++
      else result.email3.failed++
    } catch (error) {
      result.email3.failed++
      Sentry.addBreadcrumb({
        category: "exit-intent-nurture",
        message: `Email 3 failed for capture ${capture.id}`,
        level: "error",
      })
      logger.error("Email 3 send error", { captureId: capture.id, error })
    }

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Track overall nurture run in PostHog
  try {
    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: "system_cron",
      event: "exit_intent_nurture_run",
      properties: {
        email2_sent: result.email2.sent,
        email2_failed: result.email2.failed,
        email3_sent: result.email3.sent,
        email3_failed: result.email3.failed,
        total_candidates: email2Candidates.length + email3Candidates.length,
      },
    })
  } catch {
    // Non-blocking
  }

  logger.info("Processed exit intent nurture", {
    email2: result.email2,
    email3: result.email3,
    totalCandidates: email2Candidates.length + email3Candidates.length,
  })

  return result
}
