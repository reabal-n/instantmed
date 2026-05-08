import { type CommercialIntentCluster,intentPages } from "@/lib/seo/intents"

export interface CommercialSeoTrackingTarget {
  priority: number
  slug: string
  url: string
  cluster: CommercialIntentCluster
  title: string
  primaryQuery: string
  alternateQueries: string[]
  ctaUrl: string
  price: string
}

export function getCommercialSeoTrackingTargets(
  siteOrigin = "https://instantmed.com.au",
): CommercialSeoTrackingTarget[] {
  const origin = siteOrigin.replace(/\/$/, "")

  return intentPages.map((page) => ({
    priority: page.commercial.priority,
    slug: page.slug,
    url: `${origin}/intent/${page.slug}`,
    cluster: page.commercial.cluster,
    title: page.h1,
    primaryQuery: page.intent.searchQuery,
    alternateQueries: page.intent.alternateQueries,
    ctaUrl: page.conversion.ctaUrl,
    price: page.commercial.price,
  }))
}
