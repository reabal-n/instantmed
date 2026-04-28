import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { SOCIAL_PROOF } from "@/lib/social-proof"

/**
 * PBS subsidy callout — the prescriptions page's superpower claim.
 *
 * Thin wrapper around the shared <ServiceClaimSection> primitive. Anchors
 * pharmacy-cost anxiety right after the pricing comparison.
 */
export function PBSCalloutStrip() {
  return (
    <ServiceClaimSection
      eyebrow="Pharmacy pricing"
      headline={
        <>
          <span className="text-success">PBS subsidies</span> apply at the pharmacy.
        </>
      }
      body={
        <>
          You only pay the standard PBS co-payment for eligible medications. Same subsidy you would get at any GP-issued script. {SOCIAL_PROOF.scriptFulfillmentPercent}% of our scripts are fulfilled same day.
        </>
      }
    />
  )
}
