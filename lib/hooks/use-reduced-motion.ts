"use client"

import { useSyncExternalStore } from "react"

/**
 * Hook to detect if user prefers reduced motion
 * Use this to disable animations for accessibility
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
