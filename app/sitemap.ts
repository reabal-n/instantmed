import type { MetadataRoute } from "next"
import { allArticles } from "@/lib/blog/articles"
import { getAllIntentSlugs } from "@/lib/seo/intents"
import { getAllConditionSlugs } from "@/lib/seo/data/conditions"
import { getAllConditionLocationComboSlugs } from "@/lib/seo/data/condition-location-combos"
import { getAllGuideSlugs } from "@/lib/seo/data/guides"
import { getAllComparisonSlugs } from "@/lib/seo/data/comparisons"
import { getAllMedications } from "@/lib/data/medications"

// Build-time date for consistent lastModified values
const BUILD_DATE = new Date()

// Content enrichment dates — when pages were last substantively updated
const CONTENT_ENRICHED_MARCH_2026 = new Date("2026-03-31")

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

// ============================================
// SINGLE SITEMAP
// ~400 total URLs — well under the 50,000 limit.
// Segmented sitemaps had a Vercel caching bug where all segments
// returned identical content. Single sitemap is simpler and reliable.
// ============================================

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Static + service pages (highest priority) ──
  const staticPages = [
    "",
    "/medical-certificate",
    "/prescriptions",
    "/general-consult",
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
    "/repeat-prescriptions",
    "/hair-loss",
    "/gp-consult",
    "/refund-policy",
    "/cookie-policy",
  ]

  const servicePages = [
    "/consult",
    "/gp-consult",
    "/weight-loss",
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

  // ── Medications (educational + service pages) ──
  const medicationInfoSlugs = [
    "amoxicillin", "metformin", "sildenafil", "trimethoprim", "doxycycline",
    "sertraline", "pantoprazole", "omeprazole", "azithromycin", "citalopram",
    "escitalopram", "fluoxetine", "loratadine", "cetirizine", "salbutamol",
    "prednisolone", "naproxen", "diclofenac", "famotidine",
    "amoxicillin-clavulanate", "cephalexin", "gabapentin", "propranolol",
    "oral-contraceptive",
  ]
  const prescriptionMedSlugs = getAllMedications().map(m => m.slug)

  // ── Conditions + symptoms (medical content) ──
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

  // ── Guides + comparisons + intent (educational) ──
  const guideSlugs = getAllGuideSlugs()
  const comparisonSlugs = getAllComparisonSlugs()
  const intentSlugs = getAllIntentSlugs()

  // ── Locations + blog + audience (volume content) ──
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
    // Static + service pages
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

    // Conditions
    ...conditionSlugs.map((slug) => ({
      url: `${baseUrl}/conditions/${slug}`,
      lastModified: CONTENT_ENRICHED_MARCH_2026,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Symptoms
    ...symptomSlugs.map((slug) => ({
      url: `${baseUrl}/symptoms/${slug}`,
      lastModified: CONTENT_ENRICHED_MARCH_2026,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Condition + location combos
    ...conditionLocationCombos.map(({ slug, city }) => ({
      url: `${baseUrl}/conditions/${slug}/${city}`,
      lastModified: CONTENT_ENRICHED_MARCH_2026,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),

    // Guides
    ...guideSlugs.map((slug) => ({
      url: `${baseUrl}/guides/${slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Comparisons
    ...comparisonSlugs.map((slug) => ({
      url: `${baseUrl}/compare/${slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Intent pages
    ...intentSlugs.map((slug) => ({
      url: `${baseUrl}/intent/${slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Locations
    ...locationSlugs.map((slug) => ({
      url: `${baseUrl}/locations/${slug}`,
      lastModified: CONTENT_ENRICHED_MARCH_2026,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Med cert location pages
    ...medCertLocationSlugs.map((slug) => ({
      url: `${baseUrl}/medical-certificate/${slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Blog
    ...blogSlugs.map((slug) => ({
      url: `${baseUrl}/blog/${slug}`,
      lastModified: articleDateMap.get(slug) || BUILD_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),

    // Audience pages
    ...audiencePages.map((slug) => ({
      url: `${baseUrl}/for/${slug}`,
      lastModified: CONTENT_ENRICHED_MARCH_2026,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),

    // Medication info pages (educational)
    ...medicationInfoSlugs.map((slug) => ({
      url: `${baseUrl}/medications/${slug}`,
      lastModified: CONTENT_ENRICHED_MARCH_2026,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),

    // Prescription medication pages (service)
    ...prescriptionMedSlugs.map((slug) => ({
      url: `${baseUrl}/prescriptions/med/${slug}`,
      lastModified: CONTENT_ENRICHED_MARCH_2026,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ]
}
