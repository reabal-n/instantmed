import "server-only"

import * as React from "react"

import { getAppUrl } from "@/lib/config/env"
import {
  CertReactivationEmail,
  certReactivationSubject,
} from "@/lib/email/components/templates/cert-reactivation"
import { canSendMarketingEmail } from "@/lib/email/preferences"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { sendEmail } from "./send-email"

const logger = createLogger("cert-reactivation")

// Reactivation window (days since the patient's most recent issued certificate).
// 35d lower bound = not so soon it reads as spam; 120d upper bound = not so cold
// the patient has moved on. A daily cron catches each patient once as their most
// recent certificate ages into the band; reactivation_email_sent_at dedups.
const REACTIVATION_WINDOW_MIN_DAYS = 35
const REACTIVATION_WINDOW_MAX_DAYS = 120

/**
 * Whether the reactivation cron is allowed to send. Ships OFF; the operator flips
 * CERT_REACTIVATION_EMAILS_ENABLED=true after reviewing the email copy.
 */
export function certReactivationEnabled(): boolean {
  return process.env.CERT_REACTIVATION_EMAILS_ENABLED === "true"
}

interface ReactivationCandidate {
  id: string
  patient_id: string
  created_at: string
  patient: {
    email: string | null
    first_name: string | null
  } | null
}

function dateNDaysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Past medical-certificate patients due a single reactivation nudge: their most
 * recent approved+paid certificate is 35-120 days old, they have not been nudged
 * before, and they have NOT ordered another certificate inside the last 35 days
 * (still recently active). One candidate per patient (most recent in-window).
 */
export async function findCertReactivationCandidates(): Promise<ReactivationCandidate[]> {
  const supabase = createServiceRoleClient()

  const windowStart = dateNDaysAgoISO(REACTIVATION_WINDOW_MAX_DAYS) // older bound (120d)
  const windowEnd = dateNDaysAgoISO(REACTIVATION_WINDOW_MIN_DAYS) // newer bound (35d)

  const { data, error } = await supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      created_at,
      exclude_from_reporting,
      patient:profiles!patient_id(email, first_name, email_bounced)
    `)
    .eq("category", "medical_certificate")
    .eq("payment_status", "paid")
    .eq("status", "approved")
    .is("reactivation_email_sent_at", null)
    .gte("created_at", windowStart)
    .lte("created_at", windowEnd)

  if (error) {
    logger.error("Failed to fetch reactivation candidates", { error: error.message })
    return []
  }

  const normalized = (data || [])
    .filter((item) => !item.exclude_from_reporting)
    .map((item) => {
      const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient
      return {
        id: item.id,
        patient_id: item.patient_id,
        created_at: item.created_at,
        patient: patient ?? null,
      } as ReactivationCandidate & {
        patient: (ReactivationCandidate["patient"] & { email_bounced?: boolean }) | null
      }
    })

  const withEmail = normalized.filter(
    (item) => item.patient?.email && !(item.patient as { email_bounced?: boolean }).email_bounced,
  )
  if (withEmail.length === 0) return []

  // Per-patient gating: drop anyone who (a) already received a reactivation email
  // on any intake, or (b) has a newer paid med-cert (ordered again within 35d, so
  // they are recently active and a nudge would be premature).
  const patientIds = Array.from(new Set(withEmail.map((i) => i.patient_id)))
  const recentCutoff = dateNDaysAgoISO(REACTIVATION_WINDOW_MIN_DAYS)
  const { data: history } = await supabase
    .from("intakes")
    .select("patient_id, created_at, reactivation_email_sent_at, category, payment_status")
    .in("patient_id", patientIds)

  const alreadyNudged = new Set<string>()
  const hasNewerMedcert = new Set<string>()
  for (const row of (history || []) as Array<{
    patient_id: string
    created_at: string
    reactivation_email_sent_at: string | null
    category: string | null
    payment_status: string | null
  }>) {
    if (row.reactivation_email_sent_at) alreadyNudged.add(row.patient_id)
    if (
      row.category === "medical_certificate" &&
      row.payment_status === "paid" &&
      row.created_at > recentCutoff
    ) {
      hasNewerMedcert.add(row.patient_id)
    }
  }

  const bestByPatient = new Map<string, ReactivationCandidate>()
  for (const item of withEmail) {
    if (alreadyNudged.has(item.patient_id) || hasNewerMedcert.has(item.patient_id)) continue
    const prev = bestByPatient.get(item.patient_id)
    if (!prev || item.created_at > prev.created_at) bestByPatient.set(item.patient_id, item)
  }

  return Array.from(bestByPatient.values())
}

async function stampReactivated(intakeId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase
    .from("intakes")
    .update({ reactivation_email_sent_at: new Date().toISOString() })
    .eq("id", intakeId)
}

/**
 * Send a single reactivation email and stamp the dedup column. Returns true on send.
 */
export async function sendCertReactivationEmail(candidate: ReactivationCandidate): Promise<boolean> {
  const patient = candidate.patient
  if (!patient?.email) {
    logger.warn("Skipping reactivation - no patient email", { intakeId: candidate.id })
    return false
  }

  const canSend = await canSendMarketingEmail(candidate.patient_id)
  if (!canSend) {
    // Stamp so we stop re-evaluating an opted-out patient on every run.
    await stampReactivated(candidate.id)
    logger.info("Skipping reactivation - opted out", { intakeId: candidate.id })
    return false
  }

  const appUrl = getAppUrl()
  const requestUrl = `${appUrl}/medical-certificate?utm_source=cert_reactivation&utm_medium=email&utm_campaign=reactivation`

  const result = await sendEmail({
    to: patient.email,
    subject: certReactivationSubject,
    template: React.createElement(CertReactivationEmail, {
      patientName: patient.first_name || "there",
      appUrl,
      requestUrl,
    }),
    emailType: "cert_reactivation" as import("./send-email").EmailType,
    patientId: candidate.patient_id,
    metadata: { intake_id: candidate.id },
    tags: [{ name: "category", value: "cert_reactivation" }],
  })

  if (result.success) {
    await stampReactivated(candidate.id)
    logger.info("Sent cert reactivation", { intakeId: candidate.id })
  } else {
    logger.error("Failed to send cert reactivation", { intakeId: candidate.id, error: result.error })
  }

  return result.success
}

/**
 * Send ONE reactivation email to an explicit address for deliverability testing.
 * Bypasses window / consent / dedup (no patient lookup, writes nothing). NOT gated
 * by CERT_REACTIVATION_EMAILS_ENABLED, so it works before the flag is flipped;
 * CRON_SECRET-gated at the route.
 */
export async function sendTestCertReactivation(toEmail: string): Promise<boolean> {
  const appUrl = getAppUrl()
  const requestUrl = `${appUrl}/medical-certificate?utm_source=cert_reactivation&utm_medium=email&utm_campaign=reactivation&test=1`

  const result = await sendEmail({
    to: toEmail,
    subject: certReactivationSubject,
    template: React.createElement(CertReactivationEmail, {
      patientName: "there",
      appUrl,
      requestUrl,
    }),
    emailType: "cert_reactivation" as import("./send-email").EmailType,
    metadata: { test: true },
    tags: [{ name: "category", value: "cert_reactivation_test" }],
  })

  if (result.success) logger.info("Sent TEST cert reactivation", { to: toEmail })
  else logger.error("Failed to send TEST cert reactivation", { to: toEmail, error: result.error })
  return result.success
}

/**
 * Process all reactivation emails. Called from the daily cron. No-ops (without
 * touching the DB) when the feature is disabled.
 */
export async function processCertReactivations(): Promise<{
  enabled: boolean
  sent: number
  failed: number
  candidates: number
}> {
  if (!certReactivationEnabled()) {
    return { enabled: false, sent: 0, failed: 0, candidates: 0 }
  }

  const candidates = await findCertReactivationCandidates()
  let sent = 0
  let failed = 0

  for (const candidate of candidates) {
    const ok = await sendCertReactivationEmail(candidate)
    if (ok) sent++
    else failed++
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  logger.info("Processed cert reactivations", { sent, failed, candidates: candidates.length })
  return { enabled: true, sent, failed, candidates: candidates.length }
}
