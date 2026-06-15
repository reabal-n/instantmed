import { describe, expect, it } from "vitest"

import { requiresPrescribingIdentityForRequest } from "@/lib/request/prescribing-identity"

// Operator rule (2026-06-15): prescribing services require the prescribing
// identity bundle (Medicare-or-IHI + sex + phone + structured address).
// Medical certificates collect name + email + DOB only, so they stay exempt
// from this gate.
//
// The gate is expressed as "anything that is not a med cert" so any future
// service or consult subtype inherits the correct rule without a code change.
// This test pins that behavior — do not narrow the gate back to an allowlist
// of consult subtypes without first updating the operator rule.

describe("requiresPrescribingIdentityForRequest", () => {
  describe("med certs are exempt", () => {
    it("returns false for medical_certificate category", () => {
      expect(requiresPrescribingIdentityForRequest({ category: "medical_certificate" })).toBe(false)
    })

    it("returns false for med_certs legacy category alias", () => {
      expect(requiresPrescribingIdentityForRequest({ category: "med_certs" })).toBe(false)
    })

    it("returns false for med_cert service type", () => {
      expect(requiresPrescribingIdentityForRequest({ serviceType: "med_cert" })).toBe(false)
    })

    it("returns false for med-cert service type (canonical hyphenated form)", () => {
      // Regression: the live /request flow uses the hyphenated form per
      // types/services.ts UnifiedServiceType. Missing this match caused
      // every med-cert intake to demand Medicare + address at checkout,
      // killing conversion on a service that explicitly does not need
      // those fields. See CLAUDE.md "Eligibility" row.
      expect(requiresPrescribingIdentityForRequest({ serviceType: "med-cert" })).toBe(false)
    })

    it("returns false regardless of subtype on med certs (work, study, carer)", () => {
      for (const subtype of ["work", "study", "carer"]) {
        expect(
          requiresPrescribingIdentityForRequest({ category: "medical_certificate", subtype }),
        ).toBe(false)
      }
    })
  })

  describe("prescriptions always require identity", () => {
    it("returns true for prescription category", () => {
      expect(requiresPrescribingIdentityForRequest({ category: "prescription" })).toBe(true)
    })

    it("returns true for common_scripts service type", () => {
      expect(requiresPrescribingIdentityForRequest({ serviceType: "common_scripts" })).toBe(true)
    })

    it("returns true for repeat_rx service type", () => {
      expect(requiresPrescribingIdentityForRequest({ serviceType: "repeat_rx" })).toBe(true)
    })

    it("returns true for repeat-script service type", () => {
      expect(requiresPrescribingIdentityForRequest({ serviceType: "repeat-script" })).toBe(true)
    })
  })

  describe("consults always require identity (every subtype)", () => {
    it("returns true for ED consult", () => {
      expect(
        requiresPrescribingIdentityForRequest({ category: "consult", subtype: "ed" }),
      ).toBe(true)
    })

    it("returns true for hair_loss consult", () => {
      expect(
        requiresPrescribingIdentityForRequest({ category: "consult", subtype: "hair_loss" }),
      ).toBe(true)
    })

    it("returns true for retired or gated subtypes that may reactivate later", () => {
      // general, infection, mental_health, weight_loss, womens_health, etc.
      // The rule applies to ALL consult subtypes by design.
      for (const subtype of [
        "general",
        "infection",
        "mental_health",
        "weight_loss",
        "womens_health",
        "future_unknown_subtype",
      ]) {
        expect(
          requiresPrescribingIdentityForRequest({ category: "consult", subtype }),
        ).toBe(true)
      }
    })

    it("returns true for consult with no subtype declared", () => {
      expect(requiresPrescribingIdentityForRequest({ category: "consult" })).toBe(true)
    })
  })

  describe("safe defaults", () => {
    it("returns false when category and serviceType are both empty (no signal)", () => {
      expect(requiresPrescribingIdentityForRequest({})).toBe(false)
      expect(requiresPrescribingIdentityForRequest({ category: "", serviceType: "" })).toBe(false)
      expect(requiresPrescribingIdentityForRequest({ category: null, serviceType: null })).toBe(false)
    })

    it("treats whitespace-only inputs as empty", () => {
      expect(
        requiresPrescribingIdentityForRequest({ category: "   ", serviceType: "  " }),
      ).toBe(false)
    })
  })
})
