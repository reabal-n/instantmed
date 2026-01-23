"use client"

import { useState, useEffect } from "react"

/**
 * Hook to detect user's reduced motion preference
 * Returns true if user prefers reduced motion (accessibility setting)
 * 
 * Usage:
 * const prefersReducedMotion = useReducedMotion()
 * const animationProps = prefersReducedMotion ? {} : { animate: { x: 10 } }
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches)

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener("change", handleChange)

    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [])

  return prefersReducedMotion
}

/**
 * Returns animation variants that respect reduced motion preference
 * Use with Framer Motion
 */
export function useMotionSafe() {
  const prefersReducedMotion = useReducedMotion()

  return {
    prefersReducedMotion,
    // Safe transition that respects user preference
    transition: prefersReducedMotion 
      ? { duration: 0 } 
      : { duration: 0.3, ease: "easeOut" },
    // Safe spring that respects user preference
    spring: prefersReducedMotion
      ? { duration: 0 }
      : { type: "spring", stiffness: 300, damping: 30 },
    // Helper to conditionally apply animation
    animate: <T,>(enabled: T, disabled: T = {} as T): T => 
      prefersReducedMotion ? disabled : enabled,
  }
}
