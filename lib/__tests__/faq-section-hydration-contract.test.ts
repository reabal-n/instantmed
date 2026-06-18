import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

describe("FAQ section hydration contract", () => {
  it("uses stable accordion ids instead of route-dependent Radix generated ids", () => {
    const source = read("components/sections/faq-section.tsx")

    expect(source).toContain("const triggerId =")
    expect(source).toContain("const contentId =")
    expect(source).toContain("aria-controls={contentId}")
    expect(source).toContain("aria-labelledby={triggerId}")
  })
})
