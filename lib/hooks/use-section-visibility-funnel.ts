"use client"

import { useEffect, useRef } from "react"

/**
 * Observes `[data-track-section]` elements and fires `onView(sectionId)`
 * the first time each enters the viewport (30% threshold).
 *
 * Uses a ref for the callback so the IntersectionObserver is created once
 * and never torn down/recreated on re-renders.
 */
export function useSectionVisibilityFunnel(
  onView: (sectionId: string) => void,
) {
  const callbackRef = useRef(onView)
  callbackRef.current = onView

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-track-section]")
    const seen = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.trackSection
          if (entry.isIntersecting && id && !seen.has(id)) {
            seen.add(id)
            callbackRef.current(id)
          }
        })
      },
      { threshold: 0.3 },
    )
    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}
