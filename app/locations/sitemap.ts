import type { MetadataRoute } from "next"

import { shouldIndexLocation } from "@/lib/seo/index-policy"

const CONTENT_ENRICHED = new Date("2026-04-24")
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const citySlugs = [
    "sydney", "parramatta", "bondi-beach", "newcastle", "wollongong",
    "wagga-wagga", "albury-wodonga", "central-coast", "penrith",
    "port-macquarie", "coffs-harbour", "orange", "dubbo",
    "melbourne", "geelong", "ballarat", "bendigo", "mildura", "shepparton",
    "brisbane", "gold-coast", "sunshine-coast", "cairns", "townsville",
    "toowoomba", "mackay", "rockhampton", "hervey-bay", "ipswich",
    "gladstone", "bundaberg",
    "perth", "fremantle", "bunbury",
    "adelaide", "mount-gambier", "port-augusta",
    "hobart", "launceston",
    "darwin", "alice-springs",
    "canberra",
  ]

  // Allow-list icebox: only keep-set metros stay in the sitemap; other cities
  // are live but noindexed. State hub pages (/locations/state/*) are dropped
  // entirely — 0 GSC impressions in 90d, iceboxed. See lib/seo/index-policy.ts.
  const cityEntries = citySlugs
    .filter((slug) => shouldIndexLocation(slug))
    .map((slug) => ({
      url: `${baseUrl}/locations/${slug}`,
      lastModified: CONTENT_ENRICHED,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }))

  return cityEntries
}
