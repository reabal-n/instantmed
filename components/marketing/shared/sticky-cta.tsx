"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  const resolvedHref = isDisabled ? "/contact" : ctaHref
  const resolvedCtaText = isDisabled ? "Contact us" : ctaText
  const regionRef = useRef<HTMLDivElement>(null)

  // While the bar is shown, publish its rendered height so the shared footer
  // reserves it on phones (globals.css `html[data-sticky-cta] footer[role="contentinfo"]`).
  // The bar stays usable at maximum scroll and the footer's last links sit above
  // it; while the bar is hidden (page top) the page keeps its natural length.
  useEffect(() => {
    const region = regionRef.current
    if (!region || !show) return
    const root = document.documentElement
    const publish = () => {
      root.style.setProperty("--sticky-cta-height", `${Math.ceil(region.getBoundingClientRect().height)}px`)
    }
    root.setAttribute("data-sticky-cta", "")
    publish()
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(publish)
    observer?.observe(region)
    return () => {
      observer?.disconnect()
      root.removeAttribute("data-sticky-cta")
      root.style.removeProperty("--sticky-cta-height")
    }
  }, [show])

  return (
    <>
      {/* Sticky mobile CTA - bottom drawer, appears after hero scrolls out.
          We use the `inert` attribute (not `aria-hidden`) when hidden because
          the region contains a focusable <Link>. `aria-hidden="true"` on a
          subtree with focusable descendants is an axe failure
          (aria-hidden-focus). `inert` removes the subtree from BOTH the
          accessibility tree AND the focus order, which is what we want here. */}
      <div
        ref={regionRef}
        role="region"
        aria-label="Quick purchase"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
          "transition-[transform,visibility] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:!transition-none",
          show
            ? "visible translate-y-0 [transition-duration:180ms,0ms] [transition-delay:0ms,0ms]"
            : "invisible translate-y-full [transition-duration:140ms,0ms] [transition-delay:0ms,140ms]",
        )}
        inert={!show ? true : undefined}
      >
        <div className="bg-white dark:bg-card border-t border-border/50 px-4 pt-1.5 pb-2 safe-area-pb">
          <p className="mb-1.5 min-w-0 break-words text-center text-sm leading-tight text-muted-foreground">
            {mobileSummary}
            {responseTime && (
              <span className="text-foreground/80 font-medium"> &middot; {responseTime}</span>
            )}
          </p>
          <Button
            asChild
            size="lg"
            className="h-auto min-h-12 w-full whitespace-normal py-3 text-center text-base font-semibold shadow-md shadow-primary/20"
            onClick={onCTAClick}
          >
            <Link href={resolvedHref}>
              {resolvedCtaText}
              <ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          </Button>
          {mobileFooter}
        </div>
      </div>
    </>
  )
}
