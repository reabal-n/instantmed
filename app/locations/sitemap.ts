import type { MetadataRoute } from "next"

import { getAllStateSlugs } from "@/lib/seo/data/states"

const CONTENT_ENRICHED = new Date("2026-04-08")
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

  const cityEntries = citySlugs.map((slug) => ({
    url: `${baseUrl}/locations/${slug}`,
    lastModified: CONTENT_ENRICHED,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  // State-level hub pages - canonical route /locations/state/<slug>
  // Higher priority than city pages because they rank for head terms
  // ("online doctor new south wales") that funnel down to city pages.
  const stateEntries = getAllStateSlugs().map((slug) => ({
    url: `${baseUrl}/locations/state/${slug}`,
    lastModified: CONTENT_ENRICHED,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  return [...stateEntries, ...cityEntries]
}
