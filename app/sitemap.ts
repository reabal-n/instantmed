import type { MetadataRoute } from "next"

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
  ]

  const routes = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
    priority: route === "" ? 1 : 0.8,
  }))

  // Category hubs
  const categoryHubs = [
    { slug: 'mens-health', priority: 0.8 },
    { slug: 'womens-health', priority: 0.8 },
    { slug: 'weight-loss', priority: 0.7 },
  ]
  const categoryRoutes = categoryHubs.map(({ slug, priority }) => ({
    url: `${baseUrl}/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority,
  }))

  // Audience pages
  const audiencePages = ['students', 'tradies', 'corporate', 'shift-workers']
  const audienceRoutes = audiencePages.map((slug) => ({
    url: `${baseUrl}/for/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [
    ...routes,
    ...categoryRoutes,
    ...audienceRoutes,
  ]
}
