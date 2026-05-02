const DEFAULT_POST_AUTH_DESTINATION = "/patient"

const TRUSTED_ABSOLUTE_REDIRECT_ORIGINS = new Set([
  "https://instantmed.com.au",
  "https://www.instantmed.com.au",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
])

function decodeRedirectCandidate(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function containsControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code <= 31 || code === 127) return true
  }
  return false
}

function hasUnsafePathPrefix(pathname: string): boolean {
  return (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname.startsWith("/\\") ||
    containsControlCharacter(pathname)
  )
}

export function normalizePostAuthRedirect(
  value: string | null | undefined,
  fallback = DEFAULT_POST_AUTH_DESTINATION,
  currentOrigin?: string,
): string {
  if (!value) return fallback

  const candidate = decodeRedirectCandidate(value.trim())
  if (!candidate) return fallback

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate)
      const trustedOrigins = new Set(TRUSTED_ABSOLUTE_REDIRECT_ORIGINS)
      if (currentOrigin) trustedOrigins.add(currentOrigin)
      if (!trustedOrigins.has(url.origin)) return fallback
      const normalized = `${url.pathname}${url.search}${url.hash}`
      return hasUnsafePathPrefix(normalized) ? fallback : normalized
    } catch {
      return fallback
    }
  }

  if (hasUnsafePathPrefix(candidate)) return fallback

  try {
    const url = new URL(candidate, "https://instantmed.local")
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export function getPostAuthRedirectParam(
  searchParams: Pick<URLSearchParams, "get">,
  fallback = "",
  currentOrigin?: string,
): string {
  return normalizePostAuthRedirect(
    searchParams.get("redirect_url") || searchParams.get("redirect") || searchParams.get("next"),
    fallback,
    currentOrigin,
  )
}
