import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * P2.2 (2026-07-17): one validation system per intake step.
 *
 * `useStepValidationSummary` owns the "add these to continue" summary and the
 * intake_validation_blocked event. Before this, hair-loss-assessment and both
 * women's-health branches ALSO carried a legacy `validate()` + `errors` bag
 * that recomputed the same conditions a second time and rendered them again as
 * inline field errors.
 *
 * Two systems computing the same thing drift, and they had:
 *  - the pill branch's validate() kept an unreachable "Current-pill repeats go
 *    through repeat prescriptions" rule (exactStringValue already narrows
 *    contraceptionType to start|switch|undefined, so the branch was dead);
 *  - the UTI branch's validate() passed on ANY answer to the red-flag and
 *    pregnancy checks, while isComplete correctly required an explicit "no" —
 *    so the two disagreed about whether a red-flagged patient could advance.
 *    Only deriveUtiTerminalBlock rendering first kept that unreachable.
 *
 * The rule this pins: a step that uses the hook must gate on the SAME value the
 * hook receives (`isComplete`), not on a second validator. Steps that use a
 * different single system (StepBlockedSummary — medication / certificate /
 * medical-history) are out of scope; this contract only forbids running BOTH.
 *
 * Deliberately NOT covered: weight-loss-assessment (gated, not live). It is the
 * known anti-pattern template and must be rebuilt on shared primitives before
 * any launch — see docs/plans/2026-07-09-intake-dropoff-final-plan.md §P2.2.
 */

const root = process.cwd()
const stepsDir = join(root, "components/request/steps")

function readStep(file: string) {
  return readFileSync(join(stepsDir, file), "utf8")
}

const stepFiles = readdirSync(stepsDir).filter((file) => file.endsWith("-step.tsx"))

const hookSteps = stepFiles.filter((file) => readStep(file).includes("useStepValidationSummary"))

describe("intake validation single-source contract", () => {
  it("finds the steps that own their gating through the shared hook", () => {
    // Sanity: if this drops to zero the greps below would vacuously pass.
    expect(hookSteps.length).toBeGreaterThanOrEqual(10)
    expect(hookSteps).toContain("hair-loss-assessment-step.tsx")
    expect(hookSteps).toContain("womens-health-assessment-step.tsx")
  })

  it.each(hookSteps)("%s runs no parallel validate()/errors system", (file) => {
    const source = readStep(file)

    // A second validator that recomputes what computeReasons already knows.
    expect(source, `${file} must not reintroduce a parallel validate()`).not.toMatch(
      /const validate\s*=\s*(\(|useCallback)/,
    )
    // A parallel field-error bag rendered alongside the summary.
    expect(source, `${file} must not reintroduce an errors bag`).not.toContain(
      "useState<Record<string, string>>",
    )
    expect(source, `${file} must not write to a parallel errors bag`).not.toContain("setErrors(")
    // The gate must key off the hook's own completeness value.
    expect(source, `${file} must not gate Continue on a second validator`).not.toContain(
      "if (!validate())",
    )
  })

  it("keeps the pill and UTI branches gating on the value their terminal block reads", () => {
    const source = readStep("womens-health-assessment-step.tsx")

    // Both branches gate on isComplete, which requires an explicit "no" to the
    // safety checks rather than merely any answer.
    expect(source.match(/if \(!isComplete\) \{\s*showBlockingReasons\(\)/g)).toHaveLength(2)
    expect(source).toContain("const isComplete = Boolean(")
    expect(source).toContain("utiRedFlags === 'no' && utiPregnant === 'no'")

    // The terminal blocks stay the safety boundary and keep their correction path.
    expect(source).toContain("derivePillTerminalBlock(answers)")
    expect(source).toContain("deriveUtiTerminalBlock(answers)")
    expect(source).toContain("buildPillTerminalBlockCorrection(terminalBlock)")
    expect(source).toContain("buildUtiTerminalBlockCorrection(terminalBlock)")
  })

  it("keeps every pill and UTI safety answer required before Continue", () => {
    const source = readStep("womens-health-assessment-step.tsx")

    // The reasons list IS the gate now, so each safety answer must appear in it.
    for (const reason of [
      "pregnancy status",
      "migraine with aura",
      "blood clot history",
      "smoking status",
      "UTI symptoms",
      "red-flag safety check",
      "pregnancy check",
    ]) {
      expect(source, `${reason} must stay a blocking reason`).toContain(`"${reason}"`)
    }
  })
})
