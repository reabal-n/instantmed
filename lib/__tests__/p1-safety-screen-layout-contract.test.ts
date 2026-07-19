import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

const primitives = read("components/request/shared/intake-step-primitives.tsx")
const edHealth = read("components/request/steps/ed-health-step.tsx")
const hairHealth = read("components/request/steps/hair-loss-health-step.tsx")

describe("P1.3 compact specialty safety screens", () => {
  it("uses the shared compact row layout under two stable section labels", () => {
    expect(primitives).toContain('data-intake-compact-choice-row="true"')

    for (const source of [edHealth, hairHealth]) {
      expect(source).toContain("CompactChoiceRow")
      expect(source).toContain("Treatment safety")
      expect(source).toContain("Doctor notes")
    }
  })

  it("keeps explicit safety choices while replacing the remaining bespoke selectors", () => {
    // Previous-treatment history moved to the treatment step on 2026-07-19, so
    // the effectiveness selector is no longer this screen's to own. The cardiac
    // safety questions below are the pins that actually matter here.
    expect(edHealth).not.toContain('ariaLabel="Previous treatment effectiveness"')
    expect(edHealth).not.toContain("Have you tried ED treatment before?")
    expect(edHealth).toContain('ariaLabel="Do you take nitrates?"')
    expect(edHealth).toContain('ariaLabel="Heart attack, stroke, or unstable angina in the last 6 months?"')
    expect(edHealth).toContain('ariaLabel="Severe heart disease, very low blood pressure, or HOCM?"')

    expect(hairHealth).toContain("ChipToggleGroup")
    expect(hairHealth).toContain('ariaLabel="Scalp conditions"')
    expect(hairHealth).toContain('{ key: "scalpNone", label: "None" }')
    expect(hairHealth).not.toContain("MedicalHistoryToggles")
    expect(hairHealth).toContain('ariaLabel="Partner pregnancy or conception status"')
  })

  it("preserves the safety answer keys and validation-summary path", () => {
    for (const key of [
      "edNitrates",
      "edAlphaBlockers",
      "edRecentHeartEvent",
      "edSevereHeart",
      "edGpCleared",
    ]) {
      expect(edHealth).toContain(key)
    }

    for (const key of [
      "hairReproductive",
      "scalpNone",
      "hairLowBP",
      "hairHeartConditions",
    ]) {
      expect(hairHealth).toContain(key)
    }

    expect(edHealth).toContain("useStepValidationSummary")
    expect(hairHealth).toContain("useStepValidationSummary")
  })
})
