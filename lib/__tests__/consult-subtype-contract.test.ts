import { describe, expect, it } from "vitest"

import {
  BLOCKED_CONSULT_SUBTYPES,
  CONSULT_SUBTYPE_LABELS,
  isConsultSubtypeAvailable,
  isConsultSubtypeKey,
  normalizeConsultSubtypeParam,
} from "@/lib/request/consult-subtypes"
import { getStepsForService, type StepContext } from "@/lib/request/step-registry"
import { validateAnswersServerSide } from "@/lib/request/unified-checkout"
import { getActiveServices, getComingSoonServices } from "@/lib/services/service-catalog"

const identity = {
  email: "patient@example.com",
  fullName: "Pat Example",
  dateOfBirth: "1985-04-01",
  phone: "0412345678",
}

const sharedMedicalHistory = {
  hasAllergies: false,
  hasConditions: false,
  hasOtherMedications: false,
  isPregnantOrBreastfeeding: false,
  hasAdverseMedicationReactions: false,
}

const baseContext: StepContext = {
  isAuthenticated: false,
  hasProfile: false,
  hasCompleteIdentity: false,
  hasMedicare: false,
  hasAddress: false,
  serviceType: "consult",
  answers: {},
}

describe("consult subtype contract", () => {
  it("keeps service-catalog consult launch state aligned with request routing", () => {
    const activeConsultSubtypes = getActiveServices()
      .filter((service) => service.serviceRoute === "consult")
      .map((service) => service.subtype)
      .filter((subtype): subtype is string => Boolean(subtype))
      .filter(isConsultSubtypeKey)

    const comingSoonConsultSubtypes = getComingSoonServices()
      .filter((service) => service.serviceRoute === "consult")
      .map((service) => service.subtype)
      .filter((subtype): subtype is string => Boolean(subtype))
      .filter(isConsultSubtypeKey)

    expect([...BLOCKED_CONSULT_SUBTYPES].sort()).toEqual(comingSoonConsultSubtypes.sort())

    for (const subtype of [...activeConsultSubtypes, ...comingSoonConsultSubtypes]) {
      expect(isConsultSubtypeKey(subtype)).toBe(true)
      expect(CONSULT_SUBTYPE_LABELS).toHaveProperty(subtype)
    }

    for (const subtype of activeConsultSubtypes) {
      expect(isConsultSubtypeAvailable(subtype)).toBe(true)
      expect(getStepsForService("consult", { ...baseContext, answers: { consultSubtype: subtype } })).not.toHaveLength(0)
    }

    for (const subtype of comingSoonConsultSubtypes) {
      expect(isConsultSubtypeAvailable(subtype)).toBe(false)
      expect(getStepsForService("consult", { ...baseContext, answers: { consultSubtype: subtype } })).toHaveLength(0)
    }
  })

  it("rejects legacy or unknown consult subtypes — no fallback flow exists after the 2026-05-20 general consult retirement", () => {
    expect(normalizeConsultSubtypeParam("womens-health")).toBe("womens_health")
    expect(normalizeConsultSubtypeParam("womens_health_uti")).toBeUndefined()

    expect(
      validateAnswersServerSide("consult", {
        consultSubtype: "womens_health_uti",
        ...sharedMedicalHistory,
      }, identity),
    ).toContain("Please choose a consultation type")
  })
})
