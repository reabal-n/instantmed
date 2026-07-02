import { describe, expect, it } from "vitest"

import {
  CONTROLLED_SUBSTANCE_PATTERNS,
  CONTROLLED_SUBSTANCE_TERMS,
} from "@/lib/clinical/controlled-substances"
import { isControlledSubstance } from "@/lib/clinical/intake-validation"
import { BLOCKED_S8_TERMS, containsBlockedSubstance } from "@/lib/validation/repeat-script-schema"

/**
 * Parity contract for the controlled-substance blocklist (2026-07-03
 * unification). Before this, the intake regex detector and the repeat-script
 * server blocklist were separately maintained copies that had diverged: the
 * intake layer blocked tramadol/cannabis/testosterone + several AU benzo
 * brands the server blocklist waved through, and the server blocklist knew
 * ketamine + the codeine compounds the intake layer did not. These pins make
 * any future divergence a test failure, not a silent enforcement gap.
 */
describe("controlled-substance blocklist parity", () => {
  it("keeps the repeat-script server blocklist identical to the shared term list", () => {
    expect(BLOCKED_S8_TERMS).toBe(CONTROLLED_SUBSTANCE_TERMS)
  })

  it("derives exactly one intake pattern per shared term", () => {
    expect(CONTROLLED_SUBSTANCE_PATTERNS).toHaveLength(CONTROLLED_SUBSTANCE_TERMS.length)
  })

  it("detects every shared term through the intake regex detector", () => {
    for (const term of CONTROLLED_SUBSTANCE_TERMS) {
      expect(isControlledSubstance(term), `isControlledSubstance("${term}")`).toBe(true)
      expect(isControlledSubstance(term.toUpperCase()), `case-insensitive "${term}"`).toBe(true)
    }
  })

  it("blocks every shared term through the repeat-script server validator", () => {
    for (const term of CONTROLLED_SUBSTANCE_TERMS) {
      expect(containsBlockedSubstance(`taking ${term} daily`), `containsBlockedSubstance("${term}")`).toBe(
        true,
      )
    }
  })

  it("covers the divergence-incident terms on both layers", () => {
    // Present in the old intake regex but MISSING from the old server blocklist:
    const wasMissingFromServerBlocklist = [
      "tramadol",
      "cannabis",
      "testosterone",
      "kalma",
      "murelax",
      "sativex",
    ]
    // Present in the old server blocklist but MISSING from the old intake regex:
    const wasMissingFromIntakeDetector = ["ketamine", "codeine phosphate", "codeine linctus"]
    // Never in either list despite being AU Schedule 8 opioids:
    const wasMissingFromBoth = ["tapentadol", "palexia", "pethidine"]

    for (const term of [
      ...wasMissingFromServerBlocklist,
      ...wasMissingFromIntakeDetector,
      ...wasMissingFromBoth,
    ]) {
      expect(isControlledSubstance(term), `intake detector "${term}"`).toBe(true)
      expect(containsBlockedSubstance(term), `server blocklist "${term}"`).toBe(true)
    }
  })

  it("matches flexible spacing on multi-word brand names", () => {
    expect(isControlledSubstance("MS Contin")).toBe(true)
    expect(isControlledSubstance("mscontin")).toBe(true)
    expect(isControlledSubstance("CBD oil")).toBe(true)
    expect(isControlledSubstance("cbdoil")).toBe(true)
  })

  it("keeps legitimate repeat medications unblocked on both layers", () => {
    const legitimate = [
      "atorvastatin",
      "metformin",
      "sertraline",
      "escitalopram",
      "perindopril",
      "salbutamol",
      // Bare "codeine" is deliberately NOT hard-blocked — combination-product
      // repeats belong in front of the reviewing doctor, not at an intake wall.
      "codeine",
    ]
    for (const name of legitimate) {
      expect(isControlledSubstance(name), `intake detector "${name}"`).toBe(false)
    }
    // The server validator adds fuzzy typo matching, so assert the same
    // negatives hold there (a false positive here would block a legitimate
    // paid repeat request at checkout).
    for (const name of ["atorvastatin", "metformin", "sertraline", "perindopril"]) {
      expect(containsBlockedSubstance(name), `server blocklist "${name}"`).toBe(false)
    }
  })
})
