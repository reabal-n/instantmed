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

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function isSensitiveCapabilityPathname(pathname: string): boolean {
  return SENSITIVE_CAPABILITY_PATH_PREFIXES.some(
    (prefix) => matchesPathPrefix(pathname, prefix),
  )
}

export function isExternalAnalyticsExcludedPathname(pathname: string): boolean {
  return isSensitiveCapabilityPathname(pathname) ||
    PRIVATE_APP_PATH_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix))
}

function redactSensitiveCapabilityPathname(pathname: string): string {
  for (const prefix of SENSITIVE_CAPABILITY_PATH_PREFIXES) {
    if (pathname.startsWith(`${prefix}/`)) return `${prefix}/[REDACTED]`
  }

  return pathname
}

export function redactExternalAnalyticsPathname(pathname: string): string {
  const capabilityPath = redactSensitiveCapabilityPathname(pathname)
  if (capabilityPath !== pathname) return capabilityPath

  for (const prefix of PRIVATE_APP_PATH_PREFIXES) {
    // Private routes are excluded from external analytics entirely. Preserve
    // static route names for first-party/Sentry diagnosis, but redact any UUID
    // path segment as a final guard if a URL reaches a scrubber unexpectedly.
    if (matchesPathPrefix(pathname, prefix) && UUID_PATH_SEGMENT_RE.test(pathname)) {
      return `${prefix}/[REDACTED]`
    }
  }

  return pathname
}

export function isSensitiveCapabilityPath(): boolean {
  if (typeof window === "undefined") return false
  return isSensitiveCapabilityPathname(window.location.pathname)
}

export function isExternalAnalyticsExcludedPath(): boolean {
  if (typeof window === "undefined") return false
  return isExternalAnalyticsExcludedPathname(window.location.pathname)
}
