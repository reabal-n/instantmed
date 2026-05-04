import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { getArticleVisuals, TOP_VISUAL_ARTICLE_SLUGS } from "@/lib/blog/visuals"

describe("blog article visual system", () => {
  it("gives each top-priority article at least two informative visuals", () => {
    expect(TOP_VISUAL_ARTICLE_SLUGS.length).toBeGreaterThanOrEqual(15)

    for (const slug of TOP_VISUAL_ARTICLE_SLUGS) {
      const visuals = getArticleVisuals(slug)

      expect(visuals.length, slug).toBeGreaterThanOrEqual(2)
      expect(visuals.length, slug).toBeLessThanOrEqual(3)
      for (const visual of visuals) {
        expect(visual.assetPath, `${slug}/${visual.id}`).toBe(`/images/blog/${slug}/${visual.id}.webp`)
      }
    }
  })

  it("keeps visual guidance educational rather than promotional", () => {
    const promotionalPattern =
      /start a request|start a consultation|\bbook\s+(a|an|now|online)\b|buy|get your certificate|instantmed can help/i

    for (const slug of TOP_VISUAL_ARTICLE_SLUGS) {
      const serialized = JSON.stringify(getArticleVisuals(slug))

      expect(serialized, slug).not.toMatch(promotionalPattern)
    }
  })

  it("has generated local assets for every top-priority visual", () => {
    for (const slug of TOP_VISUAL_ARTICLE_SLUGS) {
      for (const visual of getArticleVisuals(slug)) {
        const assetPath = visual.assetPath
        expect(assetPath, `${slug}/${visual.id}`).toMatch(/^\/images\/blog\/.+\.webp$/)
        if (!assetPath) {
          throw new Error(`Missing asset path for ${slug}/${visual.id}`)
        }
        expect(
          fs.existsSync(path.join(process.cwd(), "public", assetPath.slice(1))),
          `${slug}/${visual.id}`,
        ).toBe(true)
      }
    }
  })
})
