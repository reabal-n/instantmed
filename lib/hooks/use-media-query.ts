"use client"

import { useEffect, useState } from "react"

/**
 * Subscribe to a CSS media query and re-render when it changes.
 *
 * Returns `true` while the query matches the current viewport, `false`
 * otherwise. Defaults to `defaultValue` on the server (no `window`) so
 * SSR renders don't crash and hydration mismatches stay tame.
 *
 * Use sparingly. CSS media queries should drive layout where possible.
 * This hook is for behaviour switches (e.g. "open slide-over on mobile,
 * inline split-pane on desktop") where CSS alone can't reach.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState<boolean>(defaultValue)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [query])

  return matches
}

/**
 * `true` at the Tailwind `lg` breakpoint and above (≥1024px). Mirrors
 * the staff cockpit's `lg:` layout switch. Defaults to `true` on the
 * server so the SSR render matches the most common operator viewport.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)", true)
}
