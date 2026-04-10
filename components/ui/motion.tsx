"use client"

import * as React from "react"

/**
 * InstantMed Motion System — Hooks & Scroll Config
 *
 * Canonical motion tokens (duration, easing, variants) live in `@/lib/motion`.
 * This file provides the reactive `useReducedMotion` hook and scroll config.
 *
 * All components should import `useReducedMotion` from here — NOT from framer-motion.
 * Import `motion` and `AnimatePresence` directly from framer-motion.
 *
 * Motion exists to confirm, not to impress.
 */

// ===========================================
// SCROLL REVEAL CONFIG
// ===========================================

/** Scroll reveal defaults for IntersectionObserver-based animations */
export const scrollRevealConfig = {
  threshold: 0,
  once: true,
  margin: "-50px",
} as const;

// ===========================================
// HOOKS
// ===========================================

/**
 * Reactive hook for reduced motion preference.
 *
 * Unlike framer-motion's `useReducedMotion`, this hook:
 * - Returns `false` during SSR (safe for server components)
 * - Listens for live changes to the media query
 * - Is the single canonical source for reduced-motion checks
 */
export function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setReduced(event.matches)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return reduced
}
