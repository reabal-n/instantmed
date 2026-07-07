/**
 * Index policy — the "icebox hybrid" (3-LLM brain review, 2026-06-03).
 *
 * A young, low-authority YMYL domain carrying 300+ zero-traffic pages gets a
 * negative site-wide quality signal that suppresses indexing of the good pages
 * (including the money pages). So we keep a SMALL, high-quality indexed footprint
 * and "icebox" the rest: noindex + excluded from the sitemap, kept LIVE for users
 * and improved in the CMS, then re-indexed (added to a keep-set below) once each
 * page is genuinely excellent AND the domain has earned authority.
 *
 * This is NOT deletion. Iceboxed pages still render and still pass internal-link
 * equity (robots = index:false, follow:true). To re-index a page, add its slug
 * to the relevant keep-set here — single source of truth.
 *
 * Keep-sets are derived from Google Search Console impressions (90d) plus the
 * core commercial guides that support the money pages. See
 * docs/audits/2026-06-03-gsc-seo-content-audit.md and
 * docs/audits/2026-06-03-3llm-brain-review.md.
 */

/** robots value for an iceboxed page: out of the index, but links still followed. */
export const ICEBOX_ROBOTS = { index: false, follow: true } as const

/** Blog: 11 pages with GSC impressions + the deepened core commercial guides. */
export const KEEP_INDEXED_BLOG = new Set<string>([
  "can-you-get-antibiotics-online-australia",
  "pbs-pharmaceutical-benefits-scheme",
  "parents-sick-child-certificate",
  "work-from-home-sick-certificate",
  "mental-health-certificate-work",
  "is-telehealth-bulk-billed-australia",
  "online-doctor-certificate-for-work",
  "is-telehealth-safe",
  "telehealth-safety-screening",
  "burnout-vs-stress",
  "ahpra-registered-doctor-meaning",
  "medical-certificate-online-australia",
  "online-prescription-australia",
  "repeat-prescription-online-australia",
  "uti-antibiotics-online-australia",
  "medical-certificate-for-work",
  "medical-certificate-backdating",
  "doctors-note-australia",
  "medications-not-prescribed-online",
  "are-online-medical-certificates-valid-australia",
  "medical-certificate-carers-leave",
  "erectile-dysfunction-treatment-online-australia",
  "hair-loss-treatment-online-australia",
  "how-escripts-work",
  "can-employer-reject-medical-certificate",
  "sick-leave-rights-australia",
  "telehealth-vs-gp-australia",
  "what-is-telehealth",
  "how-to-verify-online-doctor",
  "sildenafil-vs-tadalafil",
  "finasteride-vs-minoxidil-hair-loss",
  "online-doctor-consultation-australia",
  "how-long-can-medical-certificate-cover",
  "university-medical-certificates",
  "medical-certificate-same-day",
  "medical-certificate-period-pain",
  "telehealth-after-hours",
  "medical-certificate-food-poisoning",
  "generic-vs-brand-medications",
  "when-telehealth-cant-help",
  "is-telehealth-legal-australia",
  "amoxicillin-guide-australia",
  "metformin-type-2-diabetes-guide",
  "omeprazole-vs-pantoprazole",
  "sertraline-vs-escitalopram",
  "return-to-work-after-illness",
  "medical-certificate-surgery-recovery",
])

/** Conditions: the ~15 with any GSC impressions in 90 days. */
export const KEEP_INDEXED_CONDITIONS = new Set<string>([
  "cold-and-flu",
  "asthma",
  "pink-eye",
  "weight-management",
  "anxiety",
  "gout",
  "hypothyroidism",
  "migraine",
  "eczema",
  "vitamin-d-deficiency",
  "hypertension",
  "acid-reflux",
  "depression",
  "type-2-diabetes",
  "high-cholesterol",
])

/** Symptoms: only neck-pain has impressions so far. */
export const KEEP_INDEXED_SYMPTOMS = new Set<string>(["neck-pain"])

/** Locations: the two with traction (newcastle, canberra) + the major metros. */
export const KEEP_INDEXED_LOCATIONS = new Set<string>([
  "newcastle",
  "canberra",
  "sydney",
  "melbourne",
  "brisbane",
  "perth",
  "adelaide",
])

/**
 * Surfaces iceboxed WHOLESALE (every URL noindexed + dropped from the sitemap):
 * for, guides, intent. All are 0-impression; re-index individually by moving a
 * slug into a keep-set if/when it earns its place.
 *
 * NOTE: `compare` is NOT wholesale-iceboxed — it has a per-slug keep-set
 * (KEEP_INDEXED_COMPARE below). Individual compare pages are re-indexed by
 * adding their slug there; the rest stay noindex,follow.
 */
export const ICEBOXED_SURFACES = new Set<string>(["for", "guides", "intent"])

/**
 * Compare: per-slug keep-set. The cross-provider price/feature table at
 * `online-medical-certificate-options` is a dated, fact-only LLM-citation
 * target (re-indexed 2026-06-11 after the price-table upgrade). Other compare
 * pages stay noindex,follow until they earn their place.
 */
export const KEEP_INDEXED_COMPARE = new Set<string>([
  "online-medical-certificate-options",
])
export function shouldIndexCompare(slug: string): boolean {
  return KEEP_INDEXED_COMPARE.has(slug)
}

/**
 * True if a root-sitemap path lives under a wholesale-iceboxed surface
 * (compare / for / guides / intent). Used to keep those URLs — the surface hub
 * AND every static child (`/for/corporate`, `/for/employers/woolworths`, …) —
 * out of the root sitemap, mirroring the per-surface sitemaps that return [].
 */
export function isIceboxedSurfacePath(path: string): boolean {
  const firstSegment = path.replace(/^\//, "").split("/")[0]
  return ICEBOXED_SURFACES.has(firstSegment)
}

export function shouldIndexBlog(slug: string): boolean {
  return KEEP_INDEXED_BLOG.has(slug)
}
export function shouldIndexCondition(slug: string): boolean {
  return KEEP_INDEXED_CONDITIONS.has(slug)
}
export function shouldIndexSymptom(slug: string): boolean {
  return KEEP_INDEXED_SYMPTOMS.has(slug)
}
export function shouldIndexLocation(slug: string): boolean {
  return KEEP_INDEXED_LOCATIONS.has(slug)
}
