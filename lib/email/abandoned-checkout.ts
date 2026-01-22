"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendViaResend } from "./resend"
import { renderAbandonedCheckoutEmail } from "./templates/abandoned-checkout"
import { getAppUrl } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"
import { canSendMarketingEmail } from "@/app/actions/email-preferences"

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
  
  const html = renderAbandonedCheckoutEmail({
    patientName,
    serviceName,
    resumeUrl,
    appUrl,
    hoursAgo,
  })
  
  // Generate unsubscribe URL for marketing emails (Spam Act compliance)
  const unsubscribeUrl = `${appUrl}/patient/settings?unsubscribe=marketing`
  
  const result = await sendViaResend({
    to: patient.email,
    subject: `Complete your ${serviceName} request`,
    html,
    tags: [
      { name: "category", value: "abandoned_checkout" },
      { name: "intake_id", value: intake.id },
    ],
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
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
    const lockValue = `${Date.now()}-${Math.random()}`
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
    return async () => {} // Allow run if lock system fails
  }
}

/**
 * Process all abandoned checkouts and send recovery emails
 * Call this from a cron job
 */
export async function processAbandonedCheckouts(): Promise<{ sent: number; failed: number; skipped?: boolean }> {
  // Acquire distributed lock to prevent concurrent runs
  const releaseLock = await acquireCronLock()
  if (releaseLock === null) {
    return { sent: 0, failed: 0, skipped: true }
  }
  
  try {
    const abandonedIntakes = await findAbandonedCheckouts()
  
    let sent = 0
    let failed = 0
  
    for (const intake of abandonedIntakes) {
      const success = await sendAbandonedCheckoutEmail(intake)
      if (success) {
        sent++
      } else {
        failed++
      }
    
      // Small delay between emails to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  
    logger.info("Processed abandoned checkouts", { sent, failed, total: abandonedIntakes.length })
  
    return { sent, failed }
  } finally {
    await releaseLock()
  }
}
