import type { MetadataRoute } from "next"
import { getAllSlugs } from "@/lib/seo/pages"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

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
    "/auth/login",
    "/auth/register",
  ]

  const routes = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
    priority: route === "" ? 1 : route.includes("auth") ? 0.3 : 0.8,
  }))

  // Add programmatic SEO pages
  const conditionSlugs = getAllSlugs('conditions')
  const conditionRoutes = conditionSlugs.map((slug) => ({
    url: `${baseUrl}/health/conditions/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  const certificateSlugs = getAllSlugs('certificates')
  const certificateRoutes = certificateSlugs.map((slug) => ({
    url: `${baseUrl}/health/certificates/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  const benefitSlugs = getAllSlugs('benefits')
  const benefitRoutes = benefitSlugs.map((slug) => ({
    url: `${baseUrl}/health/why-${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  const resourceSlugs = getAllSlugs('resources')
  const resourceRoutes = resourceSlugs.map((slug) => ({
    url: `${baseUrl}/health/guides/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [
    ...routes,
    ...conditionRoutes,
    ...certificateRoutes,
    ...benefitRoutes,
    ...resourceRoutes,
  ]
}
