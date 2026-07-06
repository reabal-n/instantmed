"use server"

import * as React from "react"

import { getAppUrl } from "@/lib/config/env"
import { createLogger } from "@/lib/observability/logger"
import { decryptJSONB, type EncryptedPHI } from "@/lib/security/phi-encryption"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import {
  PartialIntakeRecoveryEmail,
  partialIntakeRecoverySubject,
} from "./components/templates/partial-intake-recovery"
import { buildPartialIntakeRecoveryUrl } from "./recovery-links"
import { sendEmail } from "./send-email"
import { getSuppressedEmails } from "./suppression"

const logger = createLogger("partial-intake-recovery")

const SERVICE_NAMES: Record<string, string> = {
  "med-cert": "Medical Certificate",
  prescription: "Repeat Prescription",
  consult: "Doctor Consultation",
}

// Recovery window: drafts that have been idle for 60-360 minutes get the email.
// Don't email faster than 60 min (user might still be active in another tab).
// Don't email beyond 6 hours since drafts older than that have a much lower
// rescue rate and we don't want to feel like spam to occasional visitors.
const MIN_IDLE_MINUTES = 60
const MAX_IDLE_HOURS = 6

interface PartialDraft {
  session_id: string
  service_type: string
  email: string
  first_name: string | null
  updated_at: string
  answers_encrypted: EncryptedPHI | null
}

function isEncryptedPHI(value: unknown): value is EncryptedPHI {
  if (!value || typeof value !== "object") return false

  const candidate = value as Partial<EncryptedPHI>
  return (
    typeof candidate.ciphertext === "string" &&
    typeof candidate.encryptedDataKey === "string" &&
    typeof candidate.iv === "string" &&
    typeof candidate.authTag === "string" &&
    typeof candidate.keyId === "string" &&
    typeof candidate.version === "number"
  )
}

async function getRecoveryConsultSubtype(draft: PartialDraft): Promise<"ed" | "hair_loss" | "womens_health" | null> {
  if (draft.service_type !== "consult") return null
  if (isEncryptedPHI(draft.answers_encrypted)) {
    try {
      const answers = await decryptJSONB<Record<string, unknown>>(draft.answers_encrypted)
      const subtype = answers.consultSubtype

      if (subtype === "ed" || subtype === "hair_loss" || subtype === "womens_health") {
        return subtype
      }
    } catch (err) {
      logger.warn("Could not decrypt consult subtype for partial-intake recovery URL", {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return null
}

/**
 * Find drafts that are eligible for a recovery email.
 *
 * Eligibility:
 *   - email is captured (otherwise we have nothing to send to)
 *   - converted_to_intake_id is null (real intake not yet submitted)
 *   - includes review/checkout drafts that have not created an intake yet
 *   - recovery_email_sent_at is null (one email per draft, ever)
 *   - updated_at is between MIN_IDLE_MINUTES and MAX_IDLE_HOURS old
 *
 * Real payment-stage abandoned checkout remains owned by
 * lib/email/abandoned-checkout.ts once a pending_payment intake exists.
 */
async function findEligibleDrafts(): Promise<PartialDraft[]> {
  const supabase = createServiceRoleClient()

  const idleSince = new Date(Date.now() - MIN_IDLE_MINUTES * 60 * 1000).toISOString()
  const tooOld = new Date(Date.now() - MAX_IDLE_HOURS * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("partial_intakes")
    .select("session_id, service_type, email, first_name, updated_at, answers_encrypted")
    .not("email", "is", null)
    .is("converted_to_intake_id", null)
    .is("recovery_email_sent_at", null)
    .lte("updated_at", idleSince)
    .gte("updated_at", tooOld)
    .order("updated_at", { ascending: true })
    .limit(50) // safety cap per cron run

  if (error) {
    logger.error("Failed to fetch eligible drafts", { error: error.message })
    return []
  }

  return (data ?? []) as PartialDraft[]
}

async function markRecoverySent(sessionId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from("partial_intakes")
    .update({ recovery_email_sent_at: new Date().toISOString() })
    .eq("session_id", sessionId)

  if (error) {
    logger.warn("Failed to mark recovery_email_sent_at", { sessionId, error: error.message })
  }
}

/**
 * Process all eligible partial intakes and send recovery emails.
 *
 * Returns counters that the cron route forwards to the response.
 */
export async function processPartialIntakeRecoveries(): Promise<{
  found: number
  sent: number
  failed: number
}> {
  const drafts = await findEligibleDrafts()
  if (drafts.length === 0) {
    return { found: 0, sent: 0, failed: 0 }
  }

  // Spam Act gate: drop drafts whose address is on the account-less
  // suppression list OR belongs to a profile that opted out of marketing.
  // Stamp them so the cron stops re-evaluating an opted-out address daily.
  const suppressed = await getSuppressedEmails(drafts.map((d) => d.email))
  const sendable: PartialDraft[] = []
  for (const draft of drafts) {
    if (suppressed.has(draft.email.trim().toLowerCase())) {
      await markRecoverySent(draft.session_id)
      logger.info("Skipping recovery email - suppressed/opted out", { sessionId: draft.session_id })
    } else {
      sendable.push(draft)
    }
  }

  const appUrl = getAppUrl()
  let sent = 0
  let failed = 0

  for (const draft of sendable) {
    const serviceName = SERVICE_NAMES[draft.service_type] ?? "request"
    // UTM attribution so PostHog/GA can credit recoveries that complete to
    // purchase. captureAttribution() in lib/analytics/attribution.ts persists
    // these to sessionStorage on landing, then the success page surfaces them
    // back into the purchase_completed event.
    const resumeUrl = buildPartialIntakeRecoveryUrl({
      appUrl,
      draft: {
        consultSubtype: await getRecoveryConsultSubtype(draft),
        serviceType: draft.service_type,
        sessionId: draft.session_id,
      },
    })

    try {
      const result = await sendEmail({
        to: draft.email,
        toName: draft.first_name ?? undefined,
        subject: partialIntakeRecoverySubject(serviceName),
        template: React.createElement(PartialIntakeRecoveryEmail, {
          firstName: draft.first_name ?? "",
          serviceName,
          resumeUrl,
          appUrl,
        }),
        emailType: "partial_intake_recovery",
        // Drafts have no profile, so the unsubscribe must be email-keyed —
        // without this the recipient has no working opt-out (Spam Act s18).
        unsubscribeEmail: draft.email,
        metadata: {
          draft_session_id: draft.session_id,
          service_type: draft.service_type,
        },
      })

      if (result.success) {
        await markRecoverySent(draft.session_id)
        sent += 1
      } else {
        failed += 1
        logger.warn("Recovery email failed", {
          sessionId: draft.session_id,
          error: result.error,
        })
      }
    } catch (err) {
      failed += 1
      logger.error("Recovery email threw", {
        sessionId: draft.session_id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { found: drafts.length, sent, failed }
}
