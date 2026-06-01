import { buildPostSignInRedirectHref } from "@/lib/navigation/auth-handoff"

import { normalizePostAuthRedirect } from "./redirects"

export function resolvePostAuthDestination(next: string | null, currentOrigin?: string): string {
  const safeNext = normalizePostAuthRedirect(next, "", currentOrigin)
  return buildPostSignInRedirectHref(safeNext)
}
