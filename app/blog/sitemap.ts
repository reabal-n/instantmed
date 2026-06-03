import type { MetadataRoute } from "next"

import { allArticles } from "@/lib/blog/articles"
import { shouldIndexBlog } from "@/lib/seo/index-policy"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return allArticles
    .filter((article) => shouldIndexBlog(article.slug))
    .map((article) => ({
    url: `${baseUrl}/blog/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))
}
