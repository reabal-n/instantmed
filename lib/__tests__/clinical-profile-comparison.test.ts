import { describe, expect, it } from "vitest"

import { buildClinicalProfileDifferences } from "@/lib/clinical/case-summary"

describe("buildClinicalProfileDifferences", () => {
  it("identifies clinically relevant differences without merging request and saved-profile sources", () => {
    const differences = buildClinicalProfileDifferences({
      answers: {
        known_allergies: "No known allergies",
        existing_conditions: "Hypercholesterolaemia",
        current_medications: "Atorvastatin 20 mg",
      },
      profile: {
        allergies: ["Penicillin"],
        conditions: ["Asthma"],
        current_medications: ["Salbutamol"],
      },
    })

    expect(differences).toEqual([
      {
        key: "allergies",
        label: "Allergies",
        currentRequest: "No known allergies",
        savedProfile: "Penicillin",
        severity: "warning",
      },
      {
        key: "conditions",
        label: "Conditions",
        currentRequest: "Hypercholesterolaemia",
        savedProfile: "Asthma",
        severity: "info",
      },
      {
        key: "current_medications",
        label: "Current medicines",
        currentRequest: "Atorvastatin 20 mg",
        savedProfile: "Salbutamol",
        severity: "info",
      },
    ])
  })

  it("supports shared and specialty intake aliases without route-specific logic", () => {
    const profile = {
      allergies: ["Penicillin"],
      conditions: ["Asthma"],
      current_medications: ["Salbutamol"],
    }

    expect(buildClinicalProfileDifferences({
      answers: {
        hasAllergies: false,
        hasConditions: false,
        hasOtherMedications: false,
      },
      profile,
    })).toHaveLength(3)

    expect(buildClinicalProfileDifferences({
      answers: {
        has_allergies: "no",
        has_conditions: "no",
        takes_medications: "no",
      },
      profile,
    })).toHaveLength(3)

    expect(buildClinicalProfileDifferences({
      answers: {
        has_other_medications: false,
      },
      profile,
    })).toEqual([
      expect.objectContaining({
        key: "current_medications",
        currentRequest: "None reported",
      }),
    ])
  })

  it("does not invent a conflict for equivalent, missing, or empty saved-profile values", () => {
    expect(buildClinicalProfileDifferences({
      answers: {
        allergies: "penicillin",
        conditions: "Diabetes; Asthma",
        otherMedications: "Metformin, Salbutamol",
      },
      profile: {
        allergies: ["Penicillin"],
        conditions: ["Asthma", "Diabetes"],
        current_medications: ["salbutamol", "metformin"],
      },
    })).toEqual([])

    expect(buildClinicalProfileDifferences({
      answers: {},
      profile: {
        allergies: ["Penicillin"],
        conditions: ["Asthma"],
        current_medications: ["Salbutamol"],
      },
    })).toEqual([])

    expect(buildClinicalProfileDifferences({
      answers: {
        known_allergies: "No known allergies",
        existing_conditions: "None reported",
        current_medications: "None reported",
      },
      profile: {
        allergies: [],
        conditions: [],
        current_medications: [],
      },
    })).toEqual([])

    expect(buildClinicalProfileDifferences({ answers: {}, profile: null })).toEqual([])
  })
})
