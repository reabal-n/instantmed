"use client"

import { useState, useEffect, useSyncExternalStore } from "react"
import { getPatientCount, ANCHOR_COUNT } from "@/lib/social-proof"

/**
 * SSR-safe hook that returns the real patient count from the DB.
 *
 * - Server render / before hydration → interpolated ANCHOR_COUNT (no flicker)
 * - On mount → fetches /api/patient-count (real DB count, 1h cached)
 * - Falls back to interpolated count if fetch fails
 */
export function usePatientCount(): number {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const [count, setCount] = useState(() => getPatientCount())

  useEffect(() => {
    if (!mounted) return

    fetch("/api/patient-count")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count: number } | null) => {
        if (data && typeof data.count === "number" && data.count > 0) {
          setCount(data.count)
        }
      })
      .catch(() => {
        // Silently fall back to interpolated count already in state
      })
  }, [mounted])

  return mounted ? count : ANCHOR_COUNT
}
