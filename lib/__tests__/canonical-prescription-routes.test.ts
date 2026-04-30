import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("legacy prescription routes", () => {
  it("routes repeat prescription entry points to the canonical request flow", () => {
    const repeatPage = readFileSync(path.join(root, "app/prescriptions/repeat/page.tsx"), "utf8")
    const subtypePage = readFileSync(path.join(root, "app/prescriptions/[subtype]/page.tsx"), "utf8")

    expect(repeatPage).toContain("redirect(\"/request?service=repeat-script\")")
    expect(subtypePage).toContain("repeat: \"repeat-script\"")
    expect(subtypePage).not.toContain("repeat: \"prescription\"")
  })
})
