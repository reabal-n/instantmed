"use client"

import type { ReactNode } from "react"

/**
 * Reconcile streamed RSC children on a function fiber, not a host element.
 * The pinned Next renderer can otherwise claim the host twice when a lazy
 * child resolves during hydration replay (React upstream issue #35210).
 * This adds no DOM, fallback, effect, or client-only rendering.
 */
export function StreamedContent({ children }: { children: ReactNode }) {
  return children
}
