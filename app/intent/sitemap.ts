import type { MetadataRoute } from "next"
import { getAllIntentSlugs } from "@/lib/seo/intents"

const BUILD_DATE = new Date()
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getAllIntentSlugs().map((slug) => ({
    url: `${baseUrl}/intent/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))
}
