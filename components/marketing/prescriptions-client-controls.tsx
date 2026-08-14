"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { StickyCTA } from "@/components/marketing/shared/sticky-cta"
import { UnavailableBanner } from "@/components/marketing/shared/unavailable-banner"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { Button } from "@/components/ui/button"
import { PRICING_DISPLAY } from "@/lib/constants"
import { useLandingAnalytics } from "@/lib/hooks/use-landing-analytics"

const CTA_LOCATIONS = new Set(["hero", "final_cta"])

export function PrescriptionHeroCTA() {
  const isDisabled = useServiceAvailability().isServiceDisabled("scripts")

  return (
    <Button
      asChild
      size="lg"
      className="h-auto min-h-12 whitespace-normal px-4 py-3 text-center text-base font-semibold shadow-md shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 sm:px-8"
    >
      <Link
        href={isDisabled ? "/contact" : "/request?service=repeat-script"}
        data-prescription-cta="hero"
      >
        {isDisabled
          ? "Contact us"
          : `Renew medication - ${PRICING_DISPLAY.REPEAT_SCRIPT}`}
        <ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" />
      </Link>
    </Button>
  )
}

interface PrescriptionsClientControlsProps {
  stickyTargetId: string
}

export function PrescriptionsClientControls({
  stickyTargetId,
}: PrescriptionsClientControlsProps) {
  const isDisabled = useServiceAvailability().isServiceDisabled("scripts")
  const analytics = useLandingAnalytics("prescription")
  const [showStickyCTA, setShowStickyCTA] = useState(false)

  useEffect(() => {
    const target = document.getElementById(stickyTargetId)
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCTA(!entry.isIntersecting),
      { threshold: 0 },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [stickyTargetId])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const cta = target.closest<HTMLElement>("[data-prescription-cta]")
      const location = cta?.dataset.prescriptionCta
      if (location && CTA_LOCATIONS.has(location)) {
        analytics.trackCTAClick(location as "hero" | "final_cta")
        return
      }

      const faqButton = target.closest<HTMLButtonElement>(
        "[data-prescription-faq] button[aria-expanded]",
      )
      if (!faqButton || faqButton.getAttribute("aria-expanded") === "true") return

      const faqButtons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          "[data-prescription-faq] button[aria-expanded]",
        ),
      )
      const index = faqButtons.indexOf(faqButton)
      if (index >= 0) {
        analytics.trackFAQOpen(faqButton.textContent?.trim() ?? "", index)
      }
    }

    // Capture before Radix updates aria-expanded so an opening click is still
    // distinguishable from a closing click at the delegated boundary.
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [analytics, isDisabled])

  return (
    <>
      <UnavailableBanner show={isDisabled} />
      <StickyCTA
        show={showStickyCTA}
        ctaText={isDisabled ? "Contact us" : `Renew your medication - ${PRICING_DISPLAY.REPEAT_SCRIPT}`}
        ctaHref={isDisabled ? "/contact" : "/request?service=repeat-script"}
        mobileSummary="Repeat medication request"
        isDisabled={isDisabled}
        onCTAClick={() => analytics.trackCTAClick("sticky_mobile")}
        responseTime="Doctor-reviewed after submission"
      />
    </>
  )
}
