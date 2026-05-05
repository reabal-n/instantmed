import { describe, expect, it } from "vitest"

import { getArticleBySlug } from "@/lib/blog/articles"

describe("blog MDX rendering contract", () => {
  it("keeps IBS subtype comparisons in mobile-safe list sections", () => {
    const article = getArticleBySlug("ibs-digestive-issues")

    expect(article).toBeDefined()
    const subtypeTables = article?.content.filter(
      (section) => section.type === "table" && section.headers?.includes("Subtype"),
    )

    expect(subtypeTables).toEqual([])

    const subtypeList = article?.content.find(
      (section) => section.type === "list" && section.items?.some((item) => item.startsWith("IBS-C")),
    )

    expect(subtypeList?.items).toEqual(
      expect.arrayContaining([
        expect.stringContaining("IBS-C (constipation-predominant)"),
        expect.stringContaining("IBS-D (diarrhoea-predominant)"),
        expect.stringContaining("IBS-M (mixed)"),
        expect.stringContaining("IBS-U (unclassified)"),
      ]),
    )
  })

  it("parses numbered lists as ordered step sections", () => {
    const article = getArticleBySlug("conjunctivitis-pink-eye")

    const selfCareSteps = article?.content.find(
      (section) =>
        section.type === "steps" &&
        section.items?.[0]?.startsWith("Apply a cool compress"),
    )

    expect(selfCareSteps?.items).toHaveLength(6)
  })

  it("does not leak unsupported Markdown syntax into visible paragraph text", () => {
    const article = getArticleBySlug("ibs-digestive-issues")

    const leakedSyntax = article?.content.filter((section) => {
      if (section.type !== "paragraph") return false
      return /(^|\s)(\*\*|\|---|\|[^|]+\|)/.test(section.content)
    })

    expect(leakedSyntax).toEqual([])
  })
})
