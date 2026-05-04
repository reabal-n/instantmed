import { describe, expect, it } from "vitest"

import { getArticleBySlug } from "@/lib/blog/articles"

describe("blog MDX rendering contract", () => {
  it("parses Markdown tables into structured table sections", () => {
    const article = getArticleBySlug("ibs-digestive-issues")

    expect(article).toBeDefined()
    const subtypeTable = article?.content.find(
      (section) => section.type === "table" && section.headers?.includes("Subtype"),
    )

    expect(subtypeTable).toMatchObject({
      type: "table",
      headers: ["Subtype", "Predominant bowel pattern", "Notes"],
    })
    expect(subtypeTable?.rows?.[0]).toEqual([
      "IBS-C (constipation-predominant)",
      "Infrequent, hard, or lumpy stools",
      "Bristol Stool Chart types 1-2 predominate",
    ])
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
