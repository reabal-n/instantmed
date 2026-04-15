"use client"

import { useEffect, useState } from "react"

/**
 * Defers rendering of non-critical children until the browser is idle.
 * Reduces main-thread hydration pressure (TBT / INP improvement).
 *
 * Uses requestIdleCallback when available (Chrome/Edge), falls back to
 * setTimeout for Safari. The timeout param acts as a max-wait deadline.
 */
export function DeferredMount({
  children,
  timeout = 2000,
}: {
  children: React.ReactNode
  /** Max ms to wait before mounting regardless of idle state (default 2000) */
  timeout?: number
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(() => setMounted(true), { timeout })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(() => setMounted(true), Math.min(timeout, 300))
    return () => clearTimeout(id)
  }, [timeout])

  if (!mounted) return null
  return <>{children}</>
}
