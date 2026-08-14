"use client"

import { useInView } from "framer-motion"
import type React from "react"

/** Scroll reveal defaults for IntersectionObserver-based animations. */
export const scrollRevealConfig = {
  threshold: 0,
  once: true,
  margin: "-100px",
} as const

/**
 * Framer-backed reveal behavior is isolated here so the lightweight reduced-
 * motion preference hook does not pull Framer into every client boundary.
 */
export function useScrollReveal(ref: React.RefObject<Element>) {
  return useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
    margin: scrollRevealConfig.margin,
  })
}
