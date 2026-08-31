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

function normalizeParsedRedirect(url: URL, fallback: string): string {
  const normalized = `${url.pathname}${url.search}${url.hash}`
  const decodedPathname = decodeRedirectCandidate(url.pathname)
  const decodedSuffix = decodeRedirectCandidate(`${url.search}${url.hash}`)

  return hasUnsafePathPrefix(decodedPathname) || containsControlCharacter(decodedSuffix)
    ? fallback
    : normalized
}

export function normalizePostAuthRedirect(
  value: string | null | undefined,
  fallback = DEFAULT_POST_AUTH_DESTINATION,
  currentOrigin?: string,
): string {
  if (!value) return fallback

  const trimmed = value.trim()
  const candidate = trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed)
    ? trimmed
    : decodeRedirectCandidate(trimmed)
  if (!candidate) return fallback
  if (containsControlCharacter(candidate)) return fallback

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate)
      const trustedOrigins = new Set(TRUSTED_ABSOLUTE_REDIRECT_ORIGINS)
      if (currentOrigin) trustedOrigins.add(currentOrigin)
      if (!trustedOrigins.has(url.origin)) return fallback
      return normalizeParsedRedirect(url, fallback)
    } catch {
      return fallback
    }
  }

  if (hasUnsafePathPrefix(candidate)) return fallback

  try {
    const url = new URL(candidate, "https://instantmed.local")
    return normalizeParsedRedirect(url, fallback)
  } catch {
    return fallback
  }
}

export function buildSignInRedirectHref(
  value: string | null | undefined,
  currentOrigin?: string,
): string {
  const safeRedirect = normalizePostAuthRedirect(value, "", currentOrigin)
  return safeRedirect
    ? `/sign-in?redirect=${encodeURIComponent(safeRedirect)}`
    : "/sign-in"
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
