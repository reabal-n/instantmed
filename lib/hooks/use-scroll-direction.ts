"use client"

import { useEffect, useState } from "react"

export type ScrollDirection = "up" | "down" | null

interface UseScrollDirectionOptions {
  /** Minimum scroll delta (px) before flipping direction. Filters out
   * noise from tiny scrolls and bounce-back. */
  threshold?: number
  /** Below this scroll position (px) always report "up". Useful so the
   * sticky bar stays visible while the user is still near the top. */
  topPadding?: number
}

/**
 * Lightweight scroll-direction hook. Tracks whether the user is scrolling
 * up or down past a small threshold.
 *
 * SSR-safe: returns null on the server and during the first paint. Passive
 * listener on window scroll. RAF-throttled so we don't fire on every
 * pixel of inertial scroll.
 *
 * Used by the marketing sticky-CTA to collapse on scroll-down (give the
 * user room to read) and restore on scroll-up (they're considering acting).
 */
export function useScrollDirection({
  threshold = 8,
  topPadding = 80,
}: UseScrollDirectionOptions = {}): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    let lastY = window.scrollY
    let ticking = false

    function onScroll() {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        const y = window.scrollY
        const delta = y - lastY
        if (y < topPadding) {
          // Always treat near-top scrolls as "up" so the bar shows.
          setDirection("up")
        } else if (Math.abs(delta) >= threshold) {
          setDirection(delta > 0 ? "down" : "up")
          lastY = y
        }
        ticking = false
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [threshold, topPadding])

  return direction
}
