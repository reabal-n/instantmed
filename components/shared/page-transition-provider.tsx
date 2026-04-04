"use client"

import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { type ReactNode } from "react"

interface PageTransitionProviderProps {
  children: ReactNode
}

const DASHBOARD_PREFIXES = ["/patient", "/doctor", "/admin"]

/**
 * Subtle page-level fade transition for marketing pages only.
 * Dashboard routes skip the animation to avoid laggy navigation
 * (the shell/sidebar persists, only content changes).
 */
export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()

  const isDashboard = DASHBOARD_PREFIXES.some(p => pathname?.startsWith(p))

  if (isDashboard || prefersReducedMotion) {
    return <>{children}</>
  }

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
