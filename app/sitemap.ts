import type { MetadataRoute } from "next"
import { getAllSlugs } from "@/lib/seo/pages"
import { getAllMedicationSlugs } from "@/lib/seo/medications"

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

  // ============================================
  // PROGRAMMATIC SEO PAGES
  // ============================================
  
  // Conditions (15 existing)
  const conditionSlugs = getAllSlugs('conditions')
  const conditionRoutes = conditionSlugs.map((slug) => ({
    url: `${baseUrl}/conditions/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  // Medications (NEW - high-intent pages)
  const medicationSlugs = getAllMedicationSlugs()
  const medicationRoutes = medicationSlugs.map((slug) => ({
    url: `${baseUrl}/medications/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8, // Higher priority - high purchase intent
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

  // Legacy paths (keep for backwards compatibility)
  const certificateSlugs = getAllSlugs('certificates').catch(() => [])
  const certificateRoutes = Array.isArray(certificateSlugs) ? certificateSlugs.map((slug) => ({
    url: `${baseUrl}/health/certificates/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  })) : []

  const benefitSlugs = getAllSlugs('benefits').catch(() => [])
  const benefitRoutes = Array.isArray(benefitSlugs) ? benefitSlugs.map((slug) => ({
    url: `${baseUrl}/health/why-${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  })) : []

  const resourceSlugs = getAllSlugs('resources').catch(() => [])
  const resourceRoutes = Array.isArray(resourceSlugs) ? resourceSlugs.map((slug) => ({
    url: `${baseUrl}/health/guides/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  })) : []

  return [
    ...routes,
    ...conditionRoutes,
    ...medicationRoutes,
    ...categoryRoutes,
    ...audienceRoutes,
    ...certificateRoutes,
    ...benefitRoutes,
    ...resourceRoutes,
  ]
}
