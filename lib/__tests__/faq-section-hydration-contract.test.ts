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

  // GEO regression guard: every FAQ answer must be in the served HTML for
  // Bing/LLM/SGE crawlers. The old code did `items.slice(0, initialCount)`,
  // which omitted overflow answers from the DOM entirely (they lived only in
  // FAQPage JSON-LD). The fix renders ALL items and visually hides the overflow
  // with `hidden` until "Show all". Do not reintroduce a render-time slice.
  it("renders every FAQ answer into the DOM (no render-time slice that drops answers from HTML)", () => {
    const source = read("components/sections/faq-section.tsx")

    expect(source).toContain("items.map(")
    expect(source).not.toContain("items.slice(")
    expect(source).toContain("forceMount")
  })
})
