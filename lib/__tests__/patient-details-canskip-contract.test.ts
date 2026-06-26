import { describe, expect, it } from "vitest"

import { getStepsForService, type StepContext } from "@/lib/request/step-registry"

// Contract test pinning the patient-details `canSkip` rule for every
// non-medcert service. Belt-and-braces on top of
// `prescribing-identity-gate-contract.test.ts`, this asserts that the step
// registry actually consumes the gate correctly: a non-medcert flow keeps
// the `details` step in the sequence unless EVERY identity field is present
// on the profile (Medicare + address + sex + phone).
//
// A future contributor who narrows `requiresPrescribingIdentityForRequest`
// back to an allowlist of consult subtypes, OR drops a required field from
// `canSkip`, will break these tests.
//
// Operator rule (2026-05-21): the full identity bundle is mandatory for
// every service EXCEPT medical certificates.

describe("patient-details canSkip contract", () => {
  const fullyIdentified: StepContext = {
    isAuthenticated: true,
    hasProfile: true,
    hasCompleteIdentity: true,
    hasMedicare: true,
    hasAddress: true,
    hasPhone: true,
    hasSex: true,
    serviceType: "consult",
    answers: { consultSubtype: "ed" },
  }

  describe("ED consult", () => {
    it("skips details when the patient has the full identity bundle on profile", () => {
      const steps = getStepsForService("consult", fullyIdentified).map((s) => s.id)
      expect(steps).not.toContain("details")
    })

    it("keeps details when Medicare is missing", () => {
      const steps = getStepsForService("consult", {
        ...fullyIdentified,
        hasMedicare: false,
      }).map((s) => s.id)
      expect(steps).toContain("details")
    })

    it("keeps details when phone is missing", () => {
      const steps = getStepsForService("consult", {
        ...fullyIdentified,
        hasPhone: false,
      }).map((s) => s.id)
      expect(steps).toContain("details")
    })

    it("keeps details when address is missing", () => {
      const steps = getStepsForService("consult", {
        ...fullyIdentified,
        hasAddress: false,
      }).map((s) => s.id)
      expect(steps).toContain("details")
    })

    it("keeps details when prescribing sex is missing", () => {
      const steps = getStepsForService("consult", {
        ...fullyIdentified,
        hasSex: false,
      }).map((s) => s.id)
      expect(steps).toContain("details")
    })

    it("keeps details when the patient is not authenticated", () => {
      const steps = getStepsForService("consult", {
        ...fullyIdentified,
        isAuthenticated: false,
      }).map((s) => s.id)
      expect(steps).toContain("details")
    })
  })

  describe("repeat prescription", () => {
    const prescriptionContext: StepContext = {
      ...fullyIdentified,
      serviceType: "repeat-script",
      answers: {},
    }

    it("skips details when the patient has the full identity bundle on profile", () => {
      const steps = getStepsForService("repeat-script", prescriptionContext).map((s) => s.id)
      expect(steps).not.toContain("details")
    })

    it("keeps details when Medicare is missing", () => {
      const steps = getStepsForService("repeat-script", {
        ...prescriptionContext,
        hasMedicare: false,
      }).map((s) => s.id)
      expect(steps).toContain("details")
    })

    it("keeps details when phone is missing", () => {
      const steps = getStepsForService("repeat-script", {
        ...prescriptionContext,
        hasPhone: false,
      }).map((s) => s.id)
      expect(steps).toContain("details")
    })

    it("keeps details when address is missing", () => {
      const steps = getStepsForService("repeat-script", {
        ...prescriptionContext,
        hasAddress: false,
      }).map((s) => s.id)
      expect(steps).toContain("details")
    })

    it("keeps details when prescribing sex is missing", () => {
      const steps = getStepsForService("repeat-script", {
        ...prescriptionContext,
        hasSex: false,
      }).map((s) => s.id)
      expect(steps).toContain("details")
    })

    it("keeps details when the patient is not authenticated", () => {
      const steps = getStepsForService("repeat-script", {
        ...prescriptionContext,
        isAuthenticated: false,
      }).map((s) => s.id)
      expect(steps).toContain("details")
    })
  })

  // The remaining live consult subtypes route through the same
  // CONSULT_REVIEW_TAIL as ED, so they must share the identical gated identity
  // step. Pin them explicitly so a future subtype-specific flow can't drop the
  // shared step or its gate.
  const liveConsultSubtypes: Array<{ label: string; subtype: string }> = [
    { label: "hair-loss consult", subtype: "hair_loss" },
    { label: "women's-health consult", subtype: "womens_health" },
  ]

  for (const { label, subtype } of liveConsultSubtypes) {
    describe(label, () => {
      const ctx: StepContext = { ...fullyIdentified, answers: { consultSubtype: subtype } }
      const stepIds = (override: Partial<StepContext>) =>
        getStepsForService("consult", { ...ctx, ...override }).map((s) => s.id)

      it("skips details when the patient has the full identity bundle on profile", () => {
        expect(stepIds({})).not.toContain("details")
      })

      it("keeps details when Medicare is missing", () => {
        expect(stepIds({ hasMedicare: false })).toContain("details")
      })

      it("keeps details when phone is missing", () => {
        expect(stepIds({ hasPhone: false })).toContain("details")
      })

      it("keeps details when address is missing", () => {
        expect(stepIds({ hasAddress: false })).toContain("details")
      })

      it("keeps details when prescribing sex is missing", () => {
        expect(stepIds({ hasSex: false })).toContain("details")
      })

      it("keeps details when the patient is not authenticated", () => {
        expect(stepIds({ isAuthenticated: false })).toContain("details")
      })
    })
  }
})
