import { describe, expect, it } from "vitest"

import {
  hasSpecialtyExperienceActivationHistory,
  normalizeSpecialtyExperienceVersion,
  SPECIALTY_EXPERIENCES,
  type SpecialtyExperienceDefinition,
} from "@/lib/growth/specialty-experiences"

describe("specialty experience registry", () => {
  const activeSpecialtyExperiences = SPECIALTY_EXPERIENCES.filter(
    (experience) => experience.status === "active",
  )

  it("allowlists the dated, opaque approach versions and their public surfaces", () => {
    expect(SPECIALTY_EXPERIENCES.map((experience) => experience.id)).toEqual([
      "spx_h1_20260828",
      "spx_h2_20260828",
      "spx_h3_20260828",
      "spx_e1_20260828",
      "spx_e2_20260828",
      "spx_e3_20260828",
    ])

    expect(SPECIALTY_EXPERIENCES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "spx_h1_20260828",
          service: "hair_loss",
          surface: "landing",
          status: "active",
          publicLandingPathname: "/hair-loss",
        }),
        expect.objectContaining({
          id: "spx_e1_20260828",
          service: "ed",
          surface: "landing",
          status: "active",
          publicLandingPathname: "/erectile-dysfunction",
        }),
      ]),
    )

    expect(activeSpecialtyExperiences).toHaveLength(2)
    expect(activeSpecialtyExperiences.map((experience) => experience.id)).toEqual([
      "spx_h1_20260828",
      "spx_e1_20260828",
    ])
    expect(SPECIALTY_EXPERIENCES.filter((experience) => experience.status !== "active")).toHaveLength(4)
    expect(SPECIALTY_EXPERIENCES.filter((experience) => experience.status === "baseline")).toHaveLength(4)
  })

  it("does not permit two active material versions for a service", () => {
    for (const service of ["hair_loss", "ed"] as const) {
      expect(
        activeSpecialtyExperiences.filter((experience) => experience.service === service),
      ).toHaveLength(1)
    }
  })

  it("normalises only a current, matching landing version", () => {
    expect(normalizeSpecialtyExperienceVersion("spx_h1_20260828", "hair_loss")).toBe(
      "spx_h1_20260828",
    )
    expect(normalizeSpecialtyExperienceVersion("spx_e1_20260828", "ed")).toBe(
      "spx_e1_20260828",
    )
    expect(normalizeSpecialtyExperienceVersion("spx_h1_20260828", "ed")).toBeNull()
    expect(normalizeSpecialtyExperienceVersion("spx_e1_20260828", "hair_loss")).toBeNull()
    expect(normalizeSpecialtyExperienceVersion("spx_h1_20260828", "hair_loss", "intake_presentation")).toBeNull()
  })

  it("fails closed for unknown, malformed, overlong, and retired values", () => {
    expect(normalizeSpecialtyExperienceVersion(null, "hair_loss")).toBeNull()
    expect(normalizeSpecialtyExperienceVersion(undefined, "hair_loss")).toBeNull()
    expect(normalizeSpecialtyExperienceVersion(42, "hair_loss")).toBeNull()
    expect(normalizeSpecialtyExperienceVersion("spx_h1_20260828 ", "hair_loss")).toBeNull()
    expect(normalizeSpecialtyExperienceVersion("spx_h1_20260828_extra", "hair_loss")).toBeNull()
    expect(normalizeSpecialtyExperienceVersion("spx_h2_20260828", "hair_loss")).toBeNull()
    expect(normalizeSpecialtyExperienceVersion("spx_e3_20260828", "ed")).toBeNull()
  })

  it("keeps a version valid when the flow started during its active window", () => {
    expect(
      normalizeSpecialtyExperienceVersion(
        "spx_h1_20260828",
        "hair_loss",
        "landing",
        "2026-08-28T05:13:53.869Z",
      ),
    ).toBeNull()
    expect(
      normalizeSpecialtyExperienceVersion(
        "spx_h1_20260828",
        "hair_loss",
        "landing",
        "2026-08-28T05:13:53.870Z",
      ),
    ).toBe("spx_h1_20260828")
  })

  it("retains a cohort started before retirement and rejects one started after it", () => {
    const retiredVersion: SpecialtyExperienceDefinition = {
      id: "spx_h3_20260828",
      service: "hair_loss",
      surface: "landing",
      hypothesis: "Retired test definition",
      status: "retired",
      activationTimestamp: "2026-08-01T00:00:00.000Z",
      retirementTimestamp: "2026-08-15T00:00:00.000Z",
      publicLandingPathname: "/hair-loss",
    }

    expect(hasSpecialtyExperienceActivationHistory(retiredVersion)).toBe(true)
    expect(
      hasSpecialtyExperienceActivationHistory(
        SPECIALTY_EXPERIENCES.find(({ id }) => id === "spx_h3_20260828")!,
      ),
    ).toBe(false)
  })

  it("keeps identifiers free of personal, clinical, and acquisition meaning", () => {
    for (const { id } of SPECIALTY_EXPERIENCES) {
      expect(id).toMatch(/^spx_[he][1-3]_20260828$/)
      expect(id).not.toMatch(/patient|medicine|query|clinician|doctor|email|phone|utm|gclid/i)
    }
  })
})
