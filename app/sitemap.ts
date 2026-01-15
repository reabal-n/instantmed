import type { MetadataRoute } from "next"

// Build-time date for consistent lastModified values
// This is set once at build time, not on every request
const BUILD_DATE = new Date()

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

  // ============================================
  // STATIC MARKETING PAGES
  // ============================================
  const staticPages = [
    "",
    "/medical-certificate",
    "/prescriptions",
    "/pricing",
    "/how-it-works",
    "/faq",
    "/contact",
    "/reviews",
    "/privacy",
    "/terms",
    "/about",
    "/trust",
  ]

  // ============================================
  // SERVICE PAGES
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
  ]

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

  // Audience pages
  const audiencePages = ['students', 'tradies', 'corporate', 'shift-workers']
  const audienceRoutes = audiencePages.map((slug) => ({
    url: `${baseUrl}/for/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [
    ...staticRoutes,
    ...serviceRoutes,
    ...audienceRoutes,
  ]
}
