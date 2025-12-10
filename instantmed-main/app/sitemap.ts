import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"
  const currentDate = new Date()

  // Main pages with high priority
  const mainPages = [
    { route: "", priority: 1.0, changeFreq: "daily" as const },
    { route: "/medical-certificate", priority: 0.9, changeFreq: "weekly" as const },
    { route: "/prescriptions", priority: 0.9, changeFreq: "weekly" as const },
    { route: "/referrals", priority: 0.9, changeFreq: "weekly" as const },
    { route: "/referrals/pathology-imaging", priority: 0.8, changeFreq: "weekly" as const },
  ]

  // Service flow pages
  const servicePages = [
    { route: "/medical-certificate/work", priority: 0.8, changeFreq: "weekly" as const },
    { route: "/medical-certificate/uni", priority: 0.8, changeFreq: "weekly" as const },
    { route: "/medical-certificate/carer", priority: 0.8, changeFreq: "weekly" as const },
    { route: "/prescriptions/repeat", priority: 0.8, changeFreq: "weekly" as const },
    { route: "/referrals/specialist", priority: 0.8, changeFreq: "weekly" as const },
  ]

  // Informational pages
  const infoPages = [
    { route: "/pricing", priority: 0.7, changeFreq: "weekly" as const },
    { route: "/how-it-works", priority: 0.7, changeFreq: "monthly" as const },
    { route: "/faq", priority: 0.6, changeFreq: "monthly" as const },
    { route: "/contact", priority: 0.6, changeFreq: "monthly" as const },
    { route: "/reviews", priority: 0.6, changeFreq: "weekly" as const },
  ]

  // Legal pages
  const legalPages = [
    { route: "/privacy", priority: 0.3, changeFreq: "monthly" as const },
    { route: "/terms", priority: 0.3, changeFreq: "monthly" as const },
  ]

  // Auth pages (lower priority for SEO)
  const authPages = [
    { route: "/auth/login", priority: 0.2, changeFreq: "monthly" as const },
    { route: "/auth/register", priority: 0.2, changeFreq: "monthly" as const },
  ]

  const allPages = [...mainPages, ...servicePages, ...infoPages, ...legalPages, ...authPages]

  return allPages.map(({ route, priority, changeFreq }) => ({
    url: `${baseUrl}${route}`,
    lastModified: currentDate,
    changeFrequency: changeFreq,
    priority,
  }))
}
