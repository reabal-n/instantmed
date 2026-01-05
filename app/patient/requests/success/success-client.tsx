"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { Confetti } from "@/components/ui/confetti"
import { SuccessCheckmark } from "@/components/ui/success-checkmark"
import { cn } from "@/lib/utils"
import posthog from "posthog-js"

interface SuccessPageClientProps {
  requestId?: string
  children: ReactNode
}

export function SuccessPageClient({ requestId, children }: SuccessPageClientProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const hasTracked = useRef(false)

  useEffect(() => {
    // Small delay before triggering animations
    const t1 = setTimeout(() => setShowConfetti(true), 100)
    const t2 = setTimeout(() => setShowContent(true), 600)

    // PostHog: Track payment success viewed (only once)
    if (!hasTracked.current) {
      hasTracked.current = true
      posthog.capture("payment_success_viewed", {
        request_id: requestId,
      })
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [requestId])

  return (
    <>
      <Confetti trigger={showConfetti} duration={2500} particleCount={80} />

      <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-8 text-center shadow-lg">
        {/* Animated checkmark */}
        <div className="flex justify-center mb-6">
          <SuccessCheckmark show={showConfetti} size="lg" />
        </div>

        {/* Title with fade in */}
        <h1
          className={cn(
            "text-2xl font-bold text-foreground mb-2 transition-all duration-500",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          )}
        >
          Request submitted
        </h1>
        <p
          className={cn(
            "text-muted-foreground mb-6 transition-all duration-500 delay-100",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          )}
        >
          Thanks — a registered doctor is now reviewing your information.
        </p>

        {/* Content with fade in */}
        <div
          className={cn(
            "transition-all duration-500 delay-200",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          )}
        >
          {children}
        </div>
      </div>
    </>
  )
}
