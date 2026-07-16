import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { APPROVED_CLAIMS, getApprovedClaim } from "@/lib/marketing/approved-claims"
import {
  BRAND_THESIS,
  FORM_FIRST_WEDGE,
  GUARANTEE,
  GUARANTEE_LABEL,
  ICONIC_HOOK,
  MED_CERT_WEDGE,
  PROP_PHRASE,
  TAGLINE,
  TAGLINE_PAID_SAFE,
} from "@/lib/marketing/voice"

const root = process.cwd()

describe("approved claims registry", () => {
  it("feeds the canonical brand voice constants", () => {
    expect(BRAND_THESIS).toBe(getApprovedClaim("brand_thesis"))
    expect(TAGLINE).toBe(getApprovedClaim("tagline"))
    expect(TAGLINE_PAID_SAFE).toBe(getApprovedClaim("tagline_paid_safe"))
    expect(MED_CERT_WEDGE).toBe(getApprovedClaim("med_cert_wedge"))
    expect(FORM_FIRST_WEDGE).toBe(getApprovedClaim("form_first_wedge"))
    expect(PROP_PHRASE).toBe(getApprovedClaim("prop_phrase"))
    expect(ICONIC_HOOK).toBe(getApprovedClaim("iconic_hook"))
    expect(GUARANTEE).toBe(getApprovedClaim("refund_guarantee"))
    expect(GUARANTEE_LABEL).toBe(getApprovedClaim("refund_guarantee_label"))
    expect(GUARANTEE_LABEL).not.toBe(GUARANTEE)
  })

  it("keeps high-risk no-call language scoped to medical certificates", () => {
    expect(APPROVED_CLAIMS.med_cert_wedge.contexts).toEqual(["medical_certificate"])
    expect(APPROVED_CLAIMS.trust_simple_cert_label.contexts).toEqual(["medical_certificate"])
    expect(APPROVED_CLAIMS.form_first_wedge.contexts).toEqual(["prescribing", "specialty"])
    expect(APPROVED_CLAIMS.form_first_wedge.text).toBe(
      "Complete a secure clinical form. A doctor reviews it and may call you briefly before prescribing.",
    )
    expect(APPROVED_CLAIMS.form_first_wedge.text).not.toContain("only interrupt")
  })

  it("keeps prescribing wedge docs aligned with the approved claim", () => {
    const docs = [
      "docs/BUSINESS_PLAN.md",
      "docs/VOICE.md",
      "docs/ADVERTISING_COMPLIANCE.md",
      "docs/PRIMITIVES.md",
    ].map((file) => readFileSync(join(root, file), "utf8")).join("\n")

    expect(docs).toContain(APPROVED_CLAIMS.form_first_wedge.text)
    expect(docs).not.toContain("A doctor contacts you only if more information is clinically needed")
  })

  it("keeps trust badges wired to approved trust primitive copy", () => {
    const trustBadgesSource = readFileSync(
      join(root, "lib/marketing/trust-badges.ts"),
      "utf8",
    )

    expect(trustBadgesSource).toContain('getApprovedClaim("trust_no_appointment_label")')
    expect(trustBadgesSource).toContain('getApprovedClaim("trust_talk_if_needed_tooltip")')
    expect(trustBadgesSource).toContain('getApprovedClaim("refund_guarantee_label")')
    expect(trustBadgesSource).toContain('getApprovedClaim("clinical_decision_model")')
    expect(trustBadgesSource).toContain('getApprovedClaim("google_healthcare_ads_label")')
    expect(trustBadgesSource).toContain('getApprovedClaim("legitscript_tooltip")')
    expect(trustBadgesSource).not.toContain("94% of certificates delivered same day")
    expect(trustBadgesSource).not.toContain("Legally valid certificate")
  })

  it("keeps canonical high-risk trust claims exact", () => {
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
    expect(getApprovedClaim("availability_24_7")).toContain("submitted and reviewed 24/7")
    expect(getApprovedClaim("google_healthcare_ads_tooltip")).toContain(
      "Online Pharmacy Certification / healthcare promotion",
    )
  })

  it("gives every approved claim a resolvable source receipt", () => {
    for (const claim of Object.values(APPROVED_CLAIMS)) {
      expect(claim.sources.length, claim.id).toBeGreaterThan(0)
      for (const source of claim.sources) {
        const file = source.split("#", 1)[0]
        expect(existsSync(join(root, file)), `${claim.id} -> ${source}`).toBe(true)
      }
    }
  })

  it("labels Google certification as advertising eligibility, not telehealth approval", () => {
    const googleBadgeSource = readFileSync(
      join(root, "components/marketing/google-ads-cert.tsx"),
      "utf8",
    )

    expect(googleBadgeSource).toContain("Online Pharmacy Certification")
    expect(googleBadgeSource).toContain('getApprovedClaim("google_healthcare_ads_tooltip")')
    expect(googleBadgeSource).toContain("aria-label={qualification}")
    expect(googleBadgeSource).toContain('role="img"')
    expect(googleBadgeSource).not.toContain("Telehealth Certified")
  })
})
