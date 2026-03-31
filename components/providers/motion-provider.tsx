"use client"

import { LazyMotion } from "framer-motion"
import type { ReactNode } from "react"

// domAnimation covers: animate, exit, variants, whileHover, whileTap, whileInView, layout
// It does NOT include: drag, 3D transforms, SVG path animations
// This saves ~60% of the framer-motion bundle
const loadFeatures = () =>
  import("framer-motion").then((mod) => mod.domAnimation)

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict={false}>
      {children}
    </LazyMotion>
  )
}
