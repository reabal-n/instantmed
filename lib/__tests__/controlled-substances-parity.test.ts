import { describe, expect, it } from "vitest"

import {
  CONTROLLED_SUBSTANCE_PATTERNS,
  CONTROLLED_SUBSTANCE_TERMS,
} from "@/lib/clinical/controlled-substances"
import { isLikelyDeclinedOnline } from "@/lib/clinical/controlled-substances"
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

// ---------------------------------------------------------------------------
// 2026-08-04: real declined+refunded orders, pinned as regressions.
// Every one of these reached checkout and was refunded because the blocklist
// carried the generic name but not the brand a patient actually writes.
// ---------------------------------------------------------------------------
describe("prescribing-gate brand coverage (2026-08 refund evidence)", () => {
  it("blocks the S8 and controlled brands that reached checkout", () => {
    // Oxynorm: immediate-release oxycodone. Every other oxycodone brand
    // (oxycontin/endone/targin) was listed; this one was not.
    // CBD: only "cbd oil" was listed, so a bare "CBD" entry matched nothing.
    for (const medication of ["Oxynorm", "OxyNorm 5mg", "CBD", "CBD 25mg"]) {
      expect(isControlledSubstance(medication), medication).toBe(true)
    }
  })

  it("covers AU brand and spelling variants that generic-only entries miss", () => {
    for (const medication of [
      "Norspan patch",      // buprenorphine
      "Hypnodorm",          // flunitrazepam, S8, was absent entirely
      "Euhypnos 10mg",      // temazepam
      "Ducene",             // diazepam
      "Alepam",             // oxazepam
      "dexamfetamine",      // AU spelling; list previously had only dexamphetamine
    ]) {
      expect(isControlledSubstance(medication), medication).toBe(true)
    }
  })

  it("keeps ordinary repeat medicines prescribable", () => {
    // Over-blocking costs a legitimate sale and is not the safe direction here.
    // Lomotil (diphenoxylate + atropine) is S3/S4 in Australia, NOT S8, and is
    // a legitimate ongoing repeat. It was briefly blocked on 2026-08-04 from a
    // declined order whose reason was "Patient will resubmit request" — an
    // operational decline, not a clinical refusal. Refund evidence alone is not
    // grounds to block: the decline must be clinical and the schedule must fit.
    for (const medication of [
      "Sertraline 50mg", "Ventolin", "Metformin XR", "Atorvastatin 20mg",
      "Panadol Osteo", "Nurofen", "Microgynon 30", "Amoxicillin",
      "Lomotil", "Lomotil 100 tablets non pbs", "diphenoxylate",
    ]) {
      expect(isControlledSubstance(medication), medication).toBe(false)
    }
  })

  it("preserves the deliberate codeine-combination carve-out", () => {
    // docs/CLINICAL.md routes combination repeats to the reviewing doctor
    // rather than a hard intake wall. Panadeine/Mersyndol are warned about
    // before payment (isLikelyDeclinedOnline), never blocked.
    for (const medication of ["codeine", "Codeine 15mg", "Panadeine forte", "Mersyndol forte"]) {
      expect(isControlledSubstance(medication), medication).toBe(false)
    }
  })
})

describe("isLikelyDeclinedOnline", () => {
  it("flags codeine-combination brands so nobody pays to reach a predictable no", () => {
    for (const medication of ["Panadeine forte", "Mersyndol forte", "Nurofen Plus", "Codalgin"]) {
      expect(isLikelyDeclinedOnline(medication), medication).toBe(true)
    }
  })

  it("stays silent for ordinary repeats", () => {
    for (const medication of ["Sertraline 50mg", "Ventolin", "Panadol Osteo", "Nurofen"]) {
      expect(isLikelyDeclinedOnline(medication), medication).toBe(false)
    }
  })

  it("never double-signals on a medicine that is already hard-blocked", () => {
    // A controlled substance is blocked upstream; showing an advisory as well
    // would offer a "continue anyway" on something that cannot proceed.
    for (const medication of ["Oxynorm", "CBD", "Endone"]) {
      expect(isControlledSubstance(medication), medication).toBe(true)
      expect(isLikelyDeclinedOnline(medication), medication).toBe(false)
    }
  })
})
