import type { MetadataRoute } from "next"

import { symptoms } from "@/lib/seo/data/symptoms"
import { shouldIndexSymptom } from "@/lib/seo/index-policy"

const CONTENT_ENRICHED = new Date("2026-03-31")
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Allow-list icebox: only keep-set symptoms stay in the sitemap; the rest are
  // live but noindexed. Source mirrors the page route (Object.keys(symptoms) in
  // app/symptoms/[slug]/page.tsx) so the keep-set (neck-pain) actually appears —
  // the legacy lib/seo/symptoms.ts list does not contain it. See lib/seo/index-policy.ts.
  return Object.keys(symptoms)
    .filter((slug) => shouldIndexSymptom(slug))
    .map((slug) => ({
      url: `${baseUrl}/symptoms/${slug}`,
      lastModified: CONTENT_ENRICHED,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }))
}
