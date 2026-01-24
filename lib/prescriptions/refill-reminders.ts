"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createNotification } from "@/lib/notifications/service"
import { createLogger } from "@/lib/observability/logger"
const logger = createLogger("refill-reminders")
import { addDays, differenceInDays, parseISO } from "date-fns"

interface PrescriptionRefillConfig {
  // Days before script runs out to send reminder
  reminderDays: number[]
  // Typical script duration in days (30, 60, 90 day supplies)
  defaultSupplyDays: number
}

const DEFAULT_CONFIG: PrescriptionRefillConfig = {
  reminderDays: [14, 7, 3], // Remind at 14 days, 7 days, and 3 days before
  defaultSupplyDays: 30,
}

interface RefillReminder {
  requestId: string
  patientId: string
  medicationName: string
  originalDate: string
  estimatedRunOutDate: string
  daysRemaining: number
}

/**
 * Calculate estimated refill date based on prescription date and supply duration
 */
export function calculateRefillDate(
  prescriptionDate: string,
  supplyDays: number = DEFAULT_CONFIG.defaultSupplyDays
): Date {
  return addDays(parseISO(prescriptionDate), supplyDays)
}

/**
 * Get all prescriptions that need refill reminders
 */
export async function getPrescriptionsNeedingReminders(): Promise<RefillReminder[]> {
  const supabase = createServiceRoleClient()
  
  try {
    // Get approved prescription requests from the last 90 days
    const ninetyDaysAgo = addDays(new Date(), -90)
    
    const { data: prescriptions, error } = await supabase
      .from("intakes")
      .select(`
        id,
        patient_id,
        created_at,
        updated_at,
        category,
        subtype,
        intake_answers (
          answers
        )
      `)
      .eq("category", "prescription")
      .eq("status", "approved")
      .gte("updated_at", ninetyDaysAgo.toISOString())

    if (error) {
      logger.error("Failed to fetch prescriptions for reminders", {}, new Error(error.message))
      return []
    }

    const reminders: RefillReminder[] = []
    const today = new Date()

    for (const rx of prescriptions || []) {
      // Extract medication name from answers
      const answers = rx.intake_answers?.[0]?.answers as Record<string, unknown> | undefined
      const medicationName = (answers?.medication_name as string) || 
                            (answers?.medicationName as string) || 
                            "Your medication"

      // Calculate estimated run-out date (default 30-day supply from approval date)
      const approvalDate = rx.updated_at || rx.created_at
      const estimatedRunOutDate = calculateRefillDate(approvalDate)
      const daysRemaining = differenceInDays(estimatedRunOutDate, today)

      // Check if we should remind (14, 7, or 3 days before)
      if (DEFAULT_CONFIG.reminderDays.includes(daysRemaining)) {
        reminders.push({
          requestId: rx.id,
          patientId: rx.patient_id,
          medicationName,
          originalDate: approvalDate,
          estimatedRunOutDate: estimatedRunOutDate.toISOString(),
          daysRemaining,
        })
      }
    }

    return reminders
  } catch (err) {
    logger.error("Error checking prescription reminders", {}, err instanceof Error ? err : new Error(String(err)))
    return []
  }
}

/**
 * Send refill reminder notification to a patient
 */
export async function sendRefillReminder(reminder: RefillReminder): Promise<boolean> {
  const { requestId, patientId, medicationName, daysRemaining } = reminder

  // Craft urgency-appropriate message
  let title: string
  let message: string

  if (daysRemaining <= 3) {
    title = `⚠️ ${medicationName} running low!`
    message = `Your prescription may run out in ${daysRemaining} days. Order a refill now to avoid running out.`
  } else if (daysRemaining <= 7) {
    title = `📋 Time to refill ${medicationName}`
    message = `Your prescription will run out in about a week. Get a refill to ensure you don't miss any doses.`
  } else {
    title = `💊 Refill reminder: ${medicationName}`
    message = `Your prescription may run out in ${daysRemaining} days. Consider ordering a refill soon.`
  }

  try {
    const result = await createNotification({
      userId: patientId,
      type: "refill_reminder",
      title,
      message,
      actionUrl: `/prescriptions/request?refill=${requestId}&medication=${encodeURIComponent(medicationName)}`,
      metadata: {
        originalRequestId: requestId,
        medicationName,
        daysRemaining,
        reminderType: daysRemaining <= 3 ? "urgent" : daysRemaining <= 7 ? "soon" : "advance",
      },
    })

    if (result.success) {
      logger.info("Refill reminder sent", { patientId, medicationName, daysRemaining })
    }

    return result.success
  } catch (err) {
    logger.error("Failed to send refill reminder", { patientId, medicationName }, err instanceof Error ? err : new Error(String(err)))
    return false
  }
}

/**
 * Process all pending refill reminders
 * Called by a cron job or scheduled function
 */
export async function processRefillReminders(): Promise<{ sent: number; failed: number }> {
  const reminders = await getPrescriptionsNeedingReminders()
  
  let sent = 0
  let failed = 0

  for (const reminder of reminders) {
    const success = await sendRefillReminder(reminder)
    if (success) {
      sent++
    } else {
      failed++
    }
  }

  logger.info("Refill reminders processed", { sent, failed, total: reminders.length })
  return { sent, failed }
}

/**
 * Get upcoming refills for a specific patient (for dashboard display)
 */
export async function getUpcomingRefillsForPatient(patientId: string): Promise<{
  medication: string
  daysRemaining: number
  refillUrl: string
}[]> {
  const supabase = createServiceRoleClient()

  try {
    const sixtyDaysAgo = addDays(new Date(), -60)
    
    const { data: prescriptions, error } = await supabase
      .from("intakes")
      .select(`
        id,
        updated_at,
        intake_answers (
          answers
        )
      `)
      .eq("patient_id", patientId)
      .eq("category", "prescription")
      .eq("status", "approved")
      .gte("updated_at", sixtyDaysAgo.toISOString())
      .order("updated_at", { ascending: false })

    if (error || !prescriptions) return []

    const today = new Date()
    const upcomingRefills: { medication: string; daysRemaining: number; refillUrl: string }[] = []

    for (const rx of prescriptions) {
      const answers = rx.intake_answers?.[0]?.answers as Record<string, unknown> | undefined
      const medicationName = (answers?.medication_name as string) || 
                            (answers?.medicationName as string) || 
                            "Medication"

      const approvalDate = rx.updated_at
      const estimatedRunOutDate = calculateRefillDate(approvalDate)
      const daysRemaining = differenceInDays(estimatedRunOutDate, today)

      // Only show if running out within 21 days
      if (daysRemaining > 0 && daysRemaining <= 21) {
        upcomingRefills.push({
          medication: medicationName,
          daysRemaining,
          refillUrl: `/prescriptions/request?refill=${rx.id}&medication=${encodeURIComponent(medicationName)}`,
        })
      }
    }

    return upcomingRefills.sort((a, b) => a.daysRemaining - b.daysRemaining)
  } catch (err) {
    logger.error("Error fetching upcoming refills", { patientId }, err instanceof Error ? err : new Error(String(err)))
    return []
  }
}
