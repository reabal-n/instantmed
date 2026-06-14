/**
 * Canonical URL normalisation for middleware.
 *
 * Two signal-splitting problems this collapses into a single 301:
 *  1. www vs non-www — the apex domain is canonical.
 *  2. Trailing slash — Next's automatic trailing-slash redirect is bypassed
 *     because middleware returns a response on every matched request, so both
 *     /path and /path/ were serving HTTP 200. With correct self-canonicals
 *     Google would eventually consolidate, but a 301 does it immediately and
 *     stops authority leaking across variants.
 *
 * Pure + framework-free so the loop-safety and /api exclusion are unit-tested
 * without constructing a NextRequest. Returns the parts that need changing, or
 * null when the URL is already canonical (so the caller issues no redirect —
 * critical: returning a redirect for an already-clean URL would loop).
 */
const APEX_HOST = "instantmed.com.au"
const WWW_HOST = "www.instantmed.com.au"

export interface CanonicalRedirect {
  hostname?: string
  pathname?: string
}

export function getCanonicalRedirect(
  hostname: string,
  pathname: string,
): CanonicalRedirect | null {
  const result: CanonicalRedirect = {}

  if (hostname === WWW_HOST) {
    result.hostname = APEX_HOST
  }

  // Strip a trailing slash on everything except the root and /api/* paths.
  // /api is excluded so we never rewrite the shape of a webhook/endpoint URL.
  if (
    pathname.length > 1 &&
    pathname.endsWith("/") &&
    !pathname.startsWith("/api/")
  ) {
    result.pathname = pathname.replace(/\/+$/, "")
  }

  return result.hostname || result.pathname ? result : null
}
