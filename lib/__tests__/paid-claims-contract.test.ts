import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

const PAID_CLAIM_FILES = [
  "app/about/about-client.tsx",
  "app/alternatives/page.tsx",
  "app/business/page.tsx",
  "app/consult/page.tsx",
  "app/guarantee/page.tsx",
  "app/how-it-works/page.tsx",
  "app/online-doctor-australia/page.tsx",
  "app/pricing/layout.tsx",
  "app/pricing/page.tsx",
  "app/pricing/pricing-content.tsx",
  "app/trust/trust-client.tsx",
  "app/why-instant/page.tsx",
  "components/seo/seo-page-template.tsx",
  "components/marketing/erectile-dysfunction-landing.tsx",
  "components/marketing/hair-loss-landing.tsx",
  "components/marketing/hero.tsx",
  "components/marketing/how-it-works-content.tsx",
  "components/marketing/prescriptions-landing.tsx",
  "components/marketing/sections/final-cta-section.tsx",
  "components/marketing/sections/pricing-guide-section.tsx",
  "components/request/steps/checkout-step.tsx",
  "components/request/steps/review-step.tsx",
  "lib/data/general-faq.ts",
  "lib/data/med-cert-faq.ts",
  "lib/marketing/approved-claims.ts",
  "lib/marketing/homepage.ts",
  "lib/marketing/service-funnel-configs.ts",
  "lib/microcopy/anxiety-reducers.ts",
  "lib/seo/pages/definitions.ts",
]

const LEGACY_PAID_CLAIM_PATTERNS = [
  /Full refund if (?:our doctor|we) (?:can(?:'|’|&apos;)t|cannot) help/i,
  /Refund if we (?:can(?:'|’|&apos;)t|cannot) help/i,
  /If our doctor (?:can(?:'|’|&apos;)t|cannot) help/i,
  /Avg response:/i,
  /Same-day response/i,
  /Only pay (?:if|when|when you need care\s*-\s*and only if) (?:we|the doctor) can help/i,
  /If our doctor (?:can(?:'|’|&apos;)t|cannot) issue what you asked for/i,
  /no questions asked/i,
  /No questions,\s*no paperwork/i,
]

describe("paid-facing claims contract", () => {
  it("keeps refund copy conditional on doctor decline rather than no-questions language", () => {
    const hits = PAID_CLAIM_FILES.flatMap((file) => {
      const text = source(file)
      return LEGACY_PAID_CLAIM_PATTERNS
        .filter((pattern) => pattern.test(text))
        .map((pattern) => `${file}: ${pattern}`)
    })

    expect(hits).toEqual([])
    expect(source("components/request/steps/checkout-step.tsx")).not.toContain("partial for consults")
  })

  it("keeps paid prescribing and specialty pages away from stale average-response claims", () => {
    expect(source("components/marketing/prescriptions-landing.tsx")).not.toContain("Avg response:")
    expect(source("components/marketing/erectile-dysfunction-landing.tsx")).not.toContain("Avg response:")
    expect(source("components/marketing/hair-loss-landing.tsx")).not.toContain("Avg response:")
  })

  it("does not market public doctor identity as a named-doctor promise", () => {
    const doctorsPage = source("app/our-doctors/our-doctors-client.tsx")

    expect(doctorsPage).not.toMatch(/\bnamed,\s*AHPRA-registered/i)
    expect(doctorsPage).not.toMatch(/named-AHPRA-doctor/i)
  })
})
