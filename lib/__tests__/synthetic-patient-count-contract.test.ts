import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Synthetic patient-count containment contract (2026-07-10).
 *
 * `getPatientCount()` linearly interpolates 500 → 2,500 across 2026. On
 * 2026-07-10 it displayed ~1,179 "Australians" against 112 ever-paying
 * patients (~10x) and diverged further daily — a misleading-representation
 * exposure (ACL s18 / AHPRA advertising) on regulated-health surfaces. Every
 * public render was removed that day; this scan keeps the figure from creeping
 * back into pages, components, or emails.
 *
 * The plumbing itself (interpolation, DB max, API route, client hook) is
 * deliberately retained pending an operator decision on a truthful
 * replacement stat — but nothing outside that plumbing may CALL it.
 */

const ROOT = process.cwd()
const SCAN_DIRS = ["app", "components", "lib"]
const SCAN_EXTENSIONS = new Set([".ts", ".tsx"])

// Call-shaped usage only (identifier followed by an open paren) so prose
// comments referencing the function name don't false-positive.
const COUNT_CALL = /\b(getPatientCount|usePatientCount)\s*\(/

const ALLOWED_FILES = new Set([
  // Definition + DB-max wrapper
  "lib/social-proof/index.ts",
  "lib/social-proof/server.ts",
  // Client plumbing (currently consumer-less; delete or re-anchor before reuse)
  "lib/hooks/use-patient-count.ts",
  "app/api/patient-count/route.ts",
])

function collectFiles(dir: string): string[] {
  const absolute = join(ROOT, dir)
  const entries = readdirSync(absolute)
  const files: string[] = []
  for (const entry of entries) {
    const path = join(absolute, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue
      files.push(...collectFiles(join(dir, entry)))
    } else if (SCAN_EXTENSIONS.has(entry.slice(entry.lastIndexOf(".")))) {
      files.push(join(dir, entry))
    }
  }
  return files
}

describe("synthetic patient-count containment", () => {
  it("keeps getPatientCount/usePatientCount calls out of every public surface", () => {
    const offenders: string[] = []
    for (const dir of SCAN_DIRS) {
      for (const file of collectFiles(dir)) {
        if (ALLOWED_FILES.has(file)) continue
        const source = readFileSync(join(ROOT, file), "utf8")
        const match = source.match(COUNT_CALL)
        if (match) offenders.push(`${file} :: ${match[0]}`)
      }
    }
    expect(
      offenders,
      `Synthetic patient count rendered outside plumbing — see getPatientCount's compliance note in lib/social-proof/index.ts: ${offenders.join("; ")}`,
    ).toEqual([])
  })

  it('keeps "Trusted by N+" count phrasing out of pages, components, and emails', () => {
    const offenders: string[] = []
    const TRUSTED_BY_COUNT = /Trusted by[^"'`\n]*(toLocaleString|\d{3,})/
    for (const dir of SCAN_DIRS) {
      for (const file of collectFiles(dir)) {
        const source = readFileSync(join(ROOT, file), "utf8")
        const match = source.match(TRUSTED_BY_COUNT)
        if (match) offenders.push(`${file} :: ${match[0]}`)
      }
    }
    expect(
      offenders,
      `Quantified "Trusted by" claims found — patient-count claims need a real, verifiable source: ${offenders.join("; ")}`,
    ).toEqual([])
  })
})
