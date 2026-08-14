const AUTH_IMMEDIATE_PATH_PREFIXES = [
  "/account",
  "/admin",
  "/auth",
  "/dashboard",
  "/doctor",
  "/patient",
  "/sign-in",
  "/sign-up",
]

const AUTH_IMMEDIATE_ROOT_PATHS = new Set([
  "/",
  "/medical-certificate",
  "/prescriptions",
  "/consult",
  "/erectile-dysfunction",
  "/hair-loss",
  "/womens-health",
  "/about",
  "/pricing",
  "/contact",
])

/**
 * Return the default storage key used by @supabase/supabase-js for auth.
 * A null result must fail safe by keeping remote session verification enabled.
 */
export function getSupabaseAuthCookieName(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null

  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0]
    return projectRef ? `sb-${projectRef}-auth-token` : null
  } catch {
    return null
  }
}

/**
 * This is only a routing optimization. Cookie presence never authenticates or
 * authorizes a request; it only decides whether Supabase should verify it.
 */
export function requestMayHaveSupabaseSession(
  cookieNames: readonly string[],
  supabaseUrl: string | undefined,
): boolean {
  const authCookieName = getSupabaseAuthCookieName(supabaseUrl)
  if (!authCookieName) return true

  return cookieNames.some(
    (name) => name === authCookieName || name.startsWith(`${authCookieName}.`),
  )
}

export type InitialAuthLoadPlan = "anonymous" | "defer" | "verify"

/**
 * Decide when the browser SDK is necessary. Cookie presence is only a signal
 * to verify remotely; it never authenticates or authorizes the visitor.
 */
export function resolveInitialAuthLoadPlan(
  pathname: string,
  cookieNames: readonly string[],
  supabaseUrl: string | undefined,
): InitialAuthLoadPlan {
  const isProtectedPath = AUTH_IMMEDIATE_PATH_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (isProtectedPath) return "verify"
  if (!AUTH_IMMEDIATE_ROOT_PATHS.has(pathname)) return "defer"

  return requestMayHaveSupabaseSession(cookieNames, supabaseUrl)
    ? "verify"
    : "anonymous"
}
