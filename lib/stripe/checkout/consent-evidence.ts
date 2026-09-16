import "server-only"

import { isDeepStrictEqual } from "node:util"

import type { SupabaseClient } from "@supabase/supabase-js"

import { TELEHEALTH_CONSENT_VERSION } from "@/lib/constants"
import { getIntakeAnswersForPaymentSafety } from "@/lib/data/intake-answers"
import { getProfileById } from "@/lib/data/profiles"
import { createLogger } from "@/lib/observability/logger"

import { normalizeGuestName, normalizeGuestPhone } from "../guest-profile-dedupe"
import { buildPrescribingProfileUpdates, type CheckoutIdentityInput } from "../prescribing-profile-fields"
import { hasCheckoutConsent } from "./consent"

const logger = createLogger("checkout-consent-evidence")
export const CONSENT_EVIDENCE_ERROR = "We couldn't verify your consent for this saved request. Return to Review and confirm your information and telehealth agreement again. If this continues, contact support."
interface ConsentReceipt { revision: string; receipt_id: string; received_at: string }
type EvidenceResult = { ok: true; receipt: ConsentReceipt } | { ok: false }
function isReceipt(value: unknown): value is ConsentReceipt {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<ConsentReceipt>
  return typeof row.revision === "string" && typeof row.receipt_id === "string" && typeof row.received_at === "string"
}

const CONSENT_FIELDS = new Set([
  "terms_agreed", "agreedToTerms", "accuracy_confirmed", "confirmedAccuracy",
  "telehealth_consent_given", "telehealthConsentGiven", "telehealth_consent_version", "telehealthConsentVersion",
])
function episodeAnswers(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(value))).filter(([key]) => !CONSENT_FIELDS.has(key)))
}

/** Read-only: recovery never turns historic answers or payment into an attestation. */
export async function hasDurableCheckoutConsent(supabase: SupabaseClient, intakeId: string): Promise<boolean> {
  try {
    const result = await supabase.rpc("get_checkout_consent_state", {
      p_intake_id: intakeId, p_version: TELEHEALTH_CONSENT_VERSION,
    })
    return !result.error && isReceipt(result.data)
  } catch { return false }
}

/** Only a fresh explicit submission may create evidence. Receipt time is server receipt time, not click time. */
export async function ensureCheckoutConsentEvidence(supabase: SupabaseClient, args: {
  intakeId: string; patientId: string; answers: Record<string, unknown>; identity?: CheckoutIdentityInput
}): Promise<EvidenceResult> {
  if (!hasCheckoutConsent(args.answers)) return { ok: false }
  try {
    const state = await supabase.rpc("get_checkout_consent_state", {
      p_intake_id: args.intakeId, p_version: TELEHEALTH_CONSENT_VERSION,
    })
    if (state.error || typeof state.data?.revision !== "string") return { ok: false }
    // Capture revision BEFORE authoritative decryption. The atomic writer rejects
    // intervening answer or identity changes without including clinical content in audit.
    const persisted = await getIntakeAnswersForPaymentSafety(args.intakeId)
    if (!persisted || !isDeepStrictEqual(episodeAnswers(persisted), episodeAnswers(args.answers))) return { ok: false }
    const profile = await getProfileById(args.patientId)
    if (!profile) return { ok: false }
    if (args.identity?.fullName && normalizeGuestName(args.identity.fullName) !== normalizeGuestName(profile.full_name)) return { ok: false }
    if (args.identity?.dateOfBirth && args.identity.dateOfBirth.trim() !== profile.date_of_birth) return { ok: false }
    if (args.identity?.phone && normalizeGuestPhone(args.identity.phone) !== normalizeGuestPhone(profile.phone)) return { ok: false }
    const prescribing = buildPrescribingProfileUpdates(args.answers)
    for (const [key, value] of Object.entries(prescribing)) {
      if (key !== "onboarding_completed" && profile[key as keyof typeof profile] !== value) return { ok: false }
    }
    const result = await supabase.rpc("record_checkout_consent", {
      p_intake_id: args.intakeId, p_patient_id: args.patientId,
      p_revision: state.data.revision, p_version: TELEHEALTH_CONSENT_VERSION,
    })
    if (!result.error && isReceipt(result.data)) return { ok: true, receipt: result.data }
  } catch { /* Recoverable and payload-free. Do not make unrelated audit failures fatal. */ }
  logger.error("Checkout consent receipt unavailable", { reason: "durable_receipt_failed" })
  return { ok: false }
}
