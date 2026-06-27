import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

/**
 * Regression guard for the 2026-06-22 clinical-note fix.
 *
 * An ED consult was producing a generic medical-certificate SOAP note that
 * ignored the ED screener. Three root causes, pinned here:
 *  1. formatIntakeContext must surface consult-subtype clinical fields (ED /
 *     hair loss / women's health) so the AI sees the real request.
 *  2. The clinical-note prompt must be service-aware (never assume med cert).
 *  3. The note must format as a brief plain paragraph, not SOAP sections.
 */
describe("clinical note is service-aware + brief paragraph", () => {
  it("intake context states an explicit, human-readable service label", () => {
    // "Service Type: consult" was ambiguous — the AI couldn't tell ED from hair
    // loss and defaulted to a med-cert note. The context must spell out the
    // service + subtype so the note reflects the real request.
    const src = read("app/actions/drafts/shared.ts")
    expect(src).toContain("Hair loss consult")
    expect(src).toContain("Erectile dysfunction (ED) consult")
    expect(src).toMatch(/Women's health consult/)
    expect(src).toContain('parts.push(`Service Type: ${serviceLabel}`)')
  })

  it("formatIntakeContext surfaces consult-subtype clinical fields", () => {
    const src = read("app/actions/drafts/shared.ts")
    // Subtype routing
    expect(src).toMatch(/consultSubtype|consult_subtype/)
    // ED screener
    expect(src).toContain("edGoal")
    expect(src).toContain("iiefTotal")
    expect(src).toContain("IIEF-5 score")
    expect(src).toContain("edPreference")
    // Hair loss screener
    expect(src).toContain("hairGoal")
    expect(src).toContain("hairPattern")
    // Women's health screener
    expect(src).toContain("womensHealthOption")
    expect(src).toContain("utiSymptoms")
  })

  it("clinical-note prompt is service-aware, not medical-certificate-only", () => {
    const src = read("app/actions/drafts/generate-clinical-note.ts")
    // Must explicitly cover the consult subtypes + forbid assuming a med cert
    expect(src).toMatch(/erectile dysfunction|\bed\b/i)
    expect(src).toContain("hair loss")
    expect(src).toMatch(/women'?s health|womens_health/i)
    expect(src).toMatch(/NEVER default to a medical-certificate|write the note for THAT service/i)
    // The examples must not be copyable verbatim (root cause of the med-cert bug)
    expect(src).toMatch(/never copy an example\s+verbatim/i)
  })

  it("formatClinicalNoteAsText emits brief bullets via the shared formatter (no SOAP labels)", () => {
    const src = read("app/actions/drafts/clinical-note-sync.ts")
    // The old SOAP labels must be gone from the formatter output
    expect(src).not.toContain("`Subjective:")
    expect(src).not.toContain("`Objective:")
    expect(src).not.toContain("`Assessment:")
    // Plan 06 + PR #197 dedup: delegate to the single shared bullet formatter
    // instead of re-implementing the field/bullet logic here.
    expect(src).toContain("formatClinicalNoteBullets")
    // The bullet rendering itself lives in the shared source of truth.
    const shared = read("lib/doctor/clinical-notes.ts")
    expect(shared).toContain("• ")
    expect(shared).toMatch(/\.join\("\\n"\)/)
  })
})
