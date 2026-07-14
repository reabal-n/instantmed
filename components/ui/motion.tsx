"use client"

import { useInView } from "framer-motion"
import * as React from "react"

/**
 * InstantMed Motion System - Hooks & Scroll Config
 *
 * Canonical motion tokens (duration, easing, variants) live in `@/lib/motion`.
 * This file provides the reactive `useReducedMotion` hook and scroll config.
 *
 * All components should import `useReducedMotion` from here - NOT from framer-motion.
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
  /** Pre-fire 100px before the element enters the viewport so transforms
   *  complete by the time the content is actually visible. */
  margin: "-100px",
} as const;

// ===========================================
// HOOKS
// ===========================================

/**
 * Drop-in replacement for the raw `useInView` pattern used across sections/.
 * Reads all options from `scrollRevealConfig` so there's one place to tune globally.
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null)
 *   const isInView = useScrollReveal(ref)
 */
export function useScrollReveal(ref: React.RefObject<Element>) {
  return useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
    margin: scrollRevealConfig.margin,
  })
}

/**
 * Reactive hook for reduced motion preference.
 *
 * Unlike framer-motion's `useReducedMotion`, this hook:
 * - Returns `false` during SSR and the first hydrating render
 * - Listens for live changes to the media query
 * - Is the single canonical source for reduced-motion checks
 */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function subscribeReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  mediaQuery.addEventListener("change", onStoreChange)
  return () => mediaQuery.removeEventListener("change", onStoreChange)
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function getServerReducedMotionSnapshot() {
  return false
}

export function useReducedMotion() {
  return React.useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  )
}
