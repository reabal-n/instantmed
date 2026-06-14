import { describe, expect, it } from "vitest"

import {
  MED_CERT_INTENT_SLUGS,
  MED_CERT_SLUG_CERT_TYPE,
} from "@/lib/marketing/med-cert-intent-config"
import {
  buildMedCertRequestHref,
  isValidCertCategory,
} from "@/lib/marketing/med-cert-selector"

// Pins the intent-page -> wizard prefill contract. Every med-cert intent
// landing page must hand the wizard a concrete certType so step 1 arrives as
// a confirmation, not a cold 3-decision pick (the -43% cert->symptoms leak).
describe("MED_CERT_SLUG_CERT_TYPE", () => {
  it("maps every intent slug to a valid cert category", () => {
    for (const slug of MED_CERT_INTENT_SLUGS) {
      const category = MED_CERT_SLUG_CERT_TYPE[slug]
      expect(category, `slug "${slug}" must map to a cert category`).toBeDefined()
      expect(isValidCertCategory(category)).toBe(true)
    }
  })

  it("maps education intents to study and care intents to carer", () => {
    expect(MED_CERT_SLUG_CERT_TYPE.study).toBe("study")
    expect(MED_CERT_SLUG_CERT_TYPE.university).toBe("study")
    expect(MED_CERT_SLUG_CERT_TYPE.school).toBe("study")
    expect(MED_CERT_SLUG_CERT_TYPE.carer).toBe("carer")
  })

  it("defaults work and personal-illness intents to work", () => {
    const workSlugs = [
      "work",
      "sick-leave",
      "flu",
      "migraine",
      "gastro",
      "back-pain",
      "covid",
      "work-from-home",
      "anxiety",
      "return-to-work",
      "centrelink",
    ] as const
    for (const slug of workSlugs) {
      expect(MED_CERT_SLUG_CERT_TYPE[slug]).toBe("work")
    }
  })

  it("builds a prefilled request href that seeds certType + duration", () => {
    expect(
      buildMedCertRequestHref({ category: MED_CERT_SLUG_CERT_TYPE.flu, duration: "1" })
    ).toBe("/request?service=med-cert&certType=work&duration=1")
    expect(
      buildMedCertRequestHref({ category: MED_CERT_SLUG_CERT_TYPE.university, duration: "1" })
    ).toBe("/request?service=med-cert&certType=study&duration=1")
  })
})
