/**
 * Privacy-safe request-type label for patient-facing emails.
 *
 * Email subjects and preview text render on lock screens and in shared
 * inboxes, so sensitive consult subtypes (ED, hair loss, women's health,
 * weight loss) are always masked to plain "consultation" — the specific
 * pathway must never appear in a subject or preview line. Raw category
 * enums ("medical_certificate") must never reach a patient either.
 *
 * This is the one formatter every patient email subject goes through.
 * Do not add per-subtype consult labels back; that reintroduces the leak.
 */
export function emailRequestTypeLabel(
  category: string | null | undefined,
  subtype?: string | null,
): string {
  switch (category) {
    case "medical_certificate":
    case "med_cert":
    case "med_certs":
      return "medical certificate"
    case "prescription":
    case "repeat_script":
    case "repeat_rx":
      return "prescription"
    case "consult":
    case "consultation":
      // Deliberately ignores subtype: "ED consultation" in a subject line
      // discloses a health condition to anyone who can see the inbox.
      return "consultation"
    case "referral":
      if (subtype === "imaging") return "imaging referral"
      if (subtype === "pathology") return "pathology referral"
      return "referral"
    default:
      return "request"
  }
}

/** Stripe Checkout metadata sometimes carries only a service slug. */
const SLUG_TO_CATEGORY: Record<string, string> = {
  "med-cert-sick": "medical_certificate",
  "med-cert-carer": "medical_certificate",
  "common-scripts": "prescription",
  consult: "consult",
}

/**
 * Same masking, resolved from Stripe session metadata (category may be
 * absent when only service_slug was set on the Checkout Session).
 */
export function emailRequestTypeLabelFromStripeMetadata(meta: {
  category?: string | null
  subtype?: string | null
  serviceSlug?: string | null
}): string {
  const category = meta.category || SLUG_TO_CATEGORY[meta.serviceSlug ?? ""] || null
  return emailRequestTypeLabel(category, meta.subtype)
}
