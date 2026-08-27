import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { PRICING } from "@/lib/constants"
import { getStepsForService, type StepContext } from "@/lib/request/step-registry"
import { deriveEdNitrateTerminalBlock } from "@/lib/request/terminal-safety-blocks"
import {
  validateEdGoalsStep,
  validateEdHealthStep,
  validateEdPreferencesStep,
  validateHairLossAssessmentStep,
  validateHairLossGoalsStep,
  validateHairLossHealthStep,
  validateHairLossPreferencesStep,
  type ValidationResult,
} from "@/lib/request/validation"

const root = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

function consultContext(subtype: "ed" | "hair_loss"): StepContext {
  return {
    isAuthenticated: false,
    hasProfile: false,
    hasCompleteIdentity: false,
    hasMedicare: false,
    hasAddress: false,
    hasPhone: false,
    hasSex: false,
    serviceType: "consult",
    answers: { consultSubtype: subtype },
  }
}

function expectEveryKeyRequired(
  validator: (answers: Record<string, unknown>) => ValidationResult,
  validAnswers: Record<string, unknown>,
  requiredKeys: readonly string[],
) {
  expect(validator(validAnswers).isValid).toBe(true)

  for (const key of requiredKeys) {
    const withoutKey = { ...validAnswers }
    delete withoutKey[key]
    expect(validator(withoutKey).isValid, `${key} must remain required`).toBe(false)
  }
}

const ED_VALID = {
  edDuration: "3_to_12_months",
  edErectionFrequency: 3,
  edNitrates: false,
  edAlphaBlockers: false,
  edRecentHeartEvent: false,
  edSevereHeart: false,
  takes_medications: "no",
  has_allergies: "no",
  has_conditions: "no",
  edPreference: "prn",
  previousEdMeds: false,
} as const

const HAIR_VALID = {
  hairGoal: "maintain",
  hairOnset: "over_12_months",
  hairPattern: "crown",
  hairFamilyHistory: "yes",
  hairReproductive: "no",
  scalpNone: true,
  hairLowBP: false,
  hairHeartConditions: false,
  takes_medications: "no",
  has_allergies: "no",
  has_conditions: "no",
  hairMedicationPreference: "doctor_recommendation",
} as const

describe("specialty experience clinical and no-friction invariants", () => {
  it("keeps the five-screen ED and six-screen Hair sequences unchanged", () => {
    expect(getStepsForService("consult", consultContext("ed")).map((step) => step.id)).toEqual([
      "ed-goals",
      "ed-health",
      "ed-preferences",
      "details",
      "review",
    ])
    expect(getStepsForService("consult", consultContext("hair_loss")).map((step) => step.id)).toEqual([
      "hair-loss-goals",
      "hair-loss-assessment",
      "hair-loss-health",
      "hair-loss-preferences",
      "details",
      "review",
    ])
  })

  it("keeps ED service-specific answer requirements and conditional details unchanged", () => {
    expectEveryKeyRequired(validateEdGoalsStep, ED_VALID, ["edDuration", "edErectionFrequency"])
    expectEveryKeyRequired(validateEdHealthStep, ED_VALID, [
      "edNitrates",
      "edAlphaBlockers",
      "edRecentHeartEvent",
      "edSevereHeart",
      "takes_medications",
      "has_allergies",
      "has_conditions",
    ])
    expectEveryKeyRequired(validateEdPreferencesStep, ED_VALID, ["edPreference", "previousEdMeds"])

    expect(validateEdHealthStep({ ...ED_VALID, edRecentHeartEvent: true }).isValid).toBe(false)
    expect(validateEdHealthStep({ ...ED_VALID, edRecentHeartEvent: true, edGpCleared: true }).isValid).toBe(true)
    expect(validateEdHealthStep({ ...ED_VALID, takes_medications: "yes" }).isValid).toBe(false)
    expect(validateEdHealthStep({ ...ED_VALID, takes_medications: "yes", current_medications: "recorded" }).isValid).toBe(true)
    expect(validateEdPreferencesStep({ ...ED_VALID, previousEdMeds: true }).isValid).toBe(false)
    expect(validateEdPreferencesStep({ ...ED_VALID, previousEdMeds: true, edPreviousTreatment: "recorded" }).isValid).toBe(true)
  })

  it("keeps Hair service-specific answer requirements and conditional details unchanged", () => {
    expectEveryKeyRequired(validateHairLossGoalsStep, HAIR_VALID, ["hairGoal", "hairOnset"])
    expectEveryKeyRequired(validateHairLossAssessmentStep, HAIR_VALID, ["hairPattern", "hairFamilyHistory"])
    expectEveryKeyRequired(validateHairLossHealthStep, HAIR_VALID, [
      "hairReproductive",
      "scalpNone",
      "hairLowBP",
      "hairHeartConditions",
      "takes_medications",
      "has_allergies",
      "has_conditions",
    ])
    expectEveryKeyRequired(validateHairLossPreferencesStep, HAIR_VALID, ["hairMedicationPreference"])

    expect(validateHairLossHealthStep({ ...HAIR_VALID, has_allergies: "yes" }).isValid).toBe(false)
    expect(validateHairLossHealthStep({ ...HAIR_VALID, has_allergies: "yes", known_allergies: "recorded" }).isValid).toBe(true)
    expect(validateHairLossHealthStep({ ...HAIR_VALID, takes_medications: "yes" }).isValid).toBe(false)
    expect(validateHairLossHealthStep({ ...HAIR_VALID, takes_medications: "yes", current_medications: "recorded" }).isValid).toBe(true)
  })

  it("keeps terminal safety behavior present in validation and patient UI", () => {
    expect(deriveEdNitrateTerminalBlock({ edNitrates: true })).toMatchObject({ kind: "ed_nitrates" })
    expect(validateEdHealthStep({ ...ED_VALID, edNitrates: true }).isValid).toBe(false)
    expect(validateHairLossHealthStep({ ...HAIR_VALID, hairReproductive: "yes" }).isValid).toBe(false)

    const edHealth = read("components/request/steps/ed-health-step.tsx")
    const hairHealth = read("components/request/steps/hair-loss-health-step.tsx")
    expect(edHealth).toContain("deriveEdNitrateTerminalBlock(answers)")
    expect(edHealth).toContain("if (terminalBlock)")
    expect(hairHealth).toContain('const isBlocked = hairReproductive === "yes"')
    expect(hairHealth).toContain("if (isBlocked)")
  })

  it("keeps both specialty review prices constant-backed", () => {
    expect(PRICING.MENS_HEALTH).toBe(49.95)
    expect(PRICING.HAIR_LOSS).toBe(49.95)

    expect(read("components/marketing/erectile-dysfunction-landing.tsx")).toContain(
      "PRICING_DISPLAY.MENS_HEALTH",
    )
    expect(read("components/marketing/hair-loss-landing.tsx")).toContain(
      "PRICING_DISPLAY.HAIR_LOSS",
    )
  })

  it("keeps public Hair and ED acquisition copy inside the approved boundary", () => {
    const publicSource = [
      "components/marketing/erectile-dysfunction-landing.tsx",
      "app/erectile-dysfunction/page.tsx",
      "components/marketing/hair-loss-landing.tsx",
      "app/hair-loss/page.tsx",
    ].map(read).join("\n")

    expect(publicSource).not.toMatch(
      /\b(viagra|cialis|sildenafil|tadalafil|pde5|finasteride|minoxidil|propecia|rogaine|nizoral|dutasteride)\b/i,
    )
    expect(publicSource).not.toMatch(/\b(?:guaranteed prescription|guaranteed treatment|treatment guaranteed)\b/i)
    expect(publicSource).not.toMatch(/\bno call needed\b/i)
    expect(publicSource).not.toMatch(/\b(?:review hours?|8am\s*[-–]\s*10pm|08:00\s*[-–]\s*22:00)\b/i)
    expect(publicSource).not.toMatch(/\b(?:before[- ]and[- ]after|before\/after)\b/i)
    expect(publicSource).not.toMatch(/\b(?:contact|call|email|message|notify)\s+(?:your\s+)?employer\b/i)
    expect(publicSource).not.toMatch(/(?:A\$|\$)\s*49\.95/)
  })
})
