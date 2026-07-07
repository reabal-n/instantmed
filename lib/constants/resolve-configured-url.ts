/**
 * Placeholder-safe resolution for env-configured URLs.
 *
 * The 2026-07-06 incident: `PRODUCTREVIEW_REVIEW_URL` was set to `example.com`
 * in Vercel (by an AI agent), and the `process.env.X || default` pattern only
 * guards against an EMPTY value — a placeholder string is truthy, so it silently
 * overrode the correct default and sent every review CTA to a dead link.
 *
 * This resolver treats a placeholder or structurally-invalid URL as "unset" and
 * falls back to the code default, so a bad env value can never reach users. Pure
 * and side-effect-free (safe to evaluate at module load on client and server).
 */

// Hosts that are never a real production destination. Matches the host exactly
// or as a parent domain (example.com AND www.example.com). `localhost` is
// intentionally NOT here — dev/test legitimately use it.
const PLACEHOLDER_HOST = /(^|\.)(example\.(com|org|net)|test\.(com|test)|your-domain\b|changeme\b|placeholder\b|todo\b)/i

export function isPlaceholderUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return true // not a valid absolute URL at all → treat as placeholder
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return true
  return PLACEHOLDER_HOST.test(url.hostname)
}

/**
 * Resolve an env-configured URL, ignoring empty / placeholder / invalid values
 * in favour of the code default. `name` is for callers that want to log a
 * detection; this function itself never logs (keeps it pure + bundle-safe).
 */
export function resolveConfiguredUrl(raw: string | undefined | null, fallback: string): string {
  const value = raw?.trim()
  if (!value) return fallback
  if (isPlaceholderUrl(value)) return fallback
  return value
}
