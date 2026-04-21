"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"

const FRESHNESS_WINDOW_MS = 1000 * 90
const STORAGE_KEY = "intake_reveal_shown"

interface DocumentReadyRevealProps {
  intakeId: string
  approvedAt: string | null | undefined
  children: React.ReactNode
}

/**
 * Wraps the approved-document card with a brief reveal animation the first time
 * a patient lands on the page within 90s of approval. Subsequent visits render
 * the card instantly. Respects reduced-motion.
 */
export function DocumentReadyReveal({ intakeId, approvedAt, children }: DocumentReadyRevealProps) {
  const prefersReduced = useReducedMotion()
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [showShimmer, setShowShimmer] = useState(false)

  useEffect(() => {
    if (prefersReduced || !approvedAt) return
    const age = Date.now() - new Date(approvedAt).getTime()
    if (age < 0 || age > FRESHNESS_WINDOW_MS) return

    try {
      const seen = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as string[]
      if (seen.includes(intakeId)) return
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...seen.slice(-20), intakeId]))
    } catch {
      // sessionStorage unavailable — still animate once
    }

    setShouldAnimate(true)
    const t = window.setTimeout(() => setShowShimmer(true), 250)
    const t2 = window.setTimeout(() => setShowShimmer(false), 1400)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [intakeId, approvedAt, prefersReduced])

  if (!shouldAnimate) return <>{children}</>

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
      <AnimatePresence>
        {showShimmer && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-y-0 -left-1/3 w-1/3 bg-linear-to-r from-transparent via-white/50 to-transparent dark:via-white/15"
              initial={{ x: 0 }}
              animate={{ x: "400%" }}
              transition={{ duration: 1.1, ease: "easeInOut" }}
              style={{ mixBlendMode: "overlay" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
