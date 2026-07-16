"use server"

import * as React from "react"

import { getAppUrl } from "@/lib/config/env"
import {
  ABANDONED_CHECKOUT_FIRST_NUDGE_DELAY_MINUTES,
  ABANDONED_CHECKOUT_FIRST_NUDGE_LOOKBACK_HOURS,
  ABANDONED_CHECKOUT_FOLLOWUP_DELAY_HOURS,
  ABANDONED_CHECKOUT_FOLLOWUP_LOOKBACK_HOURS,
  formatAbandonedCheckoutStartedAgo,
} from "@/lib/email/abandoned-checkout-timing"
import {
  type CheckoutReminderIdentity,
  keepCanonicalCheckoutReminderCandidates,
} from "@/lib/email/checkout-reminder-dedupe"
import { AbandonedCheckoutEmail, abandonedCheckoutSubject } from "@/lib/email/components/templates/abandoned-checkout"
import { AbandonedCheckoutFollowupEmail, abandonedCheckoutFollowupSubject } from "@/lib/email/components/templates/abandoned-checkout-followup"
import { canSendMarketingEmail } from "@/lib/email/preferences"
import { buildAbandonedCheckoutResumeUrl } from "@/lib/email/recovery-links"
import { createLogger } from "@/lib/observability/logger"
import { captureRedisWarning } from "@/lib/observability/redis-sentry"
import { PAYMENT_REPLACEMENT_LOCK } from "@/lib/stripe/payment-integrity"
import { PAYMENT_SAFETY_LOCKS } from "@/lib/stripe/payment-safety-lock"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { sendEmail } from "./send-email"

const logger = createLogger("abandoned-checkout")

const ABANDONED_CHECKOUT_LOCK_EXCLUSION_FILTER =
  `checkout_error.is.null,and(${[
    ...PAYMENT_SAFETY_LOCKS,
    PAYMENT_REPLACEMENT_LOCK,
  ].map((marker) => `checkout_error.neq.${marker}`).join(",")})`

interface AbandonedIntake {
  id: string
  patient_id: string
  payment_id: string | null
  checkout_error: string | null
  category: string | null
  subtype: string | null
  created_at: string
  isGuest: boolean
  patient: {
    email: string | null
    first_name: string | null
  } | null
}

interface AbandonedIntakeRecord {
  id: string
  patient_id: string
  payment_id: string | null
  checkout_error?: string | null
  category: string | null
  subtype: string | null
  created_at: string
  guest_email?: string | null
  patient:
    | { email: string | null; first_name: string | null }
    | Array<{ email: string | null; first_name: string | null }>
    | null
}

type AbandonedEmailStage = "first" | "followup"

function unwrapAbandonedIntakes(data: Record<string, unknown>[]): AbandonedIntake[] {
  return data.map((item) => normalizeAbandonedIntake(item as unknown as AbandonedIntakeRecord))
}

function reminderIdentity(intake: AbandonedIntake): CheckoutReminderIdentity {
  return {
    category: intake.category,
    createdAt: intake.created_at,
    email: intake.patient?.email ?? null,
    id: intake.id,
    subtype: intake.subtype,
  }
}

async function loadRecentCheckoutReminderSiblings(
  createdAfter: string,
): Promise<CheckoutReminderIdentity[] | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      payment_id,
      checkout_error,
      category,
      subtype,
      created_at,
      guest_email,
      patient:profiles!patient_id(email, first_name)
    `)
    .gte("created_at", createdAfter)

  if (error) {
    logger.error("Failed to load checkout siblings before recovery email", {
      error: error.message,
    })
    return null
  }

  return unwrapAbandonedIntakes((data ?? []) as unknown as Record<string, unknown>[])
    .map(reminderIdentity)
}

async function suppressSupersededReminders(
  candidates: AbandonedIntake[],
  createdAfter: string,
): Promise<AbandonedIntake[]> {
  if (candidates.length === 0) return candidates

  const siblingFloor = candidates.reduce((earliest, candidate) => (
    candidate.created_at < earliest ? candidate.created_at : earliest
  ), createdAfter)
  const siblings = await loadRecentCheckoutReminderSiblings(siblingFloor)
  // Fail closed for this cron run: delaying a nudge is safer than telling a
  // person to pay an old request after a newer request may already be paid.
  if (siblings === null) return []

  const canonicalIds = new Set(
    keepCanonicalCheckoutReminderCandidates(
      candidates.map(reminderIdentity),
      siblings,
    ).map((candidate) => candidate.id),
  )

  return candidates.filter((candidate) => canonicalIds.has(candidate.id))
}

const SERVICE_NAMES: Record<string, string> = {
  medical_certificate: "Medical Certificate",
  prescription: "Repeat Prescription",
  consult: "GP Consult",
}

function normalizeAbandonedIntake(item: AbandonedIntakeRecord): AbandonedIntake {
  const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient
  const guestEmail = item.guest_email

  return {
    id: item.id,
    patient_id: item.patient_id,
    payment_id: item.payment_id,
    checkout_error: item.checkout_error ?? null,
    category: item.category,
    subtype: item.subtype,
    created_at: item.created_at,
    isGuest: Boolean(guestEmail),
    patient: patient?.email
      ? patient
      : (guestEmail ? { email: guestEmail, first_name: null } : (patient ?? null)),
  }
}

async function readCurrentAbandonedIntake(
  intake: AbandonedIntake,
  stage: AbandonedEmailStage,
): Promise<AbandonedIntake | null> {
  const supabase = createServiceRoleClient()
  let query = supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      payment_id,
      checkout_error,
      category,
      subtype,
      created_at,
      guest_email,
      patient:profiles!patient_id(email, first_name)
    `)
    .eq("id", intake.id)
    .eq("patient_id", intake.patient_id)

  query = intake.payment_id === null
    ? query.is("payment_id", null)
    : query.eq("payment_id", intake.payment_id)

  query = query
    .in("status", ["pending_payment", "checkout_failed"])
    .in("payment_status", ["pending", "unpaid", "failed"])

  // Exact-match the checkout state captured by the candidate scan. Any safety
  // lock or other checkout-state change before this re-read suppresses send.
  query = intake.checkout_error === null
    ? query.is("checkout_error", null)
    : query.eq("checkout_error", intake.checkout_error)

  query = stage === "first"
    ? query.is("abandoned_email_sent_at", null)
    : query.not("abandoned_email_sent_at", "is", null).is("abandoned_followup_sent_at", null)

  const { data, error } = await query.maybeSingle()

  if (error) {
    logger.error("Failed to verify abandoned checkout email eligibility", {
      intakeId: intake.id,
      stage,
      errorCode: error.code,
    })
    return null
  }

  return data ? normalizeAbandonedIntake(data as AbandonedIntakeRecord) : null
}

async function markCurrentAbandonedEmailSent(
  intake: AbandonedIntake,
  stage: AbandonedEmailStage,
): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const timestampColumn = stage === "first"
    ? "abandoned_email_sent_at"
    : "abandoned_followup_sent_at"
  let query = supabase
    .from("intakes")
    .update({ [timestampColumn]: new Date().toISOString() })
    .eq("id", intake.id)
    .eq("patient_id", intake.patient_id)

  query = intake.payment_id === null
    ? query.is("payment_id", null)
    : query.eq("payment_id", intake.payment_id)

  query = query
    .in("status", ["pending_payment", "checkout_failed"])
    .in("payment_status", ["pending", "unpaid", "failed"])

  // Exact-CAS the checkout error verified immediately before send. This keeps
  // the PATCH free of the nullable `.or()` shape rejected by PostgREST and
  // prevents either payment-safety lock from being overwritten.
  query = intake.checkout_error === null
    ? query.is("checkout_error", null)
    : query.eq("checkout_error", intake.checkout_error)

  query = stage === "first"
    ? query.is("abandoned_email_sent_at", null)
    : query.not("abandoned_email_sent_at", "is", null).is("abandoned_followup_sent_at", null)

  const { data, error } = await query.select("id").maybeSingle()

  if (error) {
    logger.error("Failed to mark abandoned checkout email sent", {
      intakeId: intake.id,
      stage,
      errorCode: error.code,
    })
    return false
  }

  if (!data) {
    logger.warn("Abandoned checkout email timestamp not marked because state changed", {
      intakeId: intake.id,
      stage,
    })
    return false
  }

  return true
}

/**
 * Find intakes that were created but never paid for (abandoned checkouts)
 * Targets unpaid checkout-stage intakes after the first nudge delay. This is
 * intentionally faster than partial-intake recovery because the patient has
 * already submitted a request and only payment is left.
 * P1 FIX: Now includes guest checkouts by checking guest_email column
 */
export async function findAbandonedCheckouts(): Promise<AbandonedIntake[]> {
  const supabase = createServiceRoleClient()
  
  const firstNudgeReadyAt = new Date(
    Date.now() - ABANDONED_CHECKOUT_FIRST_NUDGE_DELAY_MINUTES * 60 * 1000,
  ).toISOString()
  const firstNudgeWindowFloor = new Date(
    Date.now() - ABANDONED_CHECKOUT_FIRST_NUDGE_LOOKBACK_HOURS * 60 * 60 * 1000,
  ).toISOString()
  
  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      payment_id,
      checkout_error,
      category,
      subtype,
      created_at,
      guest_email,
      patient:profiles!patient_id(email, first_name)
    `)
    .in("status", ["pending_payment", "checkout_failed"])
    .in("payment_status", ["pending", "unpaid", "failed"])
    .or(ABANDONED_CHECKOUT_LOCK_EXCLUSION_FILTER)
    .gte("created_at", firstNudgeWindowFloor)
    .lte("created_at", firstNudgeReadyAt)
    .is("abandoned_email_sent_at", null)
  
  if (error) {
    logger.error("Failed to fetch abandoned checkouts", { errorCode: error.code })
    return []
  }
  
  // Transform data - Supabase returns joined tables as arrays. Then keep only
  // the newest request for each email/service lane, including when a newer
  // sibling has already paid and is not itself a reminder candidate.
  const candidates = unwrapAbandonedIntakes(
    (data ?? []) as unknown as Record<string, unknown>[],
  )
  return suppressSupersededReminders(candidates, firstNudgeWindowFloor)
}

/**
 * Send abandoned checkout recovery email
 */
export async function sendAbandonedCheckoutEmail(intake: AbandonedIntake): Promise<boolean> {
  // Check if patient has opted out of marketing emails
  if (intake.patient_id) {
    const canSend = await canSendMarketingEmail(intake.patient_id)
    if (!canSend) {
      logger.info("Skipping abandoned checkout email - user opted out", { intakeId: intake.id })
      return false
    }
  }

  const currentIntake = await readCurrentAbandonedIntake(intake, "first")
  if (!currentIntake) return false

  const patient = currentIntake.patient
  if (!patient?.email) {
    logger.warn("Skipping abandoned checkout email - no patient email", { intakeId: intake.id })
    return false
  }
  
  const appUrl = getAppUrl()
  const patientName = patient.first_name || "there"
  const serviceName = SERVICE_NAMES[currentIntake.category || ""] || "your request"
  const startedAgoLabel = formatAbandonedCheckoutStartedAgo(currentIntake.created_at)
  const resumeUrl = buildAbandonedCheckoutResumeUrl({
    appUrl,
    campaign: "abandoned_checkout",
    intakeId: currentIntake.id,
    isGuest: currentIntake.isGuest,
  })
  
  const result = await sendEmail({
    to: patient.email,
    subject: abandonedCheckoutSubject(serviceName),
    template: React.createElement(AbandonedCheckoutEmail, {
      patientName,
      serviceName,
      resumeUrl,
      appUrl,
      startedAgoLabel,
    }),
    emailType: "abandoned_checkout",
    intakeId: currentIntake.id,
    patientId: currentIntake.patient_id,
    tags: [
      { name: "category", value: "abandoned_checkout" },
      { name: "intake_id", value: currentIntake.id },
    ],
  })

  if (result.success) {
    const marked = await markCurrentAbandonedEmailSent(currentIntake, "first")
    if (marked) {
      logger.info("Sent abandoned checkout email", { intakeId: currentIntake.id })
    }
  }
  
  return result.success
}

/**
 * Find intakes that received the first nudge but not the followup.
 * Targets intakes whose first nudge was sent 24-72 hours ago. Using the first
 * send timestamp, not created_at, prevents a boundary case where a newly sent
 * first nudge can become eligible for the followup in the same cron run.
 */
export async function findAbandonedFollowups(): Promise<AbandonedIntake[]> {
  const supabase = createServiceRoleClient()

  const followupReadyAt = new Date(
    Date.now() - ABANDONED_CHECKOUT_FOLLOWUP_DELAY_HOURS * 60 * 60 * 1000,
  ).toISOString()
  const followupWindowFloor = new Date(
    Date.now() - ABANDONED_CHECKOUT_FOLLOWUP_LOOKBACK_HOURS * 60 * 60 * 1000,
  ).toISOString()

  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      payment_id,
      checkout_error,
      category,
      subtype,
      created_at,
      guest_email,
      patient:profiles!patient_id(email, first_name)
    `)
    .in("status", ["pending_payment", "checkout_failed"])
    .in("payment_status", ["pending", "unpaid", "failed"])
    .or(ABANDONED_CHECKOUT_LOCK_EXCLUSION_FILTER)
    .gte("abandoned_email_sent_at", followupWindowFloor)
    .lte("abandoned_email_sent_at", followupReadyAt)
    .not("abandoned_email_sent_at", "is", null)
    .is("abandoned_followup_sent_at", null)

  if (error) {
    logger.error("Failed to fetch abandoned followups", { errorCode: error.code })
    return []
  }

  const candidates = unwrapAbandonedIntakes(
    (data ?? []) as unknown as Record<string, unknown>[],
  )
  return suppressSupersededReminders(candidates, followupWindowFloor)
}

/**
 * Send the 24h abandoned checkout followup email (last call with social proof)
 */
export async function sendAbandonedFollowupEmail(intake: AbandonedIntake): Promise<boolean> {
  if (intake.patient_id) {
    const canSend = await canSendMarketingEmail(intake.patient_id)
    if (!canSend) {
      logger.info("Skipping abandoned followup email - user opted out", { intakeId: intake.id })
      return false
    }
  }

  const currentIntake = await readCurrentAbandonedIntake(intake, "followup")
  if (!currentIntake) return false

  const patient = currentIntake.patient
  if (!patient?.email) {
    logger.warn("Skipping abandoned followup email - no patient email", { intakeId: intake.id })
    return false
  }

  const appUrl = getAppUrl()
  const patientName = patient.first_name || "there"
  const serviceName = SERVICE_NAMES[currentIntake.category || ""] || "your request"
  const resumeUrl = buildAbandonedCheckoutResumeUrl({
    appUrl,
    campaign: "abandoned_checkout_followup",
    intakeId: currentIntake.id,
    isGuest: currentIntake.isGuest,
  })

  const result = await sendEmail({
    to: patient.email,
    subject: abandonedCheckoutFollowupSubject(serviceName),
    template: React.createElement(AbandonedCheckoutFollowupEmail, {
      patientName,
      serviceName,
      resumeUrl,
      appUrl,
    }),
    emailType: "abandoned_checkout_followup",
    intakeId: currentIntake.id,
    patientId: currentIntake.patient_id,
    tags: [
      { name: "category", value: "abandoned_checkout_followup" },
      { name: "intake_id", value: currentIntake.id },
    ],
  })

  if (result.success) {
    const marked = await markCurrentAbandonedEmailSent(currentIntake, "followup")
    if (marked) {
      logger.info("Sent abandoned followup email", { intakeId: currentIntake.id })
    }
  }

  return result.success
}

/**
 * Acquire a distributed lock to prevent concurrent cron runs
 * Returns a release function if lock acquired, null otherwise
 */
async function acquireCronLock(): Promise<(() => Promise<void>) | null> {
  // Only use lock if Redis is available
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return async () => {} // No-op release for environments without Redis
  }
  
  try {
    const { Redis } = await import("@upstash/redis")
    const redis = Redis.fromEnv()
    const lockKey = "cron:abandoned-checkout:lock"
    const lockValue = `${Date.now()}-${crypto.randomUUID()}`
    const lockTtlSeconds = 3600 // 1 hour max lock duration

    // Try to acquire lock with NX (only set if not exists)
    const acquired = await redis.set(lockKey, lockValue, { nx: true, ex: lockTtlSeconds })
    
    if (!acquired) {
      logger.warn("Cron lock already held, skipping run")
      return null
    }
    
    // Return release function
    return async () => {
      try {
        // Only delete if we still own the lock
        const currentValue = await redis.get(lockKey)
        if (currentValue === lockValue) {
          await redis.del(lockKey)
        }
      } catch {
        // Ignore release errors
      }
    }
  } catch (error) {
    logger.error("Failed to acquire cron lock", { error })
    captureRedisWarning(error, {
      operation: 'lock',
      keyPrefix: 'cron:abandoned-checkout',
      subsystem: 'cron_lock',
    })
    return async () => {} // Allow run if lock system fails
  }
}

/**
 * Process all abandoned checkouts and send recovery emails
 * Handles both the first nudge and the 24h followup in a single cron run.
 */
export async function processAbandonedCheckouts(): Promise<{ sent: number; failed: number; followupSent: number; followupFailed: number; skipped?: boolean }> {
  // Acquire distributed lock to prevent concurrent runs
  const releaseLock = await acquireCronLock()
  if (releaseLock === null) {
    return { sent: 0, failed: 0, followupSent: 0, followupFailed: 0, skipped: true }
  }

  try {
    // Process first nudges.
    const abandonedIntakes = await findAbandonedCheckouts()
    let sent = 0
    let failed = 0

    for (const intake of abandonedIntakes) {
      const success = await sendAbandonedCheckoutEmail(intake)
      if (success) { sent++ } else { failed++ }
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Process 24h followups.
    const followupIntakes = await findAbandonedFollowups()
    let followupSent = 0
    let followupFailed = 0

    for (const intake of followupIntakes) {
      const success = await sendAbandonedFollowupEmail(intake)
      if (success) { followupSent++ } else { followupFailed++ }
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    logger.info("Processed abandoned checkouts", {
      sent, failed, followupSent, followupFailed,
      total: abandonedIntakes.length + followupIntakes.length,
    })

    return { sent, failed, followupSent, followupFailed }
  } finally {
    await releaseLock()
  }
}
