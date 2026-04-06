import type { MetadataRoute } from "next"

const CONTENT_ENRICHED = new Date("2026-03-31")
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locationSlugs = [
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

  return locationSlugs.map((slug) => ({
    url: `${baseUrl}/locations/${slug}`,
    lastModified: CONTENT_ENRICHED,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))
}
