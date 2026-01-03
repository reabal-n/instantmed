import type { MetadataRoute } from "next"
import { getAllSlugs } from "@/lib/seo/pages"
import { getAllMedicationSlugs } from "@/lib/seo/medications"
import { getAllIntentSlugs } from "@/lib/seo/intents"
import { getAllSymptomSlugs } from "@/lib/seo/symptoms"
import { getAllComparisonSlugs } from "@/lib/seo/comparisons"

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

  // Medications (13 pages now)
  const medicationSlugs = getAllMedicationSlugs()
  const medicationRoutes = medicationSlugs.map((slug) => ({
    url: `${baseUrl}/medications/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8, // Higher priority - high purchase intent
  }))

  // Intent pages (13 pages now)
  const intentSlugs = getAllIntentSlugs()
  const intentRoutes = intentSlugs.map((slug) => ({
    url: `${baseUrl}/telehealth/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9, // Highest priority - direct search intent match
  }))

  // Symptom pages (8 pages now)
  const symptomSlugs = getAllSymptomSlugs()
  const symptomRoutes = symptomSlugs.map((slug) => ({
    url: `${baseUrl}/symptoms/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  // Comparison pages (NEW - 3 medication comparisons)
  const comparisonSlugs = getAllComparisonSlugs()
  const comparisonRoutes = comparisonSlugs.map((slug) => ({
    url: `${baseUrl}/compare/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75, // High intent - people comparing are close to decision
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
  let certificateSlugs: string[] = []
  let benefitSlugs: string[] = []
  let resourceSlugs: string[] = []
  
  try {
    certificateSlugs = getAllSlugs('certificates')
    benefitSlugs = getAllSlugs('benefits')
    resourceSlugs = getAllSlugs('resources')
  } catch (error) {
    console.error('Error loading legacy SEO slugs for sitemap', error)
  }
  
  const certificateRoutes = certificateSlugs.map((slug) => ({
    url: `${baseUrl}/health/certificates/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  const benefitRoutes = benefitSlugs.map((slug) => ({
    url: `${baseUrl}/health/why-${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  const resourceRoutes = resourceSlugs.map((slug) => ({
    url: `${baseUrl}/health/guides/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }))

  return [
    ...routes,
    ...conditionRoutes,
    ...medicationRoutes,
    ...intentRoutes,
    ...symptomRoutes,
    ...comparisonRoutes,
    ...categoryRoutes,
    ...audienceRoutes,
    ...certificateRoutes,
    ...benefitRoutes,
    ...resourceRoutes,
  ]
}
