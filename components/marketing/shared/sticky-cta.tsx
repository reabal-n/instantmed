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
  /** Desktop left-side label text */
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
  desktopLabel,
  priceLabel,
  desktopCtaText,
  isDisabled,
  onCTAClick,
  mobileFooter,
  pricingScrollTarget,
  responseTime,
}: StickyCTAProps) {
  const prefersReducedMotion = useReducedMotion()

  const resolvedHref = isDisabled ? "/contact" : ctaHref
  const resolvedCtaText = isDisabled ? "Contact us" : ctaText
  const resolvedDesktopCtaText = isDisabled ? "Contact us" : (desktopCtaText ?? ctaText)

  return (
    <>
      {/* Sticky mobile CTA - bottom drawer, appears after hero scrolls out */}
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
        aria-hidden={!show}
      >
        <div className="bg-white/90 dark:bg-card/90 backdrop-blur-lg border-t border-border/50 px-4 pt-2.5 pb-3 safe-area-pb">
          <p className="text-xs text-muted-foreground text-center mb-2">
            {mobileSummary}
            {responseTime && (
              <span className="text-muted-foreground/70"> &middot; {responseTime}</span>
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

      {/* Sticky desktop CTA - top bar, appears after hero scrolls out */}
      <motion.div
        role="region"
        aria-label="Quick purchase"
        className="hidden lg:block fixed top-0 left-0 right-0 z-40"
        initial={prefersReducedMotion ? {} : { y: -60, opacity: 0 }}
        animate={prefersReducedMotion
          ? { opacity: show ? 1 : 0 }
          : { y: show ? 0 : -60, opacity: show ? 1 : 0 }
        }
        transition={{ duration: 0.3, ease: "easeOut" }}
        aria-hidden={!show}
      >
        <div className="bg-white/95 dark:bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
          <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between gap-6">
            {desktopLabel && (
              <p className="text-sm text-muted-foreground hidden xl:block">
                {desktopLabel}
              </p>
            )}
            <div className="flex items-center gap-3 ml-auto">
              {priceLabel && (
                <span className="text-sm text-muted-foreground">
                  {priceLabel}
                </span>
              )}
              {responseTime && (
                <span className="text-xs text-muted-foreground/70">
                  {responseTime}
                </span>
              )}
              {pricingScrollTarget && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => document.getElementById(pricingScrollTarget)?.scrollIntoView({ behavior: "smooth" })}
                >
                  See pricing
                </Button>
              )}
              <Button
                asChild
                size="sm"
                className="h-9 px-5 font-semibold shadow-sm shadow-primary/20"
                disabled={isDisabled}
                onClick={onCTAClick}
              >
                <Link href={resolvedHref}>
                  {resolvedDesktopCtaText}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
