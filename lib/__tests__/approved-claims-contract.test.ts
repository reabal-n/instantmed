import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { APPROVED_CLAIMS, getApprovedClaim } from "@/lib/marketing/approved-claims"
import {
  BRAND_THESIS,
  FORM_FIRST_WEDGE,
  GUARANTEE,
  ICONIC_HOOK,
  MED_CERT_WEDGE,
  PROP_PHRASE,
  TAGLINE,
  TAGLINE_PAID_SAFE,
  WEDGE,
} from "@/lib/marketing/voice"

const root = process.cwd()

describe("approved claims registry", () => {
  it("feeds the canonical brand voice constants", () => {
    expect(BRAND_THESIS).toBe(getApprovedClaim("brand_thesis"))
    expect(TAGLINE).toBe(getApprovedClaim("tagline"))
    expect(TAGLINE_PAID_SAFE).toBe(getApprovedClaim("tagline_paid_safe"))
    expect(WEDGE).toBe(getApprovedClaim("platform_wedge"))
    expect(MED_CERT_WEDGE).toBe(getApprovedClaim("med_cert_wedge"))
    expect(FORM_FIRST_WEDGE).toBe(getApprovedClaim("form_first_wedge"))
    expect(PROP_PHRASE).toBe(getApprovedClaim("prop_phrase"))
    expect(ICONIC_HOOK).toBe(getApprovedClaim("iconic_hook"))
    expect(GUARANTEE).toBe(getApprovedClaim("refund_guarantee"))
  })

  it("keeps high-risk no-call language scoped to medical certificates", () => {
    expect(APPROVED_CLAIMS.med_cert_wedge.contexts).toEqual(["medical_certificate"])
    expect(APPROVED_CLAIMS.trust_simple_cert_label.contexts).toEqual(["medical_certificate"])
    expect(APPROVED_CLAIMS.form_first_wedge.text).toContain("We only interrupt you")
  })

  it("keeps trust badges wired to approved trust primitive copy", () => {
    const trustBadgesSource = readFileSync(
      join(root, "lib/marketing/trust-badges.ts"),
      "utf8",
    )

    expect(trustBadgesSource).toContain('getApprovedClaim("trust_no_appointment_label")')
    expect(trustBadgesSource).toContain('getApprovedClaim("trust_talk_if_needed_tooltip")')
    expect(trustBadgesSource).not.toContain("94% of certificates delivered same day")
    expect(trustBadgesSource).not.toContain("Legally valid certificate")
  })
})
