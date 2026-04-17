"use client"

import { ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"

import { HairLossHeroMockup } from "@/components/marketing/mockups/hair-loss-hero-mockup"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { PRICING_DISPLAY } from "@/lib/constants"

const TRUST_ITEMS = [
  "AHPRA-registered doctors",
  "LegitScript certified",
  "Full refund if we can't help",
]

export function HairLossHeroSection({
  ctaRef,
  onCTAClick,
}: {
  ctaRef?: React.RefObject<HTMLDivElement>
  onCTAClick?: () => void
}) {
  return (
    <section aria-label="Hair loss treatment service overview" className="relative overflow-hidden pt-6 pb-6 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14">
          {/* Text content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-4 sm:mb-6 leading-[1.15] animate-hero-headline">
              Stop putting off{" "}
              <br className="hidden sm:block" />
              <span className="text-premium-gradient">
                hair loss treatment.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-4 sm:mb-6 leading-relaxed text-balance hero-subheadline-enter">
              Short health form. Doctor reviews it same day. Pick up your
              prescription from any Australian pharmacy. No appointment needed.
            </p>

            {/* Price */}
            <p className="text-sm font-semibold text-foreground mb-4 flex items-center justify-center lg:justify-start gap-1.5 hero-cta-enter">
              {PRICING_DISPLAY.HAIR_LOSS}
              <span className="text-xs font-normal text-muted-foreground">· no hidden fees</span>
            </p>

            {/* CTA */}
            <div
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-5 hero-cta-enter"
            >
              <MagneticButton>
                <Button
                  asChild
                  size="lg"
                  className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                  onClick={onCTAClick}
                >
                  <Link href="/request?service=consult&subtype=hair_loss">
                    Start assessment · {PRICING_DISPLAY.HAIR_LOSS}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </MagneticButton>
            </div>

            {/* Trust - one row only */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-1.5 hero-trust-enter">
              {TRUST_ITEMS.map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Hero mockup - desktop */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <HairLossHeroMockup />
          </div>

          {/* Hero mockup - mobile */}
          <div className="lg:hidden mt-6 w-full max-w-xs mx-auto">
            <HairLossHeroMockup compact />
          </div>
        </div>
      </div>
    </section>
  )
}
