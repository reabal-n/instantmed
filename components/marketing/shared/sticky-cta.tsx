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
  /** Whether the service is disabled */
  isDisabled?: boolean
  /** Click handler for analytics */
  onCTAClick?: () => void
  /** Extra mobile content (e.g. payment icons) */
  mobileFooter?: React.ReactNode
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
        {/*
          Compact layout — Tier 1 review 2026-05-25 flagged the ED sticky
          bar as "eating 20% of the viewport". Tighter padding (pt-1.5 pb-2),
          summary line truncated, response time bumped to text-[13px] on
          solid surface so the number actually reads. We trade the chip
          height for reading room above the fold.
        */}
        <div className="bg-white dark:bg-card border-t border-border/50 px-4 pt-1.5 pb-2 safe-area-pb">
          <p className="text-[11px] leading-tight text-muted-foreground text-center mb-1.5 truncate">
            {mobileSummary}
            {responseTime && (
              <span className="text-foreground/80 font-medium"> &middot; {responseTime}</span>
            )}
          </p>
          <Button
            asChild
            size="lg"
            className="w-full h-11 text-base font-semibold shadow-md shadow-primary/20"
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
