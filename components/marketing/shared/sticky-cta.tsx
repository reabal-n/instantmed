"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"

interface StickyCTAProps {
  /** Whether the sticky CTA is visible */
  show: boolean
  /** CTA button text */
  ctaText: string
  /** CTA link href */
  ctaHref: string
  /** Small summary text above the mobile CTA button */
  mobileSummary: string
  /** Legacy desktop config retained for existing landing-page configs. Desktop sticky CTA is intentionally disabled. */
  desktopLabel?: string
  /** Price display text (e.g. "From $29.95") */
  priceLabel?: string
  /** Desktop CTA text (shorter version for top bar) */
  desktopCtaText?: string
  /** Whether the service is disabled */
  isDisabled?: boolean
  /** Click handler for analytics */
  onCTAClick?: () => void
  /** Extra mobile content (e.g. payment icons) */
  mobileFooter?: React.ReactNode
  /** Optional "See pricing" scroll button */
  pricingScrollTarget?: string
  /** Optional response time text (e.g. "Avg response: ~44 min") */
  responseTime?: string
}

export function StickyCTA({
  show,
  ctaText,
  ctaHref,
  mobileSummary,
  isDisabled,
  onCTAClick,
  mobileFooter,
  responseTime,
}: StickyCTAProps) {
  const prefersReducedMotion = useReducedMotion()

  const resolvedHref = isDisabled ? "/contact" : ctaHref
  const resolvedCtaText = isDisabled ? "Contact us" : ctaText

  return (
    <>
      {/* Sticky mobile CTA - bottom drawer, appears after hero scrolls out.
          We use the `inert` attribute (not `aria-hidden`) when hidden because
          the region contains a focusable <Link>. `aria-hidden="true"` on a
          subtree with focusable descendants is an axe failure
          (aria-hidden-focus). `inert` removes the subtree from BOTH the
          accessibility tree AND the focus order, which is what we want here. */}
      <motion.div
        role="region"
        aria-label="Quick purchase"
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        initial={prefersReducedMotion ? {} : { y: 100 }}
        animate={prefersReducedMotion
          ? { opacity: show ? 1 : 0 }
          : { y: show ? 0 : 100 }
        }
        transition={{ duration: 0.3, ease: "easeOut" }}
        inert={!show ? true : undefined}
      >
        <div className="bg-white dark:bg-card border-t border-border/50 px-4 pt-2.5 pb-3 safe-area-pb">
          <p className="text-xs text-muted-foreground text-center mb-2">
            {mobileSummary}
            {responseTime && (
              <span className="text-muted-foreground"> &middot; {responseTime}</span>
            )}
          </p>
          <Button
            asChild
            size="lg"
            className="w-full h-12 text-base font-semibold shadow-md shadow-primary/20"
            disabled={isDisabled}
            onClick={onCTAClick}
          >
            <Link href={resolvedHref}>
              {resolvedCtaText}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          {mobileFooter}
        </div>
      </motion.div>
    </>
  )
}
