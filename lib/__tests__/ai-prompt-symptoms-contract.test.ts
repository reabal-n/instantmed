import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("AI prompt symptom-field contract", () => {
  // Regression for the 2026-05-12 audit finding: the med cert
  // symptoms-step UI was changed from a multi-select chip group
  // (writing `answers.symptoms: string[]`) to a free-text textarea
  // (writing `answers.symptomDetails: string`). The AI prompt builders
  // continued to read only `answers.symptoms` so every "Reported
  // Symptoms" line in the AI draft and clinical-note prompts was
  // silently empty. The validator had the same dead-code issue —
  // already fixed separately (commit 842ff93d1). This contract pins
  // the prompt-side fix.

  it("active draft prompt builder reads the textarea + duration, not only the legacy array", () => {
    const source = read("app/actions/drafts/shared.ts")

    expect(source).toContain("symptomDetails")
    expect(source).toContain("symptom_details")
    expect(source).toContain("symptoms_description")
    expect(source).toContain("symptomDuration")
    expect(source).toContain("symptom_duration")

    expect(source).not.toMatch(
      /if \(answers\.symptoms && answers\.symptoms\.length > 0\)/,
    )

    expect(source).toContain("Symptom Duration:")
  })

  it("retired duplicate AI API endpoints stay deleted", () => {
    const retirementGuard = read("scripts/check-orphaned-files.sh")

    expect(retirementGuard).toContain("app/api/ai/clinical-note/route.ts")
    expect(retirementGuard).toContain("app/api/ai/med-cert-draft/route.ts")
    expect(retirementGuard).toContain("app/api/ai/form-validation/route.ts")
    expect(retirementGuard).toContain("app/api/ai/symptom-suggestions/route.ts")
  })

  it("draft-shared prompt builder falls back to the textarea when the array is absent", () => {
    const source = read("app/actions/drafts/shared.ts")

    // The legacy array is still consulted first (for older intake rows
    // that have it populated), but a textarea fallback follows.
    expect(source).toContain("answers.symptoms ?? answers.symptom_list")
    expect(source).toContain("symptoms_description || answers.symptom_details || answers.symptomDetails")
    // "Additional Symptoms" still renders for legacy rows that have
    // `otherSymptomDetails` / `other_symptom_details`, but no longer
    // ALSO joins on `symptom_details` (that field is the textarea
    // itself now, so reading it as "additional" was a duplicate).
    expect(source).not.toMatch(
      /otherSymptomDetails \|\| answers\.other_symptom_details \|\| answers\.symptom_details/,
    )
  })
})
