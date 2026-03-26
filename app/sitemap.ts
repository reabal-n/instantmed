import type { MetadataRoute } from "next"
import { allArticles } from "@/lib/blog/articles"
import { getAllIntentSlugs } from "@/lib/seo/intents"
import { getAllConditionSlugs } from "@/lib/seo/data/conditions"
import { getAllConditionLocationComboSlugs } from "@/lib/seo/data/condition-location-combos"
import { getAllGuideSlugs } from "@/lib/seo/data/guides"
import { getAllComparisonSlugs } from "@/lib/seo/data/comparisons"

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
    // Note: /repeat-prescription and /repeat-prescriptions removed - they redirect to /prescriptions
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
    // Hub pages for SEO category discovery
    "/guides",
    "/compare",
    "/conditions",
    "/symptoms",
    "/for",
    "/intent",
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
    "/hair-loss",
    // Canonical medical certificate pages only (no redirect URLs)
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
    "wagga-wagga",
    "albury-wodonga",
    "central-coast",
    "penrith",
    "port-macquarie",
    "coffs-harbour",
    "orange",
    "dubbo",
    // VIC
    "melbourne",
    "geelong",
    "ballarat",
    "bendigo",
    "mildura",
    "shepparton",
    // QLD
    "brisbane",
    "gold-coast",
    "sunshine-coast",
    "cairns",
    "townsville",
    "toowoomba",
    "mackay",
    "rockhampton",
    "hervey-bay",
    "ipswich",
    "gladstone",
    "bundaberg",
    // WA
    "perth",
    "fremantle",
    "bunbury",
    // SA
    "adelaide",
    "mount-gambier",
    "port-augusta",
    // TAS
    "hobart",
    "launceston",
    // NT
    "darwin",
    "alice-springs",
    // ACT
    "canberra",
  ]

  // ============================================
  // CONDITION PAGES (Priority 0.7)
  // Health condition landing pages for SEO
  // ============================================
  const conditionSlugs = getAllConditionSlugs()

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
    "burning-when-urinating",
    "hair-thinning",
    "chest-pain",
    "frequent-urination",
    "nausea",
    "dizziness",
    "runny-nose",
    "body-aches",
    "shortness-of-breath",
    "stomach-pain",
    "neck-pain",
    "bloating",
    "earache",
    "itching",
  ]

  // ============================================
  // GUIDE PAGES (Priority 0.7)
  // How-to guides for high-intent traffic
  // ============================================
  const guideSlugs = getAllGuideSlugs()

  // ============================================
  // COMPARISON PAGES (Priority 0.7)
  // Telehealth vs alternatives comparisons
  // ============================================
  const comparisonSlugs = getAllComparisonSlugs()

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
  const audiencePages = [
    "students",
    "tradies",
    "corporate",
    "shift-workers",
    "nurses",
    "teachers",
    "hospitality",
    "retail",
    "office-workers",
    "parents",
    "remote-workers",
    "gig-workers",
  ]

  // ============================================
  // INTENT PAGES (Priority 0.7)
  // High-intent search queries (same-day-medical-certificate, uti-treatment-online, etc.)
  // ============================================
  const intentSlugs = getAllIntentSlugs()

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
    url: `${baseUrl}/locations/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  // Medical certificate location pages (/medical-certificate/[suburb])
  const medCertLocationSlugs = [
    "sydney",
    "parramatta",
    "melbourne",
    "brisbane",
    "perth",
    "adelaide",
    "gold-coast",
    "canberra",
    "hobart",
    "darwin",
  ]
  const medCertLocationRoutes = medCertLocationSlugs.map((slug) => ({
    url: `${baseUrl}/medical-certificate/${slug}`,
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

  const intentRoutes = intentSlugs.map((slug) => ({
    url: `${baseUrl}/intent/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  // Condition + location combo pages (e.g. /conditions/cold-and-flu/sydney)
  const conditionLocationCombos = getAllConditionLocationComboSlugs()
  const conditionLocationRoutes = conditionLocationCombos.map(({ slug, city }) => ({
    url: `${baseUrl}/conditions/${slug}/${city}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }))

  return [
    ...staticRoutes,
    ...serviceRoutes,
    ...locationRoutes,
    ...medCertLocationRoutes,
    ...conditionRoutes,
    ...symptomRoutes,
    ...guideRoutes,
    ...comparisonRoutes,
    ...blogRoutes,
    ...audienceRoutes,
    ...intentRoutes,
    ...conditionLocationRoutes,
  ]
}
