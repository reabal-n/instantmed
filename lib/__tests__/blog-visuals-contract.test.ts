import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { getArticleVisuals, getArticleVisualsForRender, TOP_VISUAL_ARTICLE_SLUGS } from "@/lib/blog/visuals"

describe("blog article visual system", () => {
  it("gives each top-priority article at least two informative visuals", () => {
    expect(TOP_VISUAL_ARTICLE_SLUGS.length).toBeGreaterThanOrEqual(15)

    for (const slug of TOP_VISUAL_ARTICLE_SLUGS) {
      const visuals = getArticleVisuals(slug)

      expect(visuals.length, slug).toBeGreaterThanOrEqual(2)
      expect(visuals.length, slug).toBeLessThanOrEqual(3)
      for (const visual of visuals) {
        expect(visual.assetPath, `${slug}/${visual.id}`).toMatch(
          new RegExp(`^/images/blog/${slug}/${visual.id}(?:-[a-z0-9-]+)?\\.webp$`),
        )
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

  it("does not send generation prompts through the article render payload", () => {
    const slug = "repeat-prescription-online-australia"
    const generationVisuals = getArticleVisuals(slug)
    const renderVisuals = getArticleVisualsForRender(slug)
    const renderPayload = JSON.stringify(renderVisuals)

    expect(renderVisuals).toHaveLength(generationVisuals.length)
    expect(renderPayload).not.toContain("imagePrompt")
    expect(renderPayload).not.toContain(generationVisuals[0]?.imagePrompt.slice(0, 48))

    const articleTemplateSource = fs.readFileSync(
      path.join(process.cwd(), "components", "blog", "article-template.tsx"),
      "utf8",
    )
    expect(articleTemplateSource).not.toContain("getArticleVisuals(")
    expect(articleTemplateSource).toContain("RenderableArticleVisual")
  })
})
