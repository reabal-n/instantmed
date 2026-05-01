const DEFAULT_ALLOWED_PATTERNS = [
  "localhost",
  "127.0.0.1",
  "::1",
  "*.localhost",
  "*.vercel.app",
  "instantmed.com.au",
  "www.instantmed.com.au",
]

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "")
}

function getConfiguredAllowedPatterns(): string[] {
  const configured = process.env.NEXT_PUBLIC_PARCHMENT_IFRAME_ALLOWED_HOSTS
  if (!configured) return DEFAULT_ALLOWED_PATTERNS

  const patterns = configured
    .split(",")
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean)

  return patterns.length > 0 ? patterns : DEFAULT_ALLOWED_PATTERNS
}

export function matchesParchmentIframeHostPattern(hostname: string, pattern: string): boolean {
  const normalizedHost = normalizeHostname(hostname)
  const normalizedPattern = normalizeHostname(pattern)

  if (!normalizedHost || !normalizedPattern) return false
  if (normalizedHost === normalizedPattern) return true

  if (normalizedPattern.startsWith("*.")) {
    const suffix = normalizedPattern.slice(1)
    return normalizedHost.endsWith(suffix) && normalizedHost.length > suffix.length
  }

  return false
}

export function canEmbedParchmentForHost(hostname: string, patterns = getConfiguredAllowedPatterns()): boolean {
  return patterns.some((pattern) => matchesParchmentIframeHostPattern(hostname, pattern))
}
