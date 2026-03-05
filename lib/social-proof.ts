/**
 * Centralized Social Proof — Single Source of Truth
 *
 * Patient counter uses linear interpolation:
 *   Anchor: March 4, 2026 → 2,400 patients
 *   Target: December 31, 2026 → 100,000 patients
 *   Rate: ~323 patients/day
 *
 * Use `getPatientCount()` for server-side, `usePatientCount()` for client.
 * All social proof stats (rating, response time) live here.
 */

import { useState, useEffect, useSyncExternalStore, useCallback } from "react"

// ─── Counter Anchors ───────────────────────────────────────────────

/** AEST (UTC+11) anchor date */
const ANCHOR_DATE = new Date("2026-03-04T00:00:00+11:00")
const ANCHOR_COUNT = 2_400

/** AEST (UTC+11) target date */
const TARGET_DATE = new Date("2026-12-31T23:59:59+11:00")
const TARGET_COUNT = 100_000

const TOTAL_GROWTH = TARGET_COUNT - ANCHOR_COUNT
const TOTAL_MS = TARGET_DATE.getTime() - ANCHOR_DATE.getTime()

// ─── Platform Stats ────────────────────────────────────────────────

export const SOCIAL_PROOF = {
  averageRating: 4.9,
  averageResponseMinutes: 34,
  ahpraVerifiedPercent: 100,
  operatingDays: 7,
  /** Approximate number of collected reviews (subset of total patients) */
  reviewCount: 847,
} as const

// ─── Counter Logic ─────────────────────────────────────────────────

/**
 * Returns the interpolated patient count for the current moment.
 * Before anchor date → ANCHOR_COUNT.
 * After target date → TARGET_COUNT.
 * Between → linear interpolation.
 */
export function getPatientCount(now: Date = new Date()): number {
  const elapsed = now.getTime() - ANCHOR_DATE.getTime()

  if (elapsed <= 0) return ANCHOR_COUNT
  if (elapsed >= TOTAL_MS) return TARGET_COUNT

  const progress = elapsed / TOTAL_MS
  return Math.floor(ANCHOR_COUNT + progress * TOTAL_GROWTH)
}

// ─── Hydration-Safe Hook ───────────────────────────────────────────

/**
 * SSR-safe hook that returns the current patient count.
 * Updates every `intervalMs` (default 15s) for a slow, realistic tick.
 */
export function usePatientCount(intervalMs: number = 15_000): number {
  // Prevent hydration mismatch — render nothing on server
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const [count, setCount] = useState(() => getPatientCount())

  const tick = useCallback(() => {
    setCount(getPatientCount())
  }, [])

  useEffect(() => {
    if (!mounted) return
    // Sync immediately on mount
    tick()
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [mounted, intervalMs, tick])

  return mounted ? count : ANCHOR_COUNT
}
