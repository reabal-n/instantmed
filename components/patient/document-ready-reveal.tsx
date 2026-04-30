"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

import { LottieAnimation } from "@/components/ui/lottie-animation"

const FRESHNESS_WINDOW_MS = 1000 * 90
const STORAGE_KEY = "intake_reveal_shown"
const FIRST_DOC_KEY = "intake_first_doc_celebrated"

interface DocumentReadyRevealProps {
  intakeId: string
  approvedAt: string | null | undefined
  children: React.ReactNode
}

/**
 * Wraps the approved-document card with a brief reveal animation the first time
 * a patient lands on the page within 90s of approval.
 *
 * Phase 3 additions:
 *   - Spring entrance with one ring pulse (per DESIGN.md §12 success
 *     spring spec).
 *   - Confetti Lottie overlay on the patient's first-ever document only,
 *     gated by localStorage so subsequent docs don't get the celebratory
 *     moment.
 *   - Shimmer sweep retained.
 *
 * Subsequent visits render the card instantly. Respects reduced-motion.
 */
export function DocumentReadyReveal({ intakeId, approvedAt, children }: DocumentReadyRevealProps) {
  const prefersReduced = useReducedMotion()
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [showShimmer, setShowShimmer] = useState(false)
  const [showRingPulse, setShowRingPulse] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const timersRef = useRef<number[]>([])

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

    // First-ever document gets confetti. Persisted in localStorage (not
    // sessionStorage) so the celebratory moment fires only once per patient.
    let isFirstDoc = false
    try {
      isFirstDoc = !window.localStorage.getItem(FIRST_DOC_KEY)
      if (isFirstDoc) {
        window.localStorage.setItem(FIRST_DOC_KEY, new Date().toISOString())
      }
    } catch {
      // localStorage unavailable — skip the first-doc moment
    }

    // Choreography:
    //   t=0       reveal entrance starts
    //   t=120ms   ring pulse fires
    //   t=250ms   shimmer sweep starts
    //   t=400ms   confetti overlay (first-doc only)
    //   t=1400ms  shimmer ends
    //   t=2200ms  confetti hides
    const ringTimer = window.setTimeout(() => setShowRingPulse(true), 120)
    const shimmerInTimer = window.setTimeout(() => setShowShimmer(true), 250)
    const shimmerOutTimer = window.setTimeout(() => setShowShimmer(false), 1400)
    timersRef.current.push(ringTimer, shimmerInTimer, shimmerOutTimer)

    if (isFirstDoc) {
      const confettiInTimer = window.setTimeout(() => setShowConfetti(true), 400)
      const confettiOutTimer = window.setTimeout(() => setShowConfetti(false), 2200)
      timersRef.current.push(confettiInTimer, confettiOutTimer)
    }

    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t))
      timersRef.current = []
    }
  }, [intakeId, approvedAt, prefersReduced])

  if (!shouldAnimate) return <>{children}</>

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1], // easing.panel — confident arrival
      }}
    >
      {children}

      {/* One ring pulse on entrance. §12 success-spring spec. */}
      <AnimatePresence>
        {showRingPulse && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-success"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.04 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onAnimationComplete={() => setShowRingPulse(false)}
          />
        )}
      </AnimatePresence>

      {/* Shimmer sweep across the card. */}
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
              // portal-shim:allow — sanctioned shimmer sweep per DESIGN.md §12
              className="absolute inset-y-0 -left-1/3 w-1/3 bg-linear-to-r from-transparent via-white/50 to-transparent dark:via-white/15"
              initial={{ x: 0 }}
              animate={{ x: "400%" }}
              transition={{ duration: 1.1, ease: "easeInOut" }}
              style={{ mixBlendMode: "overlay" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confetti — first-ever document only. */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <LottieAnimation name="confetti" size={220} loop={false} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
