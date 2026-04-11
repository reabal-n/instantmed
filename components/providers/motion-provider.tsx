"use client"

import type { ReactNode } from "react"

// LazyMotion with async feature loading was previously here, but caused
// whileInView animations to permanently stick at opacity:0 in dev (React StrictMode).
// Root cause: LazyMotion's async setIsLoaded re-render compounds Framer Motion's
// InViewFeature bug where mount() discards the cleanup function - so when StrictMode's
// fake unmount fires isInView=true, the remount's IO callback hits the early-return
// and never triggers setActive. Since all components use `motion` (not `m`), LazyMotion
// provided no bundle savings anyway.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
