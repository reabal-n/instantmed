import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function collectSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return []

  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) return collectSourceFiles(fullPath)
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : []
  })
}

describe("patient request links", () => {
  it("sends patient prescription CTAs to the canonical repeat-script intake", () => {
    const source = [
      ...collectSourceFiles(join(process.cwd(), "app/patient")),
      ...collectSourceFiles(join(process.cwd(), "components/patient")),
    ].map((file) => readFileSync(file, "utf8")).join("\n")

    expect(source).toContain("/request?service=repeat-script")
    expect(source).not.toContain("/request?service=prescription")
  })
})
