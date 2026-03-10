"use client"

import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { type ReactNode } from "react"

interface PageTransitionProviderProps {
  children: ReactNode
}

/**
 * Subtle page-level fade transition.
 * Wraps children with a framer-motion fade + slight upward slide
 * keyed on the current pathname so route changes animate smoothly.
 */
export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
