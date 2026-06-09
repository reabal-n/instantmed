import "server-only"

import * as React from "react"

import { getAppUrl } from "@/lib/config/env"
import { signHeardAboutUsToken } from "@/lib/crypto/heard-about-us-token"
import { SEEDED_E2E_PATIENT_PROFILE_ID } from "@/lib/data/seeded-e2e-data"
import {
  HeardAboutUsAskEmail,
  heardAboutUsAskSubject,
} from "@/lib/email/components/templates/heard-about-us-ask"
import { canSendMarketingEmail } from "@/lib/email/preferences"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { sendEmail } from "./send-email"

const logger = createLogger("heard-about-us-backfill")

export interface BackfillCandidate {
  intakeId: string
  patientId: string
  email: string
  firstName: string | null
}

type IntakeRow = {
  id: string
  patient_id: string | null
  referrer: string | null
  exclude_from_reporting: boolean | null
  patient: { email: string | null; first_name: string | null; email_bounced: boolean | null } | null
}

/**
 * Historical Direct/Unknown buyers we could never attribute in code (no utm,
 * no gclid/gbraid, no external referrer — referrer-stripped dark traffic) who
 * haven't self-reported yet. One candidate per patient (most recent order, which
 * is the intake the one-click link attributes). Excludes seeded E2E, excluded-
 * from-reporting, bounced emails, and patients we've already asked (outbox dedup,
 * so re-runs are safe). Marketing consent is checked per-send.
 */
export async function findHeardAboutUsBackfillCandidates(): Promise<BackfillCandidate[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("intakes")
    .select(
      `id, patient_id, created_at, referrer, exclude_from_reporting,
       patient:profiles!patient_id(email, first_name, email_bounced)`,
    )
    .in("payment_status", ["paid", "partially_refunded", "refunded"])
    .is("heard_about_us", null)
    .is("utm_source", null)
    .is("gclid", null)
    .is("gbraid", null)
    .order("created_at", { ascending: false })

  if (error) {
    logger.error("Failed to fetch backfill candidates", { error: error.message })
    return []
  }

  // Outbox dedup: patients already sent this one-time email.
  const { data: alreadyAsked } = await supabase
    .from("email_outbox")
    .select("patient_id")
    .eq("email_type", "heard_about_us_backfill")
  const asked = new Set(
    (alreadyAsked || []).map((r) => (r as { patient_id: string | null }).patient_id).filter(Boolean),
  )

  const seen = new Set<string>()
  const candidates: BackfillCandidate[] = []

  // Supabase types the !patient_id join as an array; normalize per-row below.
  for (const raw of (data || []) as unknown as IntakeRow[]) {
    if (raw.exclude_from_reporting) continue
    if (!raw.patient_id || raw.patient_id === SEEDED_E2E_PATIENT_PROFILE_ID) continue
    if (seen.has(raw.patient_id) || asked.has(raw.patient_id)) continue

    // An external referrer means we DO know the source — skip (only the dark
    // cohort needs the survey). A self-path referrer ("/request") is not a source.
    const ref = (raw.referrer || "").trim()
    if (ref && !ref.startsWith("/")) continue

    const patient = Array.isArray(raw.patient) ? raw.patient[0] : raw.patient
    if (!patient?.email || patient.email_bounced) continue

    seen.add(raw.patient_id)
    candidates.push({
      intakeId: raw.id,
      patientId: raw.patient_id,
      email: patient.email,
      firstName: patient.first_name ?? null,
    })
  }

  return candidates
}

/** Send one backfill email (marketing-consent gated). Returns true on send. */
export async function sendHeardAboutUsBackfill(candidate: BackfillCandidate): Promise<boolean> {
  const canSend = await canSendMarketingEmail(candidate.patientId)
  if (!canSend) {
    logger.info("Skipping backfill - opted out", { patientId: candidate.patientId })
    return false
  }

  let token: string
  try {
    token = signHeardAboutUsToken(candidate.intakeId)
  } catch (err) {
    logger.error("Cannot sign token for backfill", {
      intakeId: candidate.intakeId,
      error: err instanceof Error ? err.message : String(err),
    })
    return false
  }

  const appUrl = getAppUrl()
  const result = await sendEmail({
    to: candidate.email,
    subject: heardAboutUsAskSubject,
    template: React.createElement(HeardAboutUsAskEmail, {
      patientName: candidate.firstName || "there",
      appUrl,
      heardToken: token,
    }),
    emailType: "heard_about_us_backfill",
    patientId: candidate.patientId,
    intakeId: candidate.intakeId,
    metadata: { backfill: true },
    tags: [{ name: "category", value: "heard_about_us_backfill" }],
  })

  if (!result.success) {
    logger.error("Failed to send backfill", { intakeId: candidate.intakeId, error: result.error })
  }
  return result.success
}

/**
 * One-time processor. dryRun returns the candidate count without sending.
 * Optional limit caps the batch (useful for a staged first send).
 */
export async function processHeardAboutUsBackfill(
  opts: { limit?: number; dryRun?: boolean } = {},
): Promise<{ candidates: number; sent: number; failed: number; dryRun: boolean }> {
  const all = await findHeardAboutUsBackfillCandidates()
  const batch = typeof opts.limit === "number" ? all.slice(0, opts.limit) : all

  if (opts.dryRun) {
    return { candidates: batch.length, sent: 0, failed: 0, dryRun: true }
  }

  let sent = 0
  let failed = 0
  for (const candidate of batch) {
    const ok = await sendHeardAboutUsBackfill(candidate)
    if (ok) sent++
    else failed++
    await new Promise((resolve) => setTimeout(resolve, 120))
  }

  logger.info("Processed attribution backfill", { sent, failed, candidates: batch.length })
  return { candidates: batch.length, sent, failed, dryRun: false }
}
