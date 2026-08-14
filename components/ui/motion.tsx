"use client"

import * as React from "react"

/**
 * InstantMed Motion System - Hooks & Scroll Config
 *
 * Canonical motion tokens (duration, easing, variants) live in `@/lib/motion`.
 * This file provides the dependency-light reactive `useReducedMotion` hook.
 *
 * All components should import `useReducedMotion` from here - NOT from framer-motion.
 * Import `motion` and `AnimatePresence` directly from framer-motion.
 *
 * Motion exists to confirm, not to impress.
 */

// ===========================================
// HOOKS
// ===========================================

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
