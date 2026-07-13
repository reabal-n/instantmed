export const DEV_ONLY_ROUTE_PREFIXES = [
  "/api/test",
  "/email-preview",
  "/sentry-test",
  "/cert-preview",
] as const

export function isDevOnlyRoute(pathname: string): boolean {
  return DEV_ONLY_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function isVercelProdOrPreview(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview"
}

export function canAccessDevOnlyRoute(): boolean {
  if (isVercelProdOrPreview()) return false
  if (process.env.PLAYWRIGHT === "1") return true
  return process.env.NODE_ENV === "development"
}

export function isE2ETestModeEnabled(): boolean {
  if (isVercelProdOrPreview()) return false
  return process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT === "1"
}

export function isAllowedDevOnlyRequest(request: Request): boolean {
  if (!isE2ETestModeEnabled()) return false

  const host = request.headers.get("host") || ""
  const origin = request.headers.get("origin") || ""
  const allowedHosts = [
    "localhost",
    "127.0.0.1",
    ...(process.env.E2E_ALLOWED_HOSTS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ]

  const hostWithoutPort = host.split(":")[0]
  if (allowedHosts.includes(hostWithoutPort)) return true

  try {
    return allowedHosts.includes(new URL(origin).hostname)
  } catch {
    return false
  }
}
