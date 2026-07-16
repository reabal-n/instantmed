import { signCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import { buildDraftResumePath } from "@/lib/request/draft-resume-route"

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
}): string | null {
  const baseUrl = appUrl.replace(/\/$/, "")
  const resumePath = buildDraftResumePath({
    serviceType: draft.serviceType,
    consultSubtype: draft.consultSubtype,
    sessionId: draft.sessionId,
  })
  if (!resumePath) return null

  const url = new URL(resumePath, baseUrl)
  url.searchParams.set("utm_source", "recovery_email")
  url.searchParams.set("utm_medium", "email")
  url.searchParams.set("utm_campaign", "partial_intake_recovery")
  url.searchParams.set("utm_content", draft.serviceType)

  return url.toString()
}

export type CheckoutPaymentRecoveryCampaign =
  | "abandoned_checkout"
  | "abandoned_checkout_followup"
  | "payment_failed"
  | "async_payment_failed"
  | "support_payment_recovery"

export type ExpiredCheckoutRecoveryCampaign = "checkout_expired"

export function buildSignedCheckoutResumeUrl({
  appUrl,
  intakeId,
}: {
  appUrl: string
  intakeId: string
}): string {
  const base = appUrl.replace(/\/$/, "")
  const token = signCheckoutResumeToken(intakeId)
  return new URL(`/resume/${encodeURIComponent(token)}`, base).toString()
}

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
    const url = new URL(buildSignedCheckoutResumeUrl({ appUrl: base, intakeId }))
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
