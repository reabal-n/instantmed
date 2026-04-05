"use client"

import dynamic from "next/dynamic"

/**
 * Lazy-loaded overlay components for the root layout.
 * These are heavy client components that don't need to be in the initial bundle.
 * Wrapping in a "use client" boundary allows ssr:false dynamic imports.
 */

const StickyCTABar = dynamic(
  () => import("@/components/shared/sticky-cta-bar").then((mod) => ({ default: mod.StickyCTABar })),
  { ssr: false }
)

const ExitIntentOverlay = dynamic(
  () => import("@/components/marketing/exit-intent-overlay").then((mod) => ({ default: mod.ExitIntentOverlay })),
  { ssr: false }
)

export function LazyOverlays() {
  return (
    <>
      <StickyCTABar />
      {/* Desktop-only, armed after 10s, once per session via sessionStorage */}
      <ExitIntentOverlay />
    </>
  )
}
