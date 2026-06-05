"use client"

import { useEffect, useState } from "react"

import { StripePaymentLogos } from "@/components/checkout/payment-logos"
import { StickyCTA } from "@/components/marketing/shared/sticky-cta"
import { UnavailableBanner } from "@/components/marketing/shared/unavailable-banner"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { useLandingAnalytics } from "@/lib/hooks/use-landing-analytics"
import { useSectionVisibilityFunnel } from "@/lib/hooks/use-section-visibility-funnel"
import { buildMedCertRequestHref } from "@/lib/marketing/med-cert-selector"
import { SOCIAL_PROOF } from "@/lib/social-proof"

const MED_CERT_START_HREF = buildMedCertRequestHref({ duration: "1" })
const CTA_LOCATIONS = new Set([
  "hero",
  "how_it_works",
  "final_cta",
  "employer_link",
  "verify_link",
])

interface MedCertClientControlsProps {
  stickyTargetId: string
}

export function MedCertClientControls({ stickyTargetId }: MedCertClientControlsProps) {
  const isDisabled = useServiceAvailability().isServiceDisabled("med-cert")
  const analytics = useLandingAnalytics("med-cert")
  const [showStickyCTA, setShowStickyCTA] = useState(false)

  useSectionVisibilityFunnel(analytics.trackSectionView)

  useEffect(() => {
    const el = document.getElementById(stickyTargetId)
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCTA(!entry.isIntersecting),
      { threshold: 0 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [stickyTargetId])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const cta = target.closest<HTMLElement>("[data-med-cert-cta]")
      const location = cta?.dataset.medCertCta
      if (!location || !CTA_LOCATIONS.has(location)) return

      analytics.trackCTAClick(
        location as Parameters<typeof analytics.trackCTAClick>[0],
      )
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [analytics])

  return (
    <>
      <UnavailableBanner show={isDisabled} />
      <StickyCTA
        show={showStickyCTA}
        // Drop the price from the sticky CTA. The med-cert day selector
        // already shows per-day pricing inline ($19.95 / $29.95 / $39.95)
        // and the sticky has no read access to the user's current selection.
        // Hardcoding $19.95 here lied to anyone who picked 2 or 3 days
        // (Tier 1 review 2026-05-25 #1). Generic CTA + price in the page
        // body is clearer than a sticky number that drifts.
        ctaText="Get your certificate"
        ctaHref={MED_CERT_START_HREF}
        mobileSummary="Doctor-issued certificate · Employer policies vary"
        isDisabled={isDisabled}
        onCTAClick={() => analytics.trackCTAClick("sticky_mobile")}
        mobileFooter={<StripePaymentLogos className="mt-1.5 opacity-60" />}
        // The CertComparisonViz above already uses certTurnaroundMinutes
        // (20) as the headline number. The sticky used to read
        // the generic response-time copy, which conflicted with the 20 min number
        // higher up the page (Tier 1 review 2026-05-26 /medical-certificate
        // #6). Now both label the same journey: certificate ready in
        // about 20 min, doctor-review-driven.
        responseTime={`Certificate ready: ~${SOCIAL_PROOF.certTurnaroundMinutes} min (doctor review)`}
      />
    </>
  )
}
