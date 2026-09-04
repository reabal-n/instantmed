import {
  getActiveServices,
  getServiceMarketingHref,
} from "@/lib/services/service-catalog"

const INSTANTMED_HOSTS = new Set(["instantmed.com.au", "www.instantmed.com.au"])

/** Canonical active service pages. New active catalog entries join automatically. */
export const GUIDE_FORBIDDEN_ACTIVE_SERVICE_ROOTS = Object.freeze(
  getActiveServices().map(getServiceMarketingHref),
)

/** Indexed head-term landing pages whose job includes service acquisition. */
export const GUIDE_FORBIDDEN_SITEMAP_PILLAR_ROOTS = [
  "/online-doctor-australia",
  "/telehealth-australia",
] as const

/** Indexed marketing hubs and SEO variants beyond the canonical service catalog. */
export const GUIDE_FORBIDDEN_MARKETING_VARIANT_ROOTS = [
  "/medical-certificate-online",
  "/online-prescriptions",
  "/pricing",
  "/mens-health",
  "/mental-health-online",
  "/weight-loss-online",
  "/uti-assessment-online",
  "/contraceptive-pill-assessment-online",
] as const

/** Indexed money pages and variants that live in the root sitemap's static group. */
export const GUIDE_FORBIDDEN_SITEMAP_STATIC_ROOTS = Object.freeze([
  ...new Set([
    ...GUIDE_FORBIDDEN_ACTIVE_SERVICE_ROOTS,
    ...GUIDE_FORBIDDEN_MARKETING_VARIANT_ROOTS,
  ]),
])

/** Indexed acquisition hubs kept in the root sitemap's lower-priority service group. */
export const GUIDE_FORBIDDEN_SITEMAP_SERVICE_ROOTS = ["/consult"] as const

/** Direct and compatibility entry points into the transactional intake. */
export const GUIDE_FORBIDDEN_TRANSACTION_ROOTS = ["/request", "/start"] as const

/** Public redirect aliases that still resolve into an acquisition surface. */
export const GUIDE_FORBIDDEN_REDIRECT_ALIAS_ROOTS = [
  "/medical-certificates",
  "/repeat-prescription",
  "/repeat-prescriptions",
  "/referrals",
  "/ed",
  "/prescription",
  "/weight-management",
  "/gp-consult",
  "/flow",
  "/general-consult",
  "/performance-anxiety",
] as const

/** Retired commercial-intent URLs remain acquisition destinations even while noindexed. */
export const GUIDE_FORBIDDEN_COMMERCIAL_SEO_ROOTS = ["/intent"] as const

export const GUIDE_FORBIDDEN_SITEMAP_ROOTS = Object.freeze([
  ...GUIDE_FORBIDDEN_SITEMAP_PILLAR_ROOTS,
  ...GUIDE_FORBIDDEN_SITEMAP_STATIC_ROOTS,
  ...GUIDE_FORBIDDEN_SITEMAP_SERVICE_ROOTS,
])

export const GUIDE_FORBIDDEN_ACQUISITION_ROOTS = Object.freeze([
  ...new Set([
    ...GUIDE_FORBIDDEN_ACTIVE_SERVICE_ROOTS,
    ...GUIDE_FORBIDDEN_SITEMAP_ROOTS,
    ...GUIDE_FORBIDDEN_TRANSACTION_ROOTS,
    ...GUIDE_FORBIDDEN_REDIRECT_ALIAS_ROOTS,
    ...GUIDE_FORBIDDEN_COMMERCIAL_SEO_ROOTS,
  ]),
])

function decodePathname(pathname: string): string {
  let decoded = pathname

  for (let pass = 0; pass < 3; pass += 1) {
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    } catch {
      break
    }
  }

  return decoded
}

export function resolveInstantMedDestinationPath(
  destination: string,
  baseUrl: string | URL = "https://instantmed.com.au/blog/guide",
): string | null {
  try {
    const destinationUrl = new URL(destination, baseUrl)
    if (!INSTANTMED_HOSTS.has(destinationUrl.hostname)) return null
    if (!["http:", "https:"].includes(destinationUrl.protocol)) return null

    const decodedPathname = decodePathname(destinationUrl.pathname)
    const normalizedPathname = new URL(decodedPathname, "https://instantmed.com.au").pathname
      .replace(/\/{2,}/g, "/")

    return normalizedPathname.length > 1
      ? normalizedPathname.replace(/\/$/, "")
      : normalizedPathname
  } catch {
    return null
  }
}

export function isGuideForbiddenAcquisitionDestination(
  destination: string,
  baseUrl?: string | URL,
): boolean {
  const pathname = resolveInstantMedDestinationPath(destination, baseUrl)
  if (!pathname) return false

  return GUIDE_FORBIDDEN_ACQUISITION_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  )
}
