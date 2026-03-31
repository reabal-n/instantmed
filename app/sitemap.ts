import type { MetadataRoute } from "next"
import { allArticles } from "@/lib/blog/articles"
import { getAllIntentSlugs } from "@/lib/seo/intents"
import { getAllConditionSlugs } from "@/lib/seo/data/conditions"
import { getAllConditionLocationComboSlugs } from "@/lib/seo/data/condition-location-combos"
import { getAllGuideSlugs } from "@/lib/seo/data/guides"
import { getAllComparisonSlugs } from "@/lib/seo/data/comparisons"

// Build-time date for consistent lastModified values
const BUILD_DATE = new Date()

// Content enrichment dates — when pages were last substantively updated
const CONTENT_ENRICHED_MARCH_2026 = new Date("2026-03-31")

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

// ============================================
// SEGMENTED SITEMAPS
// Google recommends splitting large sitemaps for better crawl management.
// Segment 0: Static + service pages (highest priority)
// Segment 1: Conditions + symptoms (medical content)
// Segment 2: Guides + comparisons + intent (how-to/educational)
// Segment 3: Locations + blog + audience (volume content)
// ============================================

export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  // ── Segment 0: Static + service pages ──
  if (id === 0) {
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
      "/blog",
      "/locations",
      "/guides",
      "/compare",
      "/conditions",
      "/symptoms",
      "/for",
      "/intent",
    ]

    const servicePages = [
      "/consult",
      "/general-consult",
      "/gp-consult",
      "/weight-loss",
      "/weight-management",
      "/hair-loss",
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

    return [
      ...staticPages.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: BUILD_DATE,
        changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
        priority: route === "" ? 1 : 0.8,
      })),
      ...servicePages.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: BUILD_DATE,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ]
  }

  // ── Segment 1: Conditions + symptoms (medical content) ──
  if (id === 1) {
    const conditionSlugs = getAllConditionSlugs()
    const symptomSlugs = [
      "sore-throat", "headache", "fatigue", "cough", "fever",
      "burning-when-urinating", "hair-thinning", "chest-pain", "frequent-urination",
      "nausea", "dizziness", "runny-nose", "body-aches", "shortness-of-breath",
      "stomach-pain", "neck-pain", "bloating", "earache", "itching",
      "heart-palpitations", "joint-pain", "weight-gain", "hair-loss",
      "eye-strain", "sleep-apnoea", "chronic-cough",
    ]

    const conditionLocationCombos = getAllConditionLocationComboSlugs()

    return [
      ...conditionSlugs.map((slug) => ({
        url: `${baseUrl}/conditions/${slug}`,
        lastModified: CONTENT_ENRICHED_MARCH_2026,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
      ...symptomSlugs.map((slug) => ({
        url: `${baseUrl}/symptoms/${slug}`,
        lastModified: CONTENT_ENRICHED_MARCH_2026,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
      ...conditionLocationCombos.map(({ slug, city }) => ({
        url: `${baseUrl}/conditions/${slug}/${city}`,
        lastModified: CONTENT_ENRICHED_MARCH_2026,
        changeFrequency: "monthly" as const,
        priority: 0.65,
      })),
    ]
  }

  // ── Segment 2: Guides + comparisons + intent (educational) ──
  if (id === 2) {
    const guideSlugs = getAllGuideSlugs()
    const comparisonSlugs = getAllComparisonSlugs()
    const intentSlugs = getAllIntentSlugs()

    return [
      ...guideSlugs.map((slug) => ({
        url: `${baseUrl}/guides/${slug}`,
        lastModified: BUILD_DATE,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
      ...comparisonSlugs.map((slug) => ({
        url: `${baseUrl}/compare/${slug}`,
        lastModified: BUILD_DATE,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
      ...intentSlugs.map((slug) => ({
        url: `${baseUrl}/intent/${slug}`,
        lastModified: BUILD_DATE,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ]
  }

  // ── Segment 3: Locations + blog + audience (volume content) ──
  const locationSlugs = [
    "sydney", "parramatta", "bondi-beach", "newcastle", "wollongong",
    "wagga-wagga", "albury-wodonga", "central-coast", "penrith",
    "port-macquarie", "coffs-harbour", "orange", "dubbo",
    "melbourne", "geelong", "ballarat", "bendigo", "mildura", "shepparton",
    "brisbane", "gold-coast", "sunshine-coast", "cairns", "townsville",
    "toowoomba", "mackay", "rockhampton", "hervey-bay", "ipswich",
    "gladstone", "bundaberg",
    "perth", "fremantle", "bunbury",
    "adelaide", "mount-gambier", "port-augusta",
    "hobart", "launceston",
    "darwin", "alice-springs",
    "canberra",
  ]

  const medCertLocationSlugs = [
    "sydney", "parramatta", "melbourne", "brisbane", "perth",
    "adelaide", "gold-coast", "canberra", "hobart", "darwin",
  ]

  const blogSlugs = [
    "how-to-get-medical-certificate-online-australia",
    "can-you-get-prescription-without-seeing-doctor",
    "telehealth-vs-gp-when-to-use-each",
    ...allArticles.map(article => article.slug),
  ]

  const audiencePages = [
    "students", "tradies", "corporate", "shift-workers",
    "nurses", "teachers", "hospitality", "retail",
    "office-workers", "parents", "remote-workers", "gig-workers",
  ]

  const articleDateMap = new Map(allArticles.map(a => [a.slug, new Date(a.updatedAt)]))

  return [
    ...locationSlugs.map((slug) => ({
      url: `${baseUrl}/locations/${slug}`,
      lastModified: CONTENT_ENRICHED_MARCH_2026,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...medCertLocationSlugs.map((slug) => ({
      url: `${baseUrl}/medical-certificate/${slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...blogSlugs.map((slug) => ({
      url: `${baseUrl}/blog/${slug}`,
      lastModified: articleDateMap.get(slug) || BUILD_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...audiencePages.map((slug) => ({
      url: `${baseUrl}/for/${slug}`,
      lastModified: CONTENT_ENRICHED_MARCH_2026,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]
}
