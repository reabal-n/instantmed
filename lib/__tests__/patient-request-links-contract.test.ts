import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { REQUEST_REPEAT_SCRIPT_HREF } from "@/lib/dashboard/routes"

function collectSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  if (statSync(dir).isFile()) return /\.(ts|tsx)$/.test(dir) ? [dir] : []

  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) return collectSourceFiles(fullPath)
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : []
  })
}

describe("request links", () => {
  it("sends prescription CTAs to the canonical repeat-script intake", () => {
    const source = [
      ...collectSourceFiles(join(process.cwd(), "app/patient")),
      ...collectSourceFiles(join(process.cwd(), "app/manifest.ts")),
      ...collectSourceFiles(join(process.cwd(), "components/patient")),
      ...collectSourceFiles(join(process.cwd(), "components/marketing")),
      ...collectSourceFiles(join(process.cwd(), "lib/dashboard/routes.ts")),
      ...collectSourceFiles(join(process.cwd(), "lib/marketing")),
      ...collectSourceFiles(join(process.cwd(), "lib/seo/data/guides")),
    ].map((file) => readFileSync(file, "utf8")).join("\n")

    expect(REQUEST_REPEAT_SCRIPT_HREF).toBe("/request?service=repeat-script")
    expect(source).toContain(REQUEST_REPEAT_SCRIPT_HREF)
    expect(source).not.toContain("/request?service=prescription")
  })
})
