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
})
