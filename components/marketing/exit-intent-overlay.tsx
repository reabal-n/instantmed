"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PRICING } from "@/lib/constants"
import { SOCIAL_PROOF } from "@/lib/social-proof"

const SESSION_KEY = "exit_intent_shown"
const ARM_DELAY_MS = 10_000

const REASSURANCE_POINTS = [
  "Full refund if we can\u2019t help",
  "Reviewed by an AHPRA-registered doctor",
  "No account needed to start",
]

interface ExitIntentOverlayProps {
  /** Override the default CTA href */
  ctaHref?: string
  /** Override the default price display */
  price?: number
  /** Analytics callbacks */
  onShow?: () => void
  onCTAClick?: () => void
  onDismiss?: () => void
}

export function ExitIntentOverlay({
  ctaHref = "/request?service=med-cert",
  price = PRICING.MED_CERT,
  onShow,
  onCTAClick,
  onDismiss,
}: ExitIntentOverlayProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isArmed, setIsArmed] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Arm the trigger after a delay
  useEffect(() => {
    // Desktop only — no exit-intent on touch devices
    if (typeof window === "undefined" || "ontouchstart" in window) return

    // Already shown this session
    if (sessionStorage.getItem(SESSION_KEY)) return

    const timer = setTimeout(() => setIsArmed(true), ARM_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      if (!isArmed) return
      if (e.clientY > 0) return // Only trigger when cursor exits toward top
      if (sessionStorage.getItem(SESSION_KEY)) return

      sessionStorage.setItem(SESSION_KEY, "1")
      setIsArmed(false)
      setIsOpen(true)
      onShow?.()
    },
    [isArmed, onShow]
  )

  useEffect(() => {
    if (!isArmed) return

    document.documentElement.addEventListener("mouseleave", handleMouseLeave)
    return () =>
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave)
  }, [isArmed, handleMouseLeave])

  const dismiss = () => {
    setIsOpen(false)
    onDismiss?.()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismiss}
            aria-hidden
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Before you go"
            className="fixed inset-0 z-[61] flex items-center justify-center p-4"
            initial={
              prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }
            }
            animate={{ opacity: 1, scale: 1 }}
            exit={
              prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }
            }
            transition={{ duration: 0.25, ease: "easeOut" }}
            onKeyDown={(e) => {
              if (e.key === "Escape") dismiss()
            }}
          >
            <div
              className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-2xl shadow-primary/[0.08] dark:shadow-none p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 p-1.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Content */}
              <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold text-foreground tracking-tight">
                  Still thinking it over?
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Here&apos;s what to know before you go:
                </p>

                {/* Reassurance bullets */}
                <ul className="space-y-2.5 text-left">
                  {REASSURANCE_POINTS.map((point) => (
                    <li
                      key={point}
                      className="flex items-center gap-2.5 text-sm text-foreground"
                    >
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>

                {/* Price anchor */}
                <p className="text-xs text-muted-foreground">
                  From ${price.toFixed(2)} &middot; Typically {SOCIAL_PROOF.gpPriceStandard} at a GP
                </p>

                {/* CTA */}
                <Button
                  asChild
                  size="lg"
                  className="w-full h-12 text-base font-semibold shadow-md shadow-primary/20"
                  onClick={() => {
                    onCTAClick?.()
                    dismiss()
                  }}
                >
                  <Link href={ctaHref}>Get your certificate</Link>
                </Button>

                {/* Dismiss link */}
                <button
                  onClick={dismiss}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  No thanks, I&apos;ll decide later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
