import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { APPROVED_CLAIMS, getApprovedClaim } from "@/lib/marketing/approved-claims"

const root = process.cwd()

const read = (file: string) => readFileSync(join(root, file), "utf8")

const supportFiles = [
  "app/clinical-governance/clinical-governance-client.tsx",
  "app/complaints/page.tsx",
  "app/guarantee/page.tsx",
  "app/how-it-works/page.tsx",
  "app/how-we-decide/page.tsx",
  "app/our-doctors/our-doctors-client.tsx",
  "app/refund-policy/page.tsx",
  "app/terms/page.tsx",
  "app/trust/trust-client.tsx",
  "app/what-we-wont-do/page.tsx",
  "app/why-instant/page.tsx",
  "components/marketing/citation-facts.tsx",
  "components/marketing/google-ads-cert.tsx",
  "components/marketing/guarantee-badge.tsx",
  "components/marketing/how-it-works-content.tsx",
  "components/marketing/regulatory-partners.tsx",
  "components/marketing/sections/doctors-guide-section.tsx",
  "components/marketing/sections/how-we-decide-guide-section.tsx",
  "components/marketing/sections/trust-guide-section.tsx",
  "components/seo/schemas/how-to.tsx",
  "components/seo/schemas/organization.tsx",
] as const

const moneyCopyFiles = [
  "components/marketing/hair-loss-landing.tsx",
  "components/marketing/live-wait-time.tsx",
  "components/marketing/med-cert-landing.tsx",
  "components/marketing/prescriptions-landing.tsx",
  "components/marketing/womens-health-landing.tsx",
  "lib/marketing/homepage.ts",
] as const

const supportSource = supportFiles.map(read).join("\n")
const moneyCopySource = moneyCopyFiles.map(read).join("\n")

describe("canonical trust copy contract", () => {
  it("pins the approved high-risk claims used by public trust surfaces", () => {
    expect(getApprovedClaim("refund_payment_process")).toBe(
      "You pay upfront. If the doctor declines, the full request fee and priority fee are automatically refunded to the original payment method.",
    )
    expect(getApprovedClaim("clinical_access_scope")).toBe(
      "Clinical access is role-scoped. Doctors and the owner-admin can access records needed for care; support sees only bounded, masked operational data.",
    )
    expect(getApprovedClaim("clinical_decision_model")).toBe(
      "AI never prescribes or makes clinical decisions. Eligible low-risk certificate requests may be approved under a doctor-owned protocol and are individually reviewed afterward.",
    )
    expect(getApprovedClaim("clinical_review_sequence")).toBe(
      "Prescribing requests receive doctor review before any prescription is issued. Eligible low-risk certificate requests may follow a doctor-owned protocol and are individually reviewed afterward.",
    )
    expect(getApprovedClaim("complaints_timing")).toBe(
      "We acknowledge complaints within 24 hours. Clinical complaints target resolution within 14 days.",
    )
    expect(getApprovedClaim("availability_24_7")).toBe(
      "Requests can be submitted and reviewed 24/7. Review timing varies with clinical complexity, follow-up questions, and queue volume.",
    )
  })

  it("keeps high-risk receipts on canonical or executable sources", () => {
    for (const claim of Object.values(APPROVED_CLAIMS).filter(({ risk }) => risk === "high")) {
      expect(
        claim.sources.some((source) =>
          source === "AGENTS.md"
          || source.startsWith("docs/") && !source.startsWith("docs/audits/")
          || source.startsWith("app/actions/"),
        ),
        claim.id,
      ).toBe(true)

      for (const source of claim.sources) {
        expect(existsSync(join(root, source)), `${claim.id} -> ${source}`).toBe(true)
      }
    }
  })

  it("keeps support pages free of retired or unsupported trust claims", () => {
    for (const pattern of [
      /pay nothing/i,
      /telehealth certified/i,
      /review(?:ed)? follows? when available/i,
      /reviewed when available/i,
      /same standard of care/i,
      /same training/i,
      /professional indemnity insurance/i,
      /continuous registration monitoring/i,
      /penetration test(?:ed|ing)?/i,
      /24 business hours/i,
      /average\s*~?34\s*min/i,
      /PT120M/i,
    ]) {
      expect(supportSource).not.toMatch(pattern)
    }
  })

  it("keeps active money-page mirrors on about three minutes and 24/7 review", () => {
    expect(moneyCopySource).not.toMatch(/(?:about|under|in|~)?\s*2\s+min(?:ute)?s?\b|two minutes/i)
    expect(moneyCopySource).not.toMatch(/review(?:ed)? follows? when available|reviewed when available/i)
    expect(moneyCopySource).toContain("about 3 minutes")
    expect(moneyCopySource).toContain("24/7")
  })

  it("keeps public process order branch-aware", () => {
    const branchAwareFiles = [
      "app/how-we-decide/page.tsx",
      "app/trust/trust-client.tsx",
      "app/why-instant/page.tsx",
      "lib/marketing/homepage.ts",
    ]

    for (const file of branchAwareFiles) {
      expect(read(file), file).toContain('getApprovedClaim("clinical_review_sequence")')
    }

    const medCert = read("components/marketing/med-cert-landing.tsx")
    expect(medCert).toContain("description: CLINICAL_DECISION_MODEL")

    const processSource = [...branchAwareFiles, "components/marketing/med-cert-landing.tsx"]
      .map(read)
      .join("\n")
    expect(processSource).not.toMatch(/title:\s*["']A (?:real )?doctor reviews (?:it|your request)["']|Request enters review queue|Doctor reviews your case|ourSteps=\{\[[^\]]*Doctor reviews your request|real AHPRA-registered doctor reviews it/i)
  })

  it("does not mislabel the conservative wait display as measured telemetry", () => {
    const whyInstant = read("app/why-instant/page.tsx")

    expect(whyInstant).not.toContain("SOCIAL_PROOF")
    expect(whyInstant).not.toMatch(/InstantMed median|half are faster|half are slower|like for like|recent internal medical-certificate request telemetry/i)
    expect(whyInstant).toContain("InstantMed does not use them to promise a review time")
  })

  it("keeps refund, governance, and complaint qualifications aligned", () => {
    const terms = read("app/terms/page.tsx")
    const guarantee = read("app/guarantee/page.tsx")
    const complaints = read("app/complaints/page.tsx")

    expect(terms).not.toContain("audit cadence")
    expect(terms).not.toContain("If your request is <strong>approved</strong>, no refund is available.")
    expect(terms).toContain("Confirmed service failures")
    expect(terms).toContain("Australian Consumer Law")
    expect(guarantee).not.toContain("The only thing that ends the request without a refund")
    expect(guarantee).toContain("Cancellations, expired requests, and completed services follow the refund policy")
    expect(complaints.match(/COMPLAINTS_TIMING/g)).toHaveLength(2)
    expect(complaints).not.toMatch(/resolution or a substantive response within 14 calendar days/i)
  })

  it("feeds visible and structured how-it-works content from the same datasets", () => {
    const source = read("app/how-it-works/page.tsx")

    expect(source).toContain("<FAQSchema faqs={howItWorksFaqs} />")
    expect(source).toContain("<HowItWorksContent faqs={howItWorksFaqs} processSteps={howItWorksSteps} />")
    expect(source).toContain("steps={howItWorksSteps.map")
    expect(source).not.toContain("PT120M")
  })

  it("keeps certification and guarantee semantics exact", () => {
    const organization = read("components/seo/schemas/organization.tsx")
    const googleBadge = read("components/marketing/google-ads-cert.tsx")
    const guaranteeBadge = read("components/marketing/guarantee-badge.tsx")
    const regulatoryContext = read("components/marketing/regulatory-partners.tsx")

    expect(organization).not.toMatch(/credentialCategory:\s*["']AHPRA/i)
    expect(organization).not.toMatch(/credentialCategory:\s*["']Google Ads/i)
    expect(googleBadge).toContain("aria-label={qualification}")
    expect(googleBadge).toContain('role="img"')
    expect(googleBadge).not.toContain("Telehealth Certified")
    expect(guaranteeBadge).toContain('title="Read the full refund guarantee"')
    expect(regulatoryContext).toContain("Listed for context only; none endorses InstantMed.")
    expect(regulatoryContext).not.toContain("Compliance stack")
  })

  it("keeps canonical docs pointed at the approved-claims owner", () => {
    const docs = [
      "DESIGN.md",
      "docs/BRAND.md",
      "docs/CLINICAL.md",
      "docs/PRIMITIVES.md",
      "docs/VOICE.md",
    ].map(read).join("\n")

    expect(docs).toContain("lib/marketing/approved-claims.ts")
    expect(docs).toContain(getApprovedClaim("clinical_decision_model"))
    expect(docs).toContain(getApprovedClaim("complaints_timing"))
    expect(docs).toContain(getApprovedClaim("doctor_registration"))
    expect(docs).not.toContain("Faster than your GP. Same training.")
    expect(docs).not.toContain("24 business hours")
  })
})
