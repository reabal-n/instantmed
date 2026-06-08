export interface PartialIntakeRecoveryUrlDraft {
  consultSubtype?: "ed" | "hair_loss" | null
  serviceType: string
  sessionId: string
}

export function buildPartialIntakeRecoveryUrl({
  appUrl,
  draft,
}: {
  appUrl: string
  draft: PartialIntakeRecoveryUrlDraft
}): string {
  const baseUrl = appUrl.replace(/\/$/, "")
  const url = new URL(draft.serviceType === "consult" && !draft.consultSubtype ? "/consult" : "/request", baseUrl)

  if (draft.serviceType !== "consult" || draft.consultSubtype) {
    url.searchParams.set("service", draft.serviceType)
  }
  if (draft.consultSubtype) {
    url.searchParams.set("subtype", draft.consultSubtype)
  }
  url.searchParams.set("d", draft.sessionId)
  url.searchParams.set("utm_source", "recovery_email")
  url.searchParams.set("utm_medium", "email")
  url.searchParams.set("utm_campaign", "partial_intake_recovery")
  url.searchParams.set("utm_content", draft.serviceType)

  // Retired bare consult drafts cannot safely resume into checkout. Send them
  // to the services overview instead of a dead `/request?service=consult` URL.
  return url.toString()
}

import { signCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"

export type AbandonedCheckoutRecoveryCampaign = "abandoned_checkout" | "abandoned_checkout_followup"

/**
 * Build a checkout resume URL.
 * Guests use a signed /resume/[token] route (unauthenticated).
 * Authenticated patients keep the existing /patient/intakes/[id]?retry=true route.
 */
export function buildAbandonedCheckoutResumeUrl({
  appUrl,
  campaign,
  intakeId,
  isGuest,
}: {
  appUrl: string
  campaign: AbandonedCheckoutRecoveryCampaign
  intakeId: string
  isGuest?: boolean
}): string {
  const base = appUrl.replace(/\/$/, "")
  if (isGuest) {
    const token = signCheckoutResumeToken(intakeId)
    const url = new URL(`/resume/${encodeURIComponent(token)}`, base)
    url.searchParams.set("utm_source", "recovery_email")
    url.searchParams.set("utm_medium", "email")
    url.searchParams.set("utm_campaign", campaign)
    return url.toString()
  }
  const url = new URL(`/patient/intakes/${encodeURIComponent(intakeId)}`, base)
  url.searchParams.set("retry", "true")
  url.searchParams.set("utm_source", "recovery_email")
  url.searchParams.set("utm_medium", "email")
  url.searchParams.set("utm_campaign", campaign)
  return url.toString()
}
