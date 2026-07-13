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
