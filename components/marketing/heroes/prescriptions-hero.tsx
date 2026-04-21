"use client"

import {
  ArrowRight,
  CheckCircle2,
  FileText,
  PhoneOff,
  RefreshCw,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { EScriptHeroMockup } from "@/components/marketing/mockups/escript-hero-mockup"
import { TrustBadgeRow } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"

const TRUST_CHIPS = [
  "Sent to your phone",
  "Any pharmacy in Australia",
  "Full refund if we can\u2019t help",
]

export function PrescriptionsHeroSection({
  ctaRef,
  onCTAClick,
  isDisabled,
}: {
  ctaRef?: React.RefObject<HTMLDivElement>
  onCTAClick?: () => void
  isDisabled?: boolean
}) {
  return (
    <section aria-label="Prescription service overview" className="relative overflow-hidden pt-6 pb-6 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14">
          {/* Text content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* No call required pill */}
            <div className="flex justify-center lg:justify-start mb-4 sm:mb-8 hero-availability-enter">
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-green-50 border border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300">
                <PhoneOff className="w-3.5 h-3.5" aria-hidden="true" />
                No call required
              </div>
            </div>

            {/* Headline */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-3 sm:mb-6 leading-[1.15] animate-hero-headline"
            >
              Your prescription,{" "}
              <br className="hidden sm:block" />
              <span className="text-premium-gradient">
                without the waiting room.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-3 sm:mb-4 leading-relaxed text-balance hero-subheadline-enter">
              An AHPRA-registered GP reviews your request and sends an
              eScript straight to your phone. Any pharmacy in Australia,
              same day.
            </p>

            {/* Price anchor */}
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center justify-center lg:justify-start gap-1.5 hero-cta-enter">
              {PRICING_DISPLAY.FROM_SCRIPT}
              <span className="text-xs font-normal text-muted-foreground">- no hidden fees</span>
            </p>

            {/* Trust chips */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-1.5 mb-6 hero-trust-enter">
              {TRUST_CHIPS.map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-4 hero-cta-enter"
            >
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                onClick={onCTAClick}
                disabled={isDisabled}
              >
                <Link href={isDisabled ? "/contact" : "/request?service=prescription"}>
                  {isDisabled
                    ? "Contact us"
                    : `Renew medication \u00b7 $${PRICING.REPEAT_SCRIPT.toFixed(2)}`}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-6 text-base"
                disabled={isDisabled}
              >
                <Link href={isDisabled ? "/contact" : "/request?service=consult"}>
                  New prescription
                </Link>
              </Button>
            </div>

            {/* Sub-CTA price labels */}
            <div className="flex flex-col sm:flex-row items-center gap-x-6 gap-y-1 justify-center lg:justify-start mb-5 text-xs text-muted-foreground hero-trust-enter">
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 shrink-0 text-primary" />
                Renewing an existing script - from ${PRICING.REPEAT_SCRIPT.toFixed(2)}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                Need something new - ${PRICING.NEW_SCRIPT.toFixed(2)}
              </span>
            </div>

            {/* Trust badges */}
            <TrustBadgeRow
              badges={[
                { id: "legitscript", variant: "styled" },
                { id: "google_pharmacy", variant: "styled" },
                { id: "ahpra", variant: "styled" },
              ]}
              className="mt-2 justify-center lg:justify-start gap-3"
            />
          </div>

          {/* Hero product mockup - desktop only */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <EScriptHeroMockup />
          </div>

          {/* Mobile mockup - compact, below text content */}
          <div className="lg:hidden mt-6 w-full max-w-sm mx-auto">
            <EScriptHeroMockup compact />
          </div>
        </div>

        {/* Lifestyle photo — below the fold on mobile. No `priority`:
            preloading this image competes with the h1 + subhead + CTAs for
            LCP bandwidth on constrained 4G profiles. */}
        <div className="mt-8 sm:mt-10 w-full relative aspect-[16/9] rounded-2xl overflow-hidden shadow-lg">
          <Image
            src="/images/rx-1.webp"
            alt="Picking up a prescription at a pharmacy counter"
            fill
            className="object-cover object-center"
            loading="lazy"
            quality={85}
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1200px"
          />
        </div>
      </div>
    </section>
  )
}
