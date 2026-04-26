"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/ui/reveal"
import { PRICING } from "@/lib/constants"

// =============================================================================
// COMPONENT
// =============================================================================

interface FinalCtaSectionProps {
  onCTAClick?: () => void
  title?: string
  subtitle?: string
  ctaText?: string
  ctaHref?: string
  price?: number
  /** Optional testimonial mini-quote below the CTA */
  testimonial?: { quote: string; name: string }
}

/** Section 7: Final CTA */
export function FinalCtaSection({
  onCTAClick,
  title = "Let a doctor handle the paperwork.",
  subtitle = "Two minutes on your phone. A real doctor reviews it. Certificate in your inbox.",
  ctaText = "Get your certificate",
  ctaHref = "/request?service=med-cert",
  price = PRICING.MED_CERT,
  testimonial,
}: FinalCtaSectionProps) {
  return (
    <section aria-label="Get started" className="py-20 lg:py-24 bg-linear-to-br from-primary/5 via-primary/10 to-sky-100/50 dark:from-primary/10 dark:via-primary/5 dark:to-card">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4 tracking-tight">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
          <Button
            asChild
            size="lg"
            className="px-10 h-14 text-lg font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-[transform,box-shadow]"
            onClick={onCTAClick}
          >
            <Link href={ctaHref}>
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-4 text-foreground/70 text-sm font-medium">
            From ${price.toFixed(2)} &middot; No account required
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Takes about 2 minutes &middot; Full refund if we can&apos;t help
          </p>

          {testimonial && (
            <div className="mt-8 pt-6 border-t border-border/20 max-w-md mx-auto">
              <p className="text-sm text-foreground/70 italic leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <p className="mt-2 text-xs text-muted-foreground font-medium">
                {testimonial.name}
              </p>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}
