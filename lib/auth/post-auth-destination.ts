export function resolvePostAuthDestination(next: string | null): string {
  if (!next) return "/auth/post-signin"

  if (next.startsWith("/auth/post-signin") && !next.startsWith("//")) {
    return next
  }

  if (next.startsWith("/") && !next.startsWith("//")) {
    return `/auth/post-signin?redirect=${encodeURIComponent(next)}`
  }

  return "/auth/post-signin"
}
