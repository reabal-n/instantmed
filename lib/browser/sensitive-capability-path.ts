const SENSITIVE_CAPABILITY_PATH_PREFIXES = [
  "/auth/complete-account",
  "/track",
  "/resume",
] as const
const PRIVATE_APP_PATH_PREFIXES = [
  "/account",
  "/admin",
  "/auth",
  "/dashboard",
  "/doctor",
  "/patient",
  "/sign-in",
  "/sign-up",
] as const

const UUID_PATH_SEGMENT_RE = /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\/|$)/i
const AMBIGUOUS_PATHNAME_CHARACTER_RE = /[?#\\]/
const MAX_PATHNAME_DECODE_PASSES = 4

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127
  })
}

function canonicalizePathname(pathname: string): string | null {
  let decoded = pathname

  for (let pass = 0; pass < MAX_PATHNAME_DECODE_PASSES; pass += 1) {
    let next: string
    try {
      next = decodeURIComponent(decoded)
    } catch {
      return null
    }

    if (next === decoded) break
    decoded = next
  }

  try {
    if (decodeURIComponent(decoded) !== decoded) return null
  } catch {
    return null
  }

  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    AMBIGUOUS_PATHNAME_CHARACTER_RE.test(decoded) ||
    hasControlCharacter(decoded) ||
    decoded.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    return null
  }

  return decoded
}

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function isSensitiveCapabilityPathname(pathname: string): boolean {
  return SENSITIVE_CAPABILITY_PATH_PREFIXES.some(
    (prefix) => matchesPathPrefix(pathname, prefix),
  )
}

export function isExternalAnalyticsExcludedPathname(pathname: string): boolean {
  const decoded = canonicalizePathname(pathname)
  if (decoded === null) return true

  return isSensitiveCapabilityPathname(decoded) ||
    PRIVATE_APP_PATH_PREFIXES.some((prefix) => matchesPathPrefix(decoded, prefix)) ||
    UUID_PATH_SEGMENT_RE.test(decoded)
}

function redactSensitiveCapabilityPathname(pathname: string): string {
  for (const prefix of SENSITIVE_CAPABILITY_PATH_PREFIXES) {
    if (pathname.startsWith(`${prefix}/`)) return `${prefix}/[REDACTED]`
  }

  return pathname
}

export function redactExternalAnalyticsPathname(pathname: string): string {
  const decoded = canonicalizePathname(pathname)
  if (decoded === null) return "/[REDACTED]"

  const capabilityPath = redactSensitiveCapabilityPathname(decoded)
  if (capabilityPath !== decoded) return capabilityPath

  for (const prefix of PRIVATE_APP_PATH_PREFIXES) {
    // Private routes are excluded from external analytics entirely. Preserve
    // static route names for first-party/Sentry diagnosis, but redact any UUID
    // path segment as a final guard if a URL reaches a scrubber unexpectedly.
    if (matchesPathPrefix(decoded, prefix) && UUID_PATH_SEGMENT_RE.test(decoded)) {
      return `${prefix}/[REDACTED]`
    }
  }

  return decoded
}

export function isSensitiveCapabilityPath(): boolean {
  if (typeof window === "undefined") return false
  const decoded = canonicalizePathname(window.location.pathname)
  return decoded === null || isSensitiveCapabilityPathname(decoded)
}

export function isExternalAnalyticsExcludedPath(): boolean {
  if (typeof window === "undefined") return false
  return isExternalAnalyticsExcludedPathname(window.location.pathname)
}
