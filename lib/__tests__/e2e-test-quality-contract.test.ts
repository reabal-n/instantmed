import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const e2eRoot = join(root, "e2e")

const retiredE2eSpecs = [
  "e2e/admin.decline-flow.spec.ts",
  "e2e/dashboard.keyboard-nav.spec.ts",
  "e2e/patient.certificate-download.spec.ts",
]

function listSpecs(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      return listSpecs(path)
    }

    return entry.name.endsWith(".spec.ts") ? [path] : []
  })
}

describe("E2E test quality contract", () => {
  it("rejects self-skips and always-true assertions", () => {
    const prohibitedPatterns = [
      { label: "bare test.skip()", pattern: /\btest\.skip\(\s*\)/ },
      { label: "unconditional test.skip(true, ...)", pattern: /\btest\.skip\(\s*true\s*,/ },
      { label: "always-true boolean expression", pattern: /\|\|\s*true\b|\btrue\s*\|\|/ },
      { label: "literal expect(true) assertion", pattern: /\bexpect\(\s*true\s*\)/ },
    ]
    const violations: string[] = []

    for (const file of listSpecs(e2eRoot)) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/)

      lines.forEach((line, index) => {
        for (const { label, pattern } of prohibitedPatterns) {
          if (pattern.test(line)) {
            violations.push(`${relative(root, file)}:${index + 1} ${label}`)
          }
        }
      })
    }

    expect(violations).toEqual([])
  })

  it("keeps retired vacuous specs absent", () => {
    const present = retiredE2eSpecs.filter((file) => existsSync(join(root, file)))

    expect(present).toEqual([])
  })

  it("keeps retired E2E paths in the release orphan guard", () => {
    const orphanGuard = readFileSync(join(root, "scripts/check-orphaned-files.sh"), "utf8")
    const unguarded = retiredE2eSpecs.filter((file) => !orphanGuard.includes(`"${file}"`))

    expect(unguarded).toEqual([])
  })
})
