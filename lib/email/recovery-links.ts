import { signCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"

export interface PartialIntakeRecoveryUrlDraft {
  consultSubtype?: "ed" | "hair_loss" | "womens_health" | null
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

export type CheckoutPaymentRecoveryCampaign =
  | "abandoned_checkout"
  | "abandoned_checkout_followup"
  | "payment_failed"
  | "async_payment_failed"

export type ExpiredCheckoutRecoveryCampaign = "checkout_expired"

function addRecoveryAttribution(
  url: URL,
  campaign: CheckoutPaymentRecoveryCampaign | ExpiredCheckoutRecoveryCampaign,
) {
  url.searchParams.set("utm_source", "recovery_email")
  url.searchParams.set("utm_medium", "email")
  url.searchParams.set("utm_campaign", campaign)
}

/**
 * Build a retry URL for an unpaid checkout-stage intake.
 * Guests use a signed /resume/[token] route (unauthenticated).
 * Authenticated patients keep the existing /patient/intakes/[id]?retry=true route.
 */
export function buildCheckoutPaymentRecoveryUrl({
  appUrl,
  campaign,
  intakeId,
  isGuest,
}: {
  appUrl: string
  campaign: CheckoutPaymentRecoveryCampaign
  intakeId: string
  isGuest?: boolean
}): string {
  const base = appUrl.replace(/\/$/, "")
  if (isGuest) {
    const token = signCheckoutResumeToken(intakeId)
    const url = new URL(`/resume/${encodeURIComponent(token)}`, base)
    addRecoveryAttribution(url, campaign)
    return url.toString()
  }
  const url = new URL(`/patient/intakes/${encodeURIComponent(intakeId)}`, base)
  url.searchParams.set("retry", "true")
  addRecoveryAttribution(url, campaign)
  return url.toString()
}

export type AbandonedCheckoutRecoveryCampaign =
  | "abandoned_checkout"
  | "abandoned_checkout_followup"

export function buildAbandonedCheckoutResumeUrl(input: {
  appUrl: string
  campaign: AbandonedCheckoutRecoveryCampaign
  intakeId: string
  isGuest?: boolean
}): string {
  return buildCheckoutPaymentRecoveryUrl(input)
}

function getRequestStartPath(category?: string | null): string {
  if (category === "consult") return "/request"
  return "/request"
}

function getRequestServiceParam(category?: string | null): string | null {
  if (category === "medical_certificate") return "med-cert"
  if (category === "prescription") return "repeat-script"
  if (category === "consult") return "consult"
  return null
}

/**
 * Build a recovery URL for terminal expired checkouts.
 * Expired intakes are not retryable, so this starts a fresh request instead of
 * linking to a dead payment retry path.
 */
export function buildExpiredCheckoutStartUrl({
  appUrl,
  campaign,
  category,
  subtype,
}: {
  appUrl: string
  campaign: ExpiredCheckoutRecoveryCampaign
  category?: string | null
  subtype?: string | null
}): string {
  const base = appUrl.replace(/\/$/, "")
  const url = new URL(getRequestStartPath(category), base)
  const service = getRequestServiceParam(category)

  if (service) {
    url.searchParams.set("service", service)
  }
  if (service === "consult" && subtype) {
    url.searchParams.set("subtype", subtype)
  }
  addRecoveryAttribution(url, campaign)
  return url.toString()
}
