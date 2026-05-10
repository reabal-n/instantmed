import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"

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
          You only pay the standard PBS co-payment for eligible medications. Same subsidy you would get with any eligible GP-issued eScript. The pharmacy still dispenses and prices the medicine.
        </>
      }
    />
  )
}
