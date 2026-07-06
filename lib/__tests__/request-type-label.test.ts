/**
 * Privacy-safe email subject labels (lib/email/request-type-label.ts).
 *
 * Pins two invariants from the 2026-07-06 email audit:
 *  1. Sensitive consult subtypes (ED, hair loss, women's health, weight loss)
 *     NEVER surface in a patient email subject label — always "consultation".
 *  2. Raw category enums ("medical_certificate") never pass through verbatim.
 */
import { describe, expect, it } from "vitest"

import {
  emailRequestTypeLabel,
  emailRequestTypeLabelFromStripeMetadata,
} from "@/lib/email/request-type-label"

describe("emailRequestTypeLabel", () => {
  it("humanizes the raw category enums", () => {
    expect(emailRequestTypeLabel("medical_certificate")).toBe("medical certificate")
    expect(emailRequestTypeLabel("prescription")).toBe("prescription")
    expect(emailRequestTypeLabel("consult")).toBe("consultation")
  })

  it("masks every sensitive consult subtype to plain consultation", () => {
    for (const subtype of ["ed", "hair_loss", "womens_health", "weight_loss", "general", null]) {
      expect(emailRequestTypeLabel("consult", subtype)).toBe("consultation")
    }
  })

  it("never echoes an unknown category back to the patient", () => {
    expect(emailRequestTypeLabel("something_internal")).toBe("request")
    expect(emailRequestTypeLabel(null)).toBe("request")
    expect(emailRequestTypeLabel(undefined)).toBe("request")
  })

  it("keeps non-sensitive referral subtypes specific", () => {
    expect(emailRequestTypeLabel("referral", "imaging")).toBe("imaging referral")
    expect(emailRequestTypeLabel("referral", "pathology")).toBe("pathology referral")
    expect(emailRequestTypeLabel("referral")).toBe("referral")
  })

  it("no output ever contains an underscore or a sensitive condition", () => {
    const categories = ["medical_certificate", "prescription", "consult", "referral", "junk", null]
    const subtypes = ["ed", "hair_loss", "womens_health", "weight_loss", "imaging", null]
    for (const category of categories) {
      for (const subtype of subtypes) {
        const label = emailRequestTypeLabel(category, subtype)
        expect(label).not.toMatch(/_/)
        expect(label.toLowerCase()).not.toMatch(/\bed\b|hair|women|weight/)
      }
    }
  })
})

describe("emailRequestTypeLabelFromStripeMetadata", () => {
  it("resolves from category when present", () => {
    expect(
      emailRequestTypeLabelFromStripeMetadata({ category: "consult", subtype: "ed" }),
    ).toBe("consultation")
  })

  it("falls back to the service slug when category is missing", () => {
    expect(emailRequestTypeLabelFromStripeMetadata({ serviceSlug: "med-cert-sick" })).toBe(
      "medical certificate",
    )
    expect(emailRequestTypeLabelFromStripeMetadata({ serviceSlug: "med-cert-carer" })).toBe(
      "medical certificate",
    )
    expect(emailRequestTypeLabelFromStripeMetadata({ serviceSlug: "common-scripts" })).toBe(
      "prescription",
    )
    expect(emailRequestTypeLabelFromStripeMetadata({ serviceSlug: "consult", subtype: "ed" })).toBe(
      "consultation",
    )
  })

  it("degrades to request when nothing is resolvable", () => {
    expect(emailRequestTypeLabelFromStripeMetadata({})).toBe("request")
  })
})
