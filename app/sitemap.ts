import type { MetadataRoute } from "next"

const BUILD_DATE = new Date()
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

/**
 * Root sitemap — static pages, service pages, med cert locations.
 * Content-type sitemaps live in their respective route directories
 * (conditions/, symptoms/, locations/, etc.) for GSC per-type index visibility.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Top-of-funnel head-term pillar pages — priority 1.0
  const pillarPages = [
    "/online-doctor-australia",
    "/telehealth-australia",
  ]

  const staticPages = [
    "",
    "/medical-certificate",
    "/prescriptions",
    // /general-consult is 301 redirected to /consult in next.config.mjs —
    // removed from sitemap so Google stops seeing it as a distinct URL
    // (was cannibalizing /consult — flagged in SEO audit + GSC).
    "/pricing",
    "/how-it-works",
    "/faq",
    "/contact",
    "/reviews",
    "/privacy",
    "/terms",
    "/about",
    "/trust",
    "/blog",
    "/locations",
    "/guides",
    "/compare",
    "/conditions",
    "/symptoms",
    "/for",
    "/intent",
    "/sitemap-html",
    "/clinical-governance",
    "/our-doctors",
    "/how-we-decide",
    "/hair-loss",
    "/erectile-dysfunction",
    "/refund-policy",
    "/cookie-policy",
  ]

  const servicePages = [
    "/consult",
    "/weight-loss",
    "/medical-certificate/work",
    "/medical-certificate/study",
    "/medical-certificate/carer",
    "/medical-certificate/sick-leave",
    "/medical-certificate/university",
    "/medical-certificate/school",
    "/medical-certificate/return-to-work",
    "/medical-certificate/employer-acceptance",
    "/medical-certificate/centrelink",
    "/medical-certificate/jury-duty",
  ]

  // Employer verification pages — high-intent long-tail SEO
  const employerPages = [
    "/for/employers",
    "/for/universities",
    "/for/employers/woolworths",
    "/for/employers/coles",
    "/for/employers/telstra",
    "/for/employers/commonwealth-bank",
    "/for/employers/anz",
    "/for/employers/westpac",
    "/for/employers/nab",
    "/for/employers/amazon",
    "/for/employers/bhp",
    "/for/employers/bunnings",
    "/for/employers/jb-hi-fi",
    "/for/employers/mcdonalds",
    "/for/employers/sonic-healthcare",
    "/for/employers/qantas",
    "/for/employers/deloitte",
    "/for/employers/pwc",
    "/for/employers/kpmg",
    "/for/employers/bupa",
    "/verify",
  ]

  const medCertLocationSlugs = [
    "sydney", "parramatta", "melbourne", "brisbane", "perth",
    "adelaide", "gold-coast", "canberra", "hobart", "darwin",
  ]

  return [
    ...pillarPages.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: BUILD_DATE,
      changeFrequency: "weekly" as const,
      priority: 1.0,
    })),
    ...staticPages.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: BUILD_DATE,
      changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
      priority: route === "" ? 1 : 0.9,
    })),
    ...servicePages.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: BUILD_DATE,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...medCertLocationSlugs.map((slug) => ({
      url: `${baseUrl}/medical-certificate/${slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...employerPages.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: BUILD_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]
}
