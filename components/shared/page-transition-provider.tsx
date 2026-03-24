"use client"

import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { type ReactNode } from "react"

interface PageTransitionProviderProps {
  children: ReactNode
}

const DASHBOARD_PREFIXES = ["/patient", "/doctor", "/admin"]
const FAST_TRANSITION_PREFIXES = ["/request", "/auth"]

/**
 * Subtle page-level fade transition for marketing pages only.
 * Dashboard routes skip the animation to avoid laggy navigation
 * (the shell/sidebar persists, only content changes).
 * Request/auth flows use a faster, minimal transition.
 */
export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()

  const isDashboard = DASHBOARD_PREFIXES.some(p => pathname?.startsWith(p))
  const isFastRoute = FAST_TRANSITION_PREFIXES.some(p => pathname?.startsWith(p))

  if (isDashboard || prefersReducedMotion) {
    return <>{children}</>
  }

  // Faster, subtler transition for intake flows — don't slow down form navigation
  const duration = isFastRoute ? 0.15 : 0.25
  const yEnter = isFastRoute ? 0 : 6
  const yExit = isFastRoute ? 0 : -4

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: yEnter }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: yExit }}
        transition={{ duration, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
