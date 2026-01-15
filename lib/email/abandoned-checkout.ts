"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendViaResend } from "./resend"
import { renderAbandonedCheckoutEmail } from "./templates/abandoned-checkout"
import { getAppUrl } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"

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
      patient:profiles!patient_id(email, first_name)
    `)
    .eq("status", "pending_payment")
    .eq("payment_status", "pending")
    .gte("created_at", twentyFourHoursAgo)
    .lte("created_at", oneHourAgo)
    .is("abandoned_email_sent_at", null)
  
  if (error) {
    logger.error("Failed to fetch abandoned checkouts", { error: error.message })
    return []
  }
  
  // Transform data - Supabase returns joined tables as arrays
  return (data || []).map(item => ({
    ...item,
    patient: Array.isArray(item.patient) ? item.patient[0] : item.patient
  })) as AbandonedIntake[]
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
  
  const result = await sendViaResend({
    to: patient.email,
    subject: `Complete your ${serviceName} request`,
    html,
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
 * Process all abandoned checkouts and send recovery emails
 * Call this from a cron job
 */
export async function processAbandonedCheckouts(): Promise<{ sent: number; failed: number }> {
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
}
