import type { MetadataRoute } from "next"

import { getAllGuideSlugs } from "@/lib/seo/data/guides"

const CONTENT_ENRICHED = new Date("2026-04-06")
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getAllGuideSlugs().map((slug) => ({
    url: `${baseUrl}/guides/${slug}`,
    lastModified: CONTENT_ENRICHED,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))
}
