import type { MetadataRoute } from "next"

import { getAllComparisonSlugs } from "@/lib/seo/data/comparisons"
import { shouldIndexCompare } from "@/lib/seo/index-policy"

// /compare is per-slug iceboxed: most pages stay noindex,follow and are NOT
// listed here. Pages in the compare keep-set (lib/seo/index-policy.ts) — e.g.
// the dated cross-provider price table at online-medical-certificate-options —
// are re-indexed and advertised. See docs/audits/2026-06-03-3llm-brain-review.md.
const COMPARE_LAST_MODIFIED = new Date("2026-06-11")
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getAllComparisonSlugs()
    .filter((slug) => shouldIndexCompare(slug))
    .map((slug) => ({
      url: `${baseUrl}/compare/${slug}`,
      lastModified: COMPARE_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))
}
