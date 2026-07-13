"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { useScrollDirection } from "@/lib/hooks/use-scroll-direction"

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
  /** Optional response-time text. */
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
  // Collapse the summary line when the user is actively scrolling DOWN -
  // they're reading, not deciding. Restore it on any upward scroll because
  // upward scroll usually precedes a click. Tier 1 review 2026-05-25
  // (/erectile-dysfunction #3): "sticky mobile footer eats ~20% of the
  // viewport". Reduced-motion users skip the collapse and keep the
  // canonical single-line layout (no surprise height changes).
  const scrollDirection = useScrollDirection({ threshold: 12, topPadding: 200 })
  const isCollapsed = !prefersReducedMotion && scrollDirection === "down"

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
        initial={false}
        animate={{ y: show ? 0 : "100%", opacity: show ? 1 : 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: "easeOut" }}
        inert={!show ? true : undefined}
      >
        {/*
          Compact layout - Tier 1 review 2026-05-25 flagged the ED sticky
          bar as "eating 20% of the viewport". Tighter padding (pt-1.5 pb-2),
          summary line truncated, response time bumped to text-[13px] on
          solid surface so the number actually reads.

          Plus a scroll-direction collapse: while scrolling down the
          summary line clips out (max-h transitions to 0) so the bar is
          just the button. Scroll up restores it. Tier 1 review
          2026-05-25 (/erectile-dysfunction #3).
        */}
        <div className="bg-white dark:bg-card border-t border-border/50 px-4 pt-1.5 pb-2 safe-area-pb">
          <div
            className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-200 ease-out ${
              isCollapsed
                ? "grid-rows-[0fr] opacity-0 mb-0"
                : "grid-rows-[1fr] opacity-100 mb-1.5"
            }`}
            aria-hidden={isCollapsed}
          >
            <p className="min-h-0 text-[11px] leading-tight text-muted-foreground text-center truncate">
              {mobileSummary}
              {responseTime && (
                <span className="text-foreground/80 font-medium"> &middot; {responseTime}</span>
              )}
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="h-auto min-h-12 w-full whitespace-normal py-3 text-center text-base font-semibold shadow-md shadow-primary/20"
            disabled={isDisabled}
            onClick={onCTAClick}
          >
            <Link href={resolvedHref}>
              {resolvedCtaText}
              <ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          </Button>
          {mobileFooter}
        </div>
      </motion.div>
    </>
  )
}
