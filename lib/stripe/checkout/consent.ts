import { TELEHEALTH_CONSENT_VERSION } from "@/lib/constants"

/** Per-request clinical consent is independent of optional cookie preferences. */
export function hasCheckoutConsent(answers: Record<string, unknown>): boolean {
  const explicitAgreement = (keys: string[], expected: unknown): boolean => {
    const supplied = keys.filter(key => answers[key] !== undefined)
    return supplied.length > 0 && supplied.every(key => answers[key] === expected)
  }
  return explicitAgreement(["telehealth_consent_version", "telehealthConsentVersion"], TELEHEALTH_CONSENT_VERSION)
    && explicitAgreement(["terms_agreed", "agreedToTerms"], true)
    && explicitAgreement(["accuracy_confirmed", "confirmedAccuracy"], true)
    && explicitAgreement(["telehealth_consent_given", "telehealthConsentGiven"], true)
}

export const CHECKOUT_CONSENT_ERROR = "Please confirm the terms, accuracy of your information and telehealth agreement before proceeding."
