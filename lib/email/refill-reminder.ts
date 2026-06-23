import "server-only"

import * as React from "react"

import {
  REFILL_REMINDER_WINDOW_MAX_DAYS,
  REFILL_REMINDER_WINDOW_MIN_DAYS,
} from "@/lib/clinical/repeats-policy"
import { getAppUrl } from "@/lib/config/env"
import { RefillReminderEmail, refillReminderSubject } from "@/lib/email/components/templates/refill-reminder"
import { canSendMarketingEmail } from "@/lib/email/preferences"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { sendEmail } from "./send-email"

const logger = createLogger("refill-reminder")

// Reorder window (days since issue): a daily cron, so the band catches each script
// once as it enters the window; refill_reminder_sent_at dedups across the band.
// Tuned to ~week 10-11 — before a ~3-month (script + 2 repeats) supply runs out —
// from the shared repeats standard so copy + cron can't drift.
const REORDER_WINDOW_MIN_DAYS = REFILL_REMINDER_WINDOW_MIN_DAYS
const REORDER_WINDOW_MAX_DAYS = REFILL_REMINDER_WINDOW_MAX_DAYS

interface RefillCandidate {
  id: string
  patient_id: string
  medication_name: string
  medication_strength: string | null
  issued_date: string
  created_at: string
  patient: {
    email: string | null
    first_name: string | null
  } | null
}

/**
 * Whether the refill-reminder cron is allowed to send. Ships OFF; the operator
 * flips REFILL_REMINDER_EMAILS_ENABLED=true after reviewing the email copy.
 */
export function refillRemindersEnabled(): boolean {
  return process.env.REFILL_REMINDER_EMAILS_ENABLED === "true"
}

function dateNDaysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * Active repeatable scripts issued ~10-11 weeks ago that have never had a refill
 * reminder. Excludes bounced emails and any script the patient has already
 * superseded with a newer script for the same medication (they reordered).
 */
export async function findRefillReminderCandidates(): Promise<RefillCandidate[]> {
  const supabase = createServiceRoleClient()

  const windowStart = dateNDaysAgoISO(REORDER_WINDOW_MAX_DAYS) // older bound
  const windowEnd = dateNDaysAgoISO(REORDER_WINDOW_MIN_DAYS) // newer bound

  const { data, error } = await supabase
    .from("prescriptions")
    .select(`
      id,
      patient_id,
      medication_name,
      medication_strength,
      issued_date,
      created_at,
      patient:profiles!patient_id(email, first_name, email_bounced)
    `)
    .eq("status", "active")
    .is("refill_reminder_sent_at", null)
    .gte("issued_date", windowStart)
    .lte("issued_date", windowEnd)

  if (error) {
    logger.error("Failed to fetch refill reminder candidates", { error: error.message })
    return []
  }

  const normalized = (data || []).map((item) => {
    const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient
    return { ...item, patient: patient ?? null } as RefillCandidate & {
      patient: (RefillCandidate["patient"] & { email_bounced?: boolean }) | null
    }
  })

  const withEmail = normalized.filter(
    (item) => item.patient?.email && !(item.patient as { email_bounced?: boolean }).email_bounced,
  )
  if (withEmail.length === 0) return []

  // Drop candidates the patient has already superseded with a newer script for
  // the same medication (i.e. they reordered) so we don't nudge a stale script.
  const patientIds = Array.from(new Set(withEmail.map((item) => item.patient_id)))
  const { data: laterScripts } = await supabase
    .from("prescriptions")
    .select("patient_id, medication_name, created_at")
    .in("patient_id", patientIds)
    .eq("status", "active")

  const latestByKey = new Map<string, string>()
  for (const row of (laterScripts || []) as Array<{ patient_id: string; medication_name: string; created_at: string }>) {
    const key = `${row.patient_id}::${(row.medication_name || "").toLowerCase().trim()}`
    const prev = latestByKey.get(key)
    if (!prev || row.created_at > prev) latestByKey.set(key, row.created_at)
  }

  return withEmail.filter((item) => {
    const key = `${item.patient_id}::${(item.medication_name || "").toLowerCase().trim()}`
    const latest = latestByKey.get(key)
    // Keep only if this candidate IS the latest active script for that medication.
    return !latest || latest <= item.created_at
  })
}

async function stampReminded(prescriptionId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase
    .from("prescriptions")
    .update({ refill_reminder_sent_at: new Date().toISOString() })
    .eq("id", prescriptionId)
}

/**
 * Send a single refill reminder and stamp the dedup column. Returns true on send.
 */
export async function sendRefillReminderEmail(candidate: RefillCandidate): Promise<boolean> {
  const patient = candidate.patient
  if (!patient?.email) {
    logger.warn("Skipping refill reminder - no patient email", { prescriptionId: candidate.id })
    return false
  }

  const canSend = await canSendMarketingEmail(candidate.patient_id)
  if (!canSend) {
    // Stamp so we stop re-evaluating an opted-out patient every day.
    await stampReminded(candidate.id)
    logger.info("Skipping refill reminder - opted out", { prescriptionId: candidate.id })
    return false
  }

  const appUrl = getAppUrl()
  const reorderUrl = `${appUrl}/prescriptions?utm_source=refill_reminder&utm_medium=email&utm_campaign=reactivation`
  const medicationLabel = [candidate.medication_name, candidate.medication_strength]
    .filter(Boolean)
    .join(" ")
    .trim() || "your medication"

  const result = await sendEmail({
    to: patient.email,
    subject: refillReminderSubject,
    template: React.createElement(RefillReminderEmail, {
      patientName: patient.first_name || "there",
      medicationName: medicationLabel,
      appUrl,
      reorderUrl,
    }),
    emailType: "refill_reminder" as import("./send-email").EmailType,
    patientId: candidate.patient_id,
    metadata: { prescription_id: candidate.id, medication: candidate.medication_name },
    tags: [
      { name: "category", value: "refill_reminder" },
      { name: "prescription_id", value: candidate.id },
    ],
  })

  if (result.success) {
    await stampReminded(candidate.id)
    logger.info("Sent refill reminder", { prescriptionId: candidate.id })
  } else {
    logger.error("Failed to send refill reminder", { prescriptionId: candidate.id, error: result.error })
  }

  return result.success
}

/**
 * Process all refill reminders. Called from the daily cron. No-ops (without
 * touching the DB) when the feature is disabled.
 */
export async function processRefillReminders(): Promise<{
  enabled: boolean
  sent: number
  failed: number
  candidates: number
}> {
  if (!refillRemindersEnabled()) {
    return { enabled: false, sent: 0, failed: 0, candidates: 0 }
  }

  const candidates = await findRefillReminderCandidates()
  let sent = 0
  let failed = 0

  for (const candidate of candidates) {
    const ok = await sendRefillReminderEmail(candidate)
    if (ok) sent++
    else failed++
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  logger.info("Processed refill reminders", { sent, failed, candidates: candidates.length })
  return { enabled: true, sent, failed, candidates: candidates.length }
}
