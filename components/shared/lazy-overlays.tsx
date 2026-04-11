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

export function LazyOverlays() {
  return (
    <>
      <StickyCTABar />
    </>
  )
}
