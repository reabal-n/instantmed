import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { TELEHEALTH_CONSENT_VERSION } from "@/lib/constants"
import { transformAnswersForUnifiedCheckout } from "@/lib/request/unified-checkout"
import { hasCheckoutConsent } from "@/lib/stripe/checkout/consent"

describe("explicit checkout consent", () => {
  const consent = { agreedToTerms: true, confirmedAccuracy: true, telehealthConsentVersion: TELEHEALTH_CONSENT_VERSION, telehealthConsentGiven: true }
  it("accepts explicit documented aliases", () => {
    expect(hasCheckoutConsent(consent)).toBe(true)
    expect(hasCheckoutConsent({ terms_agreed: true, accuracy_confirmed: true, telehealth_consent_version: TELEHEALTH_CONSENT_VERSION, telehealth_consent_given: true })).toBe(true)
  })
  it.each([undefined, "2026-02", "unexpected"])("requires current disclosure version %s", version => {
    expect(hasCheckoutConsent({ ...consent, telehealthConsentVersion: version })).toBe(false)
  })
  it.each([undefined, false, "true", 1, null])("rejects missing or non-boolean telehealth agreement %s", value => {
    expect(hasCheckoutConsent({ ...consent, telehealthConsentGiven: value })).toBe(false)
  })
  it.each(["agreedToTerms", "confirmedAccuracy"])("requires %s independently", key => {
    expect(hasCheckoutConsent({ ...consent, [key]: false })).toBe(false)
  })
  it.each([
    ["terms_agreed", false], ["accuracy_confirmed", "true"],
    ["telehealth_consent_given", false], ["telehealth_consent_version", "2026-02"],
  ])("rejects conflicting canonical alias %s", (key, value) => {
    expect(hasCheckoutConsent({ ...consent, [key]: value })).toBe(false)
    expect(hasCheckoutConsent(transformAnswersForUnifiedCheckout("med-cert", { ...consent, [key]: value }))).toBe(false)
  })
  it.each([
    "lib/stripe/checkout/auth-and-profile.ts", "lib/stripe/guest-checkout.ts",
    "lib/stripe/checkout/retry-payment.ts", "lib/stripe/checkout/guest-resume.ts",
  ])("enforces the shared consent boundary in %s", file => {
    expect(readFileSync(file, "utf8")).toMatch(/if \(!hasCheckoutConsent\(/)
  })
  it("does not expose internal answer hashing as an action", () => {
    expect(readFileSync("app/actions/drafts/draft-validation.ts", "utf8")).not.toContain("export async function computeIntakeHash")
    expect(readFileSync("lib/data/intake-answer-hash.ts", "utf8")).toContain('import "server-only"')
  })
})
