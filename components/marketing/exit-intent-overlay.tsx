"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { CheckCircle2, X, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  onEmailCapture?: (email: string) => void
}

export function ExitIntentOverlay({
  ctaHref = "/request?service=med-cert",
  price = PRICING.MED_CERT,
  onShow,
  onCTAClick,
  onDismiss,
  onEmailCapture,
}: ExitIntentOverlayProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isArmed, setIsArmed] = useState(false)
  const [email, setEmail] = useState("")
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const [emailError, setEmailError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
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
                {emailSubmitted ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground tracking-tight">
                      We&apos;ll send you a reminder
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Check your inbox — we&apos;ll follow up with everything you need to get started.
                    </p>
                    <Button
                      asChild
                      size="lg"
                      className="w-full h-12 text-base font-semibold shadow-md shadow-primary/20"
                      onClick={() => {
                        onCTAClick?.()
                        dismiss()
                      }}
                    >
                      <Link href={ctaHref}>Or get your certificate now</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold text-foreground tracking-tight">
                      Still thinking it over?
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      No worries. Drop your email and we&apos;ll send a reminder with everything you need.
                    </p>

                    {/* Email capture */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        const trimmed = email.trim()
                        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                          setEmailError("Enter a valid email address")
                          inputRef.current?.focus()
                          return
                        }
                        setEmailError("")
                        setEmailSubmitted(true)
                        onEmailCapture?.(trimmed)
                      }}
                      className="space-y-2"
                    >
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        <Input
                          ref={inputRef}
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                            if (emailError) setEmailError("")
                          }}
                          className="pl-9 h-11"
                          aria-label="Email address"
                          aria-invalid={!!emailError}
                        />
                      </div>
                      {emailError && (
                        <p className="text-xs text-destructive text-left">{emailError}</p>
                      )}
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-12 text-base font-semibold shadow-md shadow-primary/20"
                      >
                        Remind me later
                      </Button>
                    </form>

                    {/* Reassurance bullets */}
                    <ul className="space-y-2 text-left">
                      {REASSURANCE_POINTS.map((point) => (
                        <li
                          key={point}
                          className="flex items-center gap-2.5 text-xs text-muted-foreground"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>

                    {/* Price anchor */}
                    <p className="text-xs text-muted-foreground/70">
                      From ${price.toFixed(2)} &middot; Typically {SOCIAL_PROOF.gpPriceStandard} at a GP
                    </p>

                    {/* Dismiss link */}
                    <button
                      onClick={dismiss}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      No thanks
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
