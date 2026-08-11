/**
 * Referrer privacy — sanitize before ANY persistence.
 *
 * A raw referrer can carry paths and query strings (an internal
 * `/request?service=…` navigation, a share-link slug on an external site).
 * Nothing downstream needs more than the origin for an external referrer or
 * the path for an internal one, so everything else is dropped at capture —
 * cookie, sessionStorage, localStorage, checkout normalization, and events
 * all receive the sanitized value.
 */

const INTERNAL_ORIGINS: ReadonlySet<string> = new Set([
  "https://instantmed.com.au",
  "https://www.instantmed.com.au",
])

/**
 * Reduce a referrer to what attribution actually uses:
 * - internal referrer (site origin or `siteOrigin`) → pathname only
 * - external referrer → origin only
 * - unparseable / scheme-less / empty → undefined
 */
export function sanitizeAttributionReferrer(
  value: string | null | undefined,
  siteOrigin?: string | null,
): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return undefined
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined

  const isInternal =
    INTERNAL_ORIGINS.has(parsed.origin) ||
    (Boolean(siteOrigin) && parsed.origin === siteOrigin)

  return isInternal ? parsed.pathname || "/" : parsed.origin
}
