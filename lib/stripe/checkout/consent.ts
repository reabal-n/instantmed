import { TELEHEALTH_CONSENT_VERSION } from "@/lib/constants"

/** Per-request clinical consent is independent of optional cookie preferences. */
export function hasCheckoutConsent(answers: Record<string, unknown>): boolean {
  return (answers.telehealth_consent_version === TELEHEALTH_CONSENT_VERSION || answers.telehealthConsentVersion === TELEHEALTH_CONSENT_VERSION)
    && (answers.terms_agreed === true || answers.agreedToTerms === true)
    && (answers.accuracy_confirmed === true || answers.confirmedAccuracy === true)
    && (answers.telehealth_consent_given === true || answers.telehealthConsentGiven === true)
}

export const CHECKOUT_CONSENT_ERROR = "Please confirm the terms, accuracy of your information and telehealth agreement before proceeding."
