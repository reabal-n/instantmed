import type { MetadataRoute } from "next"
import { allArticles } from "@/lib/blog/articles"

const BUILD_DATE = new Date()
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const legacySlugs = [
    "how-to-get-medical-certificate-online-australia",
    "can-you-get-prescription-without-seeing-doctor",
    "telehealth-vs-gp-when-to-use-each",
  ]

  const articleDateMap = new Map(allArticles.map(a => [a.slug, new Date(a.updatedAt)]))
  const allSlugs = [...new Set([...legacySlugs, ...allArticles.map(a => a.slug)])]

  return allSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: articleDateMap.get(slug) || BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))
}
