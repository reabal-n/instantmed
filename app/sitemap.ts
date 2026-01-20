import type { MetadataRoute } from "next"
import { allArticles } from "@/lib/blog/articles"

// Build-time date for consistent lastModified values
// This is set once at build time, not on every request
const BUILD_DATE = new Date()

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

  // ============================================
  // STATIC MARKETING PAGES (Priority 1.0 - 0.8)
  // ============================================
  const staticPages = [
    "",
    "/medical-certificate",
    "/prescriptions",
    "/repeat-prescription",
    "/repeat-prescriptions",
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
  ]

  // ============================================
  // SERVICE PAGES (Priority 0.8)
  // High-intent landing pages for specific services
  // ============================================
  const servicePages = [
    "/consult",
    "/general-consult",
    "/gp-consult",
    "/weight-loss",
    "/weight-management",
    "/mens-health",
    "/womens-health",
    "/hair-loss",
    "/performance-anxiety",
    "/medical-certificates",
    "/medical-certificates/work",
    "/medical-certificates/study",
    "/medical-certificates/carers",
    "/medical-certificates/employer-acceptance",
  ]

  // ============================================
  // LOCATION PAGES (Priority 0.7)
  // "medical certificate online [city]" SEO pages
  // ============================================
  const locationSlugs = [
    // NSW
    "sydney",
    "parramatta",
    "bondi-beach",
    "newcastle",
    "wollongong",
    // VIC
    "melbourne",
    "geelong",
    "ballarat",
    // QLD
    "brisbane",
    "gold-coast",
    "sunshine-coast",
    "cairns",
    "townsville",
    // WA
    "perth",
    "fremantle",
    // SA
    "adelaide",
    // TAS
    "hobart",
    "launceston",
    // NT
    "darwin",
    // ACT
    "canberra",
  ]

  // ============================================
  // CONDITION PAGES (Priority 0.7)
  // Health condition landing pages for SEO
  // ============================================
  const conditionSlugs = [
    "cold-and-flu",
    "gastro",
    "back-pain",
    "migraine",
    "anxiety",
    "uti",
    "skin-rash",
    "insomnia",
  ]

  // ============================================
  // SYMPTOM PAGES (Priority 0.7)
  // Symptom checker SEO pages
  // ============================================
  const symptomSlugs = [
    "sore-throat",
    "headache",
    "fatigue",
    "cough",
    "fever",
  ]

  // ============================================
  // GUIDE PAGES (Priority 0.7)
  // How-to guides for high-intent traffic
  // ============================================
  const guideSlugs = [
    "how-to-get-medical-certificate-for-work",
    "how-to-get-sick-note-for-uni",
    "telehealth-guide-australia",
  ]

  // ============================================
  // COMPARISON PAGES (Priority 0.7)
  // Telehealth vs alternatives comparisons
  // ============================================
  const comparisonSlugs = [
    "telehealth-vs-gp",
    "online-medical-certificate-options",
    "waiting-room-vs-telehealth",
  ]

  // ============================================
  // BLOG POSTS (Priority 0.6)
  // Health content for organic traffic - dynamically generated from articles
  // ============================================
  const blogSlugs = [
    // Legacy posts
    "how-to-get-medical-certificate-online-australia",
    "can-you-get-prescription-without-seeing-doctor",
    "telehealth-vs-gp-when-to-use-each",
    // New articles from article system
    ...allArticles.map(article => article.slug),
  ]

  // ============================================
  // AUDIENCE SEGMENT PAGES (Priority 0.6)
  // "/for/[audience]" pages targeting specific user groups
  // ============================================
  const audiencePages = ["students", "tradies", "corporate", "shift-workers"]

  // ============================================
  // BUILD ROUTES
  // ============================================

  const staticRoutes = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: BUILD_DATE,
    changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
    priority: route === "" ? 1 : 0.8,
  }))

  const serviceRoutes = servicePages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: BUILD_DATE,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  const locationRoutes = locationSlugs.map((slug) => ({
    url: `${baseUrl}/medical-certificate/location/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  const conditionRoutes = conditionSlugs.map((slug) => ({
    url: `${baseUrl}/conditions/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  const symptomRoutes = symptomSlugs.map((slug) => ({
    url: `${baseUrl}/symptoms/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  const guideRoutes = guideSlugs.map((slug) => ({
    url: `${baseUrl}/guides/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  const comparisonRoutes = comparisonSlugs.map((slug) => ({
    url: `${baseUrl}/compare/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  const blogRoutes = blogSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  const audienceRoutes = audiencePages.map((slug) => ({
    url: `${baseUrl}/for/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [
    ...staticRoutes,
    ...serviceRoutes,
    ...locationRoutes,
    ...conditionRoutes,
    ...symptomRoutes,
    ...guideRoutes,
    ...comparisonRoutes,
    ...blogRoutes,
    ...audienceRoutes,
  ]
}
