"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { GuaranteeBadge } from "@/components/marketing/guarantee-badge"
import { EDHeroMockup } from "@/components/marketing/mockups/ed-hero-mockup"
import { TrustBadgeRow } from "@/components/shared/trust-badge"
import { Button } from "@/components/ui/button"
import { PRICING_DISPLAY } from "@/lib/constants"

export function EDHeroSection({
  ctaRef,
  onCTAClick,
}: {
  ctaRef?: React.RefObject<HTMLDivElement>
  onCTAClick?: () => void
}) {
  return (
    <section aria-label="ED treatment service overview" className="relative overflow-hidden pt-6 pb-6 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14">
          {/* Text content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-4 sm:mb-6 leading-[1.15] animate-hero-headline">
              ED medication{" "}
              <br className="hidden sm:block" />
              <span className="text-premium-gradient">
                without the GP visit.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-4 sm:mb-6 leading-relaxed text-balance hero-subheadline-enter">
              Fill a short health form. A doctor reviews it privately and sends
              your prescription by SMS. No call, no waiting room.
            </p>

            {/* Price */}
            <p className="text-sm font-semibold text-foreground mb-4 flex items-center justify-center lg:justify-start gap-1.5 hero-cta-enter">
              {PRICING_DISPLAY.MENS_HEALTH}
              <span className="text-xs font-normal text-muted-foreground">· no hidden fees</span>
            </p>

            {/* CTA */}
            <div
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-5 hero-cta-enter"
            >
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                onClick={onCTAClick}
              >
                <Link href="/request?service=consult&subtype=ed">
                  Start assessment · {PRICING_DISPLAY.MENS_HEALTH}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {/* Guarantee pill */}
            <div className="flex justify-center lg:justify-start mb-3 hero-trust-enter">
              <GuaranteeBadge size="md" />
            </div>

            {/* Trust Ribbon: AHPRA + LegitScript + Privacy + SSL */}
            <TrustBadgeRow
              preset="trust_ribbon"
              className="justify-center lg:justify-start hero-trust-enter"
            />
          </div>

          {/* Hero mockup - desktop */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <EDHeroMockup />
          </div>

          {/* Hero mockup - mobile */}
          <div className="lg:hidden mt-6 w-full max-w-xs mx-auto">
            <EDHeroMockup compact />
          </div>
        </div>
      </div>
    </section>
  )
}
