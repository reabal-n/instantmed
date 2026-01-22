"use client"

import { useSyncExternalStore } from "react"

/**
 * Hook to detect if user prefers reduced motion
 * Use this to disable animations for accessibility
 *
 * Usage:
 * const prefersReducedMotion = useReducedMotion()
 *
 * <motion.div
 *   animate={prefersReducedMotion ? {} : { scale: 1.1 }}
 *   transition={getAccessibleTransition(prefersReducedMotion)}
 * />
 */
export function useReducedMotion(): boolean {
  const subscribe = (callback: () => void) => {
    if (typeof window === "undefined") return () => {}
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    mediaQuery.addEventListener("change", callback)
    return () => mediaQuery.removeEventListener("change", callback)
  }

  const getSnapshot = () => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/**
 * Get motion props that respect reduced motion preferences
 * Use this to wrap Framer Motion animations
 */
export function getReducedMotionProps<T extends Record<string, unknown>>(
  prefersReducedMotion: boolean,
  fullMotionProps: T,
  reducedMotionProps: Partial<T> = {} as Partial<T>
): T | Partial<T> {
  return prefersReducedMotion ? reducedMotionProps : fullMotionProps
}

/**
 * Default transition that respects reduced motion
 */
export function getAccessibleTransition(prefersReducedMotion: boolean) {
  if (prefersReducedMotion) {
    return { duration: 0 }
  }
  return {
    type: "spring" as const,
    stiffness: 200,
    damping: 25,
  }
}

/**
 * Fade animation props that respect reduced motion
 */
export function getAccessibleFade(prefersReducedMotion: boolean) {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 1 },
    }
  }
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  }
}
