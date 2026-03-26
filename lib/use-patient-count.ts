"use client"

import { useState, useEffect, useSyncExternalStore, useCallback } from "react"
import { getPatientCount, ANCHOR_COUNT } from "./social-proof"

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
