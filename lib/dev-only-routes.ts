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
  if (process.env.PLAYWRIGHT === "1") return true
  return process.env.NODE_ENV === "development" && !isVercelProdOrPreview()
}
