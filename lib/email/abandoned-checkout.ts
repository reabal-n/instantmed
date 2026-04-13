"use server"

import * as React from "react"

import { getAppUrl } from "@/lib/config/env"
import { AbandonedCheckoutEmail } from "@/lib/email/components/templates/abandoned-checkout"
import { AbandonedCheckoutFollowupEmail, abandonedCheckoutFollowupSubject } from "@/lib/email/components/templates/abandoned-checkout-followup"
import { canSendMarketingEmail } from "@/lib/email/preferences"
import { createLogger } from "@/lib/observability/logger"
import { captureRedisWarning } from "@/lib/observability/redis-sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { sendEmail } from "./send-email"

const logger = createLogger("abandoned-checkout")

interface AbandonedIntake {
  id: string
  patient_id: string
  category: string | null
  subtype: string | null
  created_at: string
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
 * Find intakes that were created but never paid for (abandoned checkouts)
 * Only targets intakes that are 1-24 hours old to avoid spamming
 * P1 FIX: Now includes guest checkouts by checking guest_email column
 */
export async function findAbandonedCheckouts(): Promise<AbandonedIntake[]> {
  const supabase = createServiceRoleClient()
  
  // Find intakes created 1-24 hours ago that are still pending payment
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      category,
      subtype,
      created_at,
      guest_email,
      patient:profiles!patient_id(email, first_name)
    `)
    .eq("status", "pending_payment")
    .or("payment_status.eq.pending,payment_status.is.null")
    .gte("created_at", twentyFourHoursAgo)
    .lte("created_at", oneHourAgo)
    .is("abandoned_email_sent_at", null)
  
  if (error) {
    logger.error("Failed to fetch abandoned checkouts", { error: error.message })
    return []
  }
  
  // Transform data - Supabase returns joined tables as arrays
  // P1 FIX: Include guest_email for guest checkout recovery
  return (data || []).map(item => {
    const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient
    // For guest checkouts, use guest_email if no profile email
    const guestEmail = (item as { guest_email?: string }).guest_email
    return {
      ...item,
      patient: patient?.email ? patient : (guestEmail ? { email: guestEmail, first_name: null } : patient)
    }
  }) as AbandonedIntake[]
}

/**
 * Send abandoned checkout recovery email
 */
export async function sendAbandonedCheckoutEmail(intake: AbandonedIntake): Promise<boolean> {
  const appUrl = getAppUrl()
  const patient = intake.patient
  
  if (!patient?.email) {
    logger.warn("Skipping abandoned checkout email - no patient email", { intakeId: intake.id })
    return false
  }

  // Check if patient has opted out of marketing emails
  if (intake.patient_id) {
    const canSend = await canSendMarketingEmail(intake.patient_id)
    if (!canSend) {
      logger.info("Skipping abandoned checkout email - user opted out", { intakeId: intake.id })
      return false
    }
  }
  
  const patientName = patient.first_name || "there"
  const serviceName = SERVICE_NAMES[intake.category || ""] || "your request"
  const hoursAgo = Math.round((Date.now() - new Date(intake.created_at).getTime()) / (1000 * 60 * 60))
  const resumeUrl = `${appUrl}/patient/intakes/${intake.id}?retry=true`
  
  const result = await sendEmail({
    to: patient.email,
    subject: `Complete your ${serviceName} request`,
    template: React.createElement(AbandonedCheckoutEmail, {
      patientName,
      serviceName,
      resumeUrl,
      appUrl,
      hoursAgo,
    }),
    emailType: "abandoned_checkout",
    intakeId: intake.id,
    patientId: intake.patient_id,
    tags: [
      { name: "category", value: "abandoned_checkout" },
      { name: "intake_id", value: intake.id },
    ],
  })

  if (result.success) {
    // Mark as sent to avoid duplicate emails
    const supabase = createServiceRoleClient()
    await supabase
      .from("intakes")
      .update({ abandoned_email_sent_at: new Date().toISOString() })
      .eq("id", intake.id)
    
    logger.info("Sent abandoned checkout email", { intakeId: intake.id, email: patient.email })
  }
  
  return result.success
}

/**
 * Find intakes that received the 1h nudge but not the 24h followup
 * Targets intakes 24-48 hours old
 */
export async function findAbandonedFollowups(): Promise<AbandonedIntake[]> {
  const supabase = createServiceRoleClient()

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      category,
      subtype,
      created_at,
      guest_email,
      patient:profiles!patient_id(email, first_name)
    `)
    .eq("status", "pending_payment")
    .or("payment_status.eq.pending,payment_status.is.null")
    .gte("created_at", fortyEightHoursAgo)
    .lte("created_at", twentyFourHoursAgo)
    .not("abandoned_email_sent_at", "is", null)
    .is("abandoned_followup_sent_at", null)

  if (error) {
    logger.error("Failed to fetch abandoned followups", { error: error.message })
    return []
  }

  return (data || []).map(item => {
    const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient
    const guestEmail = (item as { guest_email?: string }).guest_email
    return {
      ...item,
      patient: patient?.email ? patient : (guestEmail ? { email: guestEmail, first_name: null } : patient)
    }
  }) as AbandonedIntake[]
}

/**
 * Send the 24h abandoned checkout followup email (last call with social proof)
 */
export async function sendAbandonedFollowupEmail(intake: AbandonedIntake): Promise<boolean> {
  const appUrl = getAppUrl()
  const patient = intake.patient

  if (!patient?.email) {
    logger.warn("Skipping abandoned followup email - no patient email", { intakeId: intake.id })
    return false
  }

  if (intake.patient_id) {
    const canSend = await canSendMarketingEmail(intake.patient_id)
    if (!canSend) {
      logger.info("Skipping abandoned followup email - user opted out", { intakeId: intake.id })
      return false
    }
  }

  const patientName = patient.first_name || "there"
  const serviceName = SERVICE_NAMES[intake.category || ""] || "your request"
  const resumeUrl = `${appUrl}/patient/intakes/${intake.id}?retry=true`

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
    intakeId: intake.id,
    patientId: intake.patient_id,
    tags: [
      { name: "category", value: "abandoned_checkout_followup" },
      { name: "intake_id", value: intake.id },
    ],
  })

  if (result.success) {
    const supabase = createServiceRoleClient()
    await supabase
      .from("intakes")
      .update({ abandoned_followup_sent_at: new Date().toISOString() })
      .eq("id", intake.id)

    logger.info("Sent abandoned followup email", { intakeId: intake.id, email: patient.email })
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
 * Handles both the 1h nudge and the 24h followup in a single cron run
 */
export async function processAbandonedCheckouts(): Promise<{ sent: number; failed: number; followupSent: number; followupFailed: number; skipped?: boolean }> {
  // Acquire distributed lock to prevent concurrent runs
  const releaseLock = await acquireCronLock()
  if (releaseLock === null) {
    return { sent: 0, failed: 0, followupSent: 0, followupFailed: 0, skipped: true }
  }

  try {
    // Process 1h nudges
    const abandonedIntakes = await findAbandonedCheckouts()
    let sent = 0
    let failed = 0

    for (const intake of abandonedIntakes) {
      const success = await sendAbandonedCheckoutEmail(intake)
      if (success) { sent++ } else { failed++ }
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Process 24h followups
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
