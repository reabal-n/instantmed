import type { MetadataRoute } from "next"
import { getAllAudiencePageSlugs } from "@/lib/seo/data/audience-pages"

const CONTENT_ENRICHED = new Date("2026-03-31")
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getAllAudiencePageSlugs().map((slug) => ({
    url: `${baseUrl}/for/${slug}`,
    lastModified: CONTENT_ENRICHED,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))
}
