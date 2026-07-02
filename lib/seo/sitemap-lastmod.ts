/**
 * Real per-URL sitemap `lastmod` dates.
 *
 * Seeded from git history — each value is the last commit that touched that
 * route's source (`git log -1 --format=%cd --date=short -- app/<route>`). We
 * BAKE these rather than compute them at build time because Vercel builds use a
 * shallow clone, so a build-time `git log` would return inconsistent/empty
 * results. A single shared date across every page (the previous behaviour) is a
 * fake signal; per-URL dates are the honest one.
 *
 * To refresh after a material change to a page, re-run the command above for
 * that route and update its entry here. Unmapped routes fall back to
 * SITEMAP_LASTMOD_FALLBACK.
 */
export const ROUTE_LAST_MODIFIED: Record<string, string> = {
  "/": "2026-05-26",
  // Head-term pillars
  "/online-doctor-australia": "2026-06-06",
  "/telehealth-australia": "2026-06-06",
  // Money + service landing pages
  "/medical-certificate": "2026-05-19",
  "/medical-certificate-online": "2026-06-25",
  // Med-cert intent children + employer evidence (deepened 2026-06-30 batch)
  "/medical-certificate/work": "2026-06-30",
  "/medical-certificate/study": "2026-06-30",
  "/medical-certificate/carer": "2026-06-30",
  "/medical-certificate/sick-leave": "2026-06-30",
  "/medical-certificate/university": "2026-06-30",
  "/medical-certificate/school": "2026-06-30",
  "/medical-certificate/anxiety": "2026-06-30",
  "/medical-certificate/flu": "2026-06-30",
  "/medical-certificate/work-from-home": "2026-06-30",
  "/medical-certificate/migraine": "2026-06-30",
  "/medical-certificate/gastro": "2026-06-30",
  "/medical-certificate/back-pain": "2026-06-30",
  "/medical-certificate/covid": "2026-06-30",
  "/medical-certificate/employer-acceptance": "2026-06-30",
  "/prescriptions": "2026-06-06",
  "/online-prescriptions": "2026-06-25",
  "/mens-health": "2026-06-25",
  "/hair-loss": "2026-06-10",
  "/erectile-dysfunction": "2026-06-25",
  "/mental-health-online": "2026-06-25",
  "/weight-loss-online": "2026-06-25",
  "/womens-health": "2026-06-16",
  "/uti-assessment-online": "2026-06-25",
  "/contraceptive-pill-assessment-online": "2026-06-25",
  "/consult": "2026-06-18",
  "/verify": "2026-05-19",
  // Conversion + trust surfaces
  "/pricing": "2026-06-05",
  "/how-it-works": "2026-06-05",
  "/faq": "2026-05-19",
  "/about": "2026-06-11",
  "/our-doctors": "2026-06-05",
  "/how-we-decide": "2026-06-06",
  "/clinical-governance": "2026-06-06",
  "/alternatives": "2026-06-05",
  "/employers": "2026-05-19",
  "/trust": "2026-06-06",
  "/resources": "2026-06-06",
  // Content hubs
  "/blog": "2026-05-19",
  "/locations": "2026-05-19",
  "/conditions": "2026-06-02",
  "/symptoms": "2026-05-19",
}

/** Fallback for routes not individually tracked above. */
export const SITEMAP_LASTMOD_FALLBACK = "2026-06-06"

/**
 * Real `lastModified` Date for a sitemap route. Normalises the homepage
 * (`""`) to `"/"` and falls back to SITEMAP_LASTMOD_FALLBACK for untracked
 * routes.
 */
export function routeLastModified(route: string, fallback: string = SITEMAP_LASTMOD_FALLBACK): Date {
  const key = route === "" ? "/" : route
  return new Date(ROUTE_LAST_MODIFIED[key] ?? fallback)
}
