/**
 * Client-safe freshness window for the "Last reviewed N min ago" signal.
 * Lives outside lib/brand/last-reviewed.ts because that module is server-only
 * (service-role Supabase client) and the signal component is a client
 * component.
 *
 * The signal renders only while the latest real review is at most this old;
 * outside the window it renders nothing. An honest absence beats a stale
 * "N min ago".
 */
const LAST_REVIEWED_FRESH_MINUTES = 60

/**
 * Pure label derivation so the truth rules are unit-testable in the Node test
 * environment (components are not renderable there).
 *
 * Returns null when the signal must not render: missing/invalid timestamp,
 * clock skew (future timestamp), or a review older than the freshness window.
 */
export function lastReviewedLabel(
  reviewedAtMs: number | null,
  nowMs: number,
): string | null {
  if (reviewedAtMs === null || !Number.isFinite(reviewedAtMs)) return null

  const minutes = Math.floor((nowMs - reviewedAtMs) / 60_000)
  if (minutes < 0 || minutes > LAST_REVIEWED_FRESH_MINUTES) return null

  return minutes <= 1 ? "Last reviewed just now" : `Last reviewed ${minutes} min ago`
}
