import { normalizePostAuthRedirect } from "./redirects"

export function resolvePostAuthDestination(next: string | null, currentOrigin?: string): string {
  const safeNext = normalizePostAuthRedirect(next, "", currentOrigin)
  if (!safeNext) return "/auth/post-signin"

  if (safeNext.startsWith("/auth/post-signin")) {
    return safeNext
  }

  return `/auth/post-signin?redirect=${encodeURIComponent(safeNext)}`
}
