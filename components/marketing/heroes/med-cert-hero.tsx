"use client"

import {
  ArrowRight,
  CheckCircle2,
  PhoneOff,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { MedCertHeroMockup } from "@/components/marketing/mockups/med-cert-hero-mockup"
import { TrustBadgeRow } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { PRICING } from "@/lib/constants"
import { BADGE_REGISTRY } from "@/lib/marketing/trust-badges"
import { getPatientCount, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"

export function MedCertHeroSection({
  ctaRef,
  onCTAClick,
  patientCount,
}: {
  ctaRef?: React.RefObject<HTMLDivElement>
  onCTAClick?: () => void
  patientCount?: number
}) {
  const trustChips = [
    BADGE_REGISTRY.legally_valid.label,
    BADGE_REGISTRY.no_appointment.label,
    patientCount && patientCount > 0
      ? `Trusted by ${patientCount.toLocaleString()}+ Australians`
      : `Trusted by ${getPatientCount().toLocaleString()}+ Australians`,
    BADGE_REGISTRY.refund.label,
  ]

  return (
    <section data-track-section="hero" aria-label="Medical certificate service overview" className="relative overflow-hidden pt-6 pb-6 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
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
              Sick today? Certificate in{" "}
              <br className="hidden sm:block" />
              <span className="text-premium-gradient">
                your inbox in under 30 minutes.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-3 sm:mb-4 leading-relaxed text-balance hero-subheadline-enter">
              Valid for work, uni, or carer&apos;s leave. An AHPRA-registered GP
              reviews your request and sends the certificate to your inbox, typically
              within 30 minutes.
            </p>

            {/* Static proof chips */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-1.5 mb-6 hero-trust-enter">
              {trustChips.map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-4 sm:mb-6 hero-cta-enter"
            >
              <MagneticButton>
                <Button
                  asChild
                  size="lg"
                  className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                  onClick={onCTAClick}
                >
                  <Link href="/request?service=med-cert">
                    Get your certificate - ${PRICING.MED_CERT.toFixed(2)}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </MagneticButton>
              <p className="text-xs text-muted-foreground">
                {SOCIAL_PROOF_DISPLAY.gpComparison} clinic
              </p>
            </div>

            {/* 3 key trust badges — LegitScript + Google Pharmacy + No call */}
            <TrustBadgeRow
              badges={[
                { id: "legitscript", variant: "styled" },
                { id: "google_pharmacy", variant: "styled" },
                { id: "ahpra", variant: "styled" },
              ]}
              className="mt-4 justify-center lg:justify-start gap-3"
            />
          </div>

          {/* Hero product mockup - desktop only, mobile gets compact version below */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <MedCertHeroMockup />
          </div>

          {/* Mobile mockup - compact, below text content */}
          <div className="lg:hidden mt-4 w-full max-w-xs mx-auto">
            <MedCertHeroMockup compact />
          </div>
        </div>

        {/* Lifestyle photo */}
        <div className="mt-8 sm:mt-10 w-full relative aspect-[16/9] rounded-2xl overflow-hidden shadow-lg">
          <Image
            src="/images/medcert-2.webp"
            alt="Medical certificate document on desk alongside laptop showing InstantMed"
            fill
            className="object-cover object-center"
            priority
            quality={85}
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1200px"
          />
        </div>
      </div>
    </section>
  )
}
