import { describe, expect, it } from "vitest"

import { toArticleIndexItem, toArticleIndexItems } from "@/lib/blog/index-item"
import type { Article } from "@/lib/blog/types"
import { getSearchSuggestions } from "@/lib/blog/utils"

const article: Article = {
  slug: "example-guide",
  title: "Example guide",
  subtitle: "A subtitle that stays server-side",
  excerpt: "A concise card summary.",
  category: "telehealth",
  tags: ["telehealth", "work"],
  publishedAt: "2026-01-01",
  updatedAt: "2026-06-15",
  readingTime: 7,
  viewCount: 1234,
  author: {
    name: "InstantMed Medical Team",
    credentials: "Server-only credentials",
    ahpraNumber: "SERVER-ONLY",
    bio: "Server-only biography",
  },
  heroImage: "/images/blog/example/hero.webp",
  heroImageDark: "/images/blog/example/hero-dark.webp",
  heroImageFit: "contain",
  heroImageAlt: "An educational example visual",
  content: [{ type: "paragraph", content: "Large article body that must stay server-side." }],
  faqs: [{ question: "Server-only question?", answer: "Server-only answer." }],
  relatedArticles: ["another-guide"],
  series: {
    id: "telehealth-guide",
    name: "Telehealth Guide",
    description: "Server-only series description",
    order: 2,
  },
  canonical: "https://instantmed.com.au/example-guide",
  seo: {
    title: "Server-only SEO title",
    description: "Server-only SEO description",
    keywords: ["online doctor", "telehealth australia"],
  },
}

describe("blog article index items", () => {
  it("projects only metadata used by client-side article discovery", () => {
    expect(toArticleIndexItem(article)).toEqual({
      slug: "example-guide",
      title: "Example guide",
      excerpt: "A concise card summary.",
      category: "telehealth",
      tags: ["telehealth", "work"],
      keywords: ["online doctor", "telehealth australia"],
      updatedAt: "2026-06-15",
      readingTime: 7,
      viewCount: 1234,
      authorName: "InstantMed Medical Team",
      heroImage: "/images/blog/example/hero.webp",
      heroImageAlt: "An educational example visual",
      series: {
        id: "telehealth-guide",
        order: 2,
      },
    })
  })

  it("projects collections without retaining full article objects", () => {
    const items = toArticleIndexItems([article])

    expect(items).toHaveLength(1)
    expect(JSON.stringify(items)).not.toContain("Large article body")
    expect(JSON.stringify(items)).not.toContain("Server-only question")
    expect(JSON.stringify(items)).not.toContain("Server-only SEO description")
  })

  it("keeps short search keywords available as topic suggestions", () => {
    const [item] = toArticleIndexItems([article])

    expect(getSearchSuggestions([item], "online doc")).toContainEqual({
      type: "tag",
      text: "online doctor",
    })
  })
})
