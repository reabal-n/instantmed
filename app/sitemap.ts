import type { MetadataRoute } from "next"

import { getAuthorityAssetSummaries } from "@/lib/authority-assets"
import { getSupportedMedCertIntentSlugs } from "@/lib/medical-cert/unsupported-use-cases"
import { isIceboxedSurfacePath } from "@/lib/seo/index-policy"
import { routeLastModified } from "@/lib/seo/sitemap-lastmod"

// Per-URL lastmod is sourced from git history via routeLastModified() (see
// lib/seo/sitemap-lastmod.ts). These remaining constants cover the data-driven
// surfaces whose pages share a content-enrichment date rather than a per-route
// source file.
const SERVICE_PAGES_LAST_MODIFIED = new Date("2026-04-28")
const MED_CERT_LOCATION_LAST_MODIFIED = new Date("2026-04-24")
const AUTHORITY_ASSETS_LAST_MODIFIED = new Date("2026-06-06")
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

/**
 * Root sitemap - static pages, service pages, med cert locations.
 * Content-type sitemaps live in their respective route directories
 * (conditions/, symptoms/, locations/, etc.) for GSC per-type index visibility.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Top-of-funnel head-term pillar pages - priority 1.0
  const pillarPages = [
    "/online-doctor-australia",
    "/telehealth-australia",
  ]

  const staticPages = [
    "",
    "/medical-certificate",
    "/medical-certificate-online",
    "/prescriptions",
    "/online-prescriptions",
    // /general-consult is 301 redirected to /consult in next.config.mjs -
    // removed from sitemap so Google stops seeing it as a distinct URL
    // (was cannibalizing /consult - flagged in SEO audit + GSC).
    "/pricing",
    "/how-it-works",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
    "/about",
    "/trust",
    "/resources",
    "/blog",
    "/locations",
    "/conditions",
    "/symptoms",
    "/employers",
    "/sitemap-html",
    "/clinical-governance",
    "/our-doctors",
    "/how-we-decide",
    "/alternatives",
    "/mens-health",
    "/hair-loss",
    "/erectile-dysfunction",
    "/mental-health-online",
    "/weight-loss-online",
    "/womens-health",
    "/uti-assessment-online",
    "/contraceptive-pill-assessment-online",
    "/refund-policy",
    "/cookie-policy",
  ]

  const medCertIntentPages = getSupportedMedCertIntentSlugs().map(
    (slug) => `/medical-certificate/${slug}`,
  )

  const servicePages = [
    "/consult",
    ...medCertIntentPages,
    "/medical-certificate/employer-acceptance",
    "/verify",
  ]

  // /for is wholesale-iceboxed: the audience landing pages, the 18 employer
  // verification pages, and /for/universities are dropped from the sitemap and
  // render noindex,follow. /verify (above) is the canonical verification page
  // and stays indexed. See lib/seo/index-policy.ts.

  const medCertLocationSlugs = [
    "parramatta", "canberra", "hobart", "darwin",
  ]

  const authorityAssetPages = getAuthorityAssetSummaries().map(
    (asset) => `/resources/${asset.slug}`,
  )

  const entries = [
    ...pillarPages.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: routeLastModified(route),
      changeFrequency: "weekly" as const,
      priority: 1.0,
    })),
    ...staticPages.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: routeLastModified(route),
      changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
      priority: route === "" ? 1 : 0.9,
    })),
    ...servicePages.map((route) => ({
      url: `${baseUrl}${route}`,
      // Tracked routes (e.g. /consult, /verify) get a real git-sourced date;
      // the med-cert intent children fall back to the service-page date.
      lastModified: routeLastModified(route, SERVICE_PAGES_LAST_MODIFIED.toISOString().slice(0, 10)),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...authorityAssetPages.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: AUTHORITY_ASSETS_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...medCertLocationSlugs.map((slug) => ({
      url: `${baseUrl}/medical-certificate/${slug}`,
      lastModified: MED_CERT_LOCATION_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ]

  // Safety net: never advertise a wholesale-iceboxed surface (compare/for/
  // guides/intent) in the sitemap, even if an entry is re-added above by
  // mistake. The per-surface sitemaps return [] too. See lib/seo/index-policy.ts.
  return entries.filter(
    (entry) => !isIceboxedSurfacePath(new URL(entry.url).pathname),
  )
}
