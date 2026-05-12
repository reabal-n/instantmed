import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const nextConfig = readFileSync(join(process.cwd(), "next.config.mjs"), "utf8")

describe("Next.js image-formats contract", () => {
  // Background: prior to 2026-05-12 the `images:` block did not set
  // `formats`, which meant Next.js defaulted to WebP only. AVIF
  // (~30-50% smaller than WebP, ~95% browser support) was never
  // served — the biggest hit was on `/blog/*` pages where each
  // article ships 5-8 WebP visuals through `next/image`.

  it("enables AVIF + WebP in the Next.js image-optimizer formats", () => {
    expect(nextConfig).toMatch(/formats:\s*\['image\/avif',\s*'image\/webp'\]/)
  })

  it("keeps the images block aware of why AVIF is on", () => {
    // The rationale comment must stay so the next contributor doesn't
    // strip the line thinking it's redundant.
    expect(nextConfig).toContain("AVIF")
  })
})
