import { CheckCircle2 } from "lucide-react"

import { Heading } from "@/components/ui/heading"
import { SOCIAL_PROOF } from "@/lib/social-proof"

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * PBS subsidy callout — the prescriptions page's superpower.
 *
 * Pass 3 elevation:
 *   - /colorize: Morning Canvas warmth tint (peach/champagne radial) so the
 *     section reads as a warm trust moment, not a thin success-tinted strip.
 *   - /bolder: PBS pricing claim is promoted to display-tier typography
 *     and given its own card with breathing room. Mirrors the
 *     EmployerCalloutStrip treatment on /medical-certificate.
 *
 * Anchors pharmacy-cost anxiety right after the pricing comparison.
 */
export function PBSCalloutStrip() {
  return (
    <section
      aria-label="PBS subsidy information"
      className="relative py-10 sm:py-14 lg:py-16 overflow-hidden"
    >
      {/* Morning Canvas warmth — soft peach radial that fades into ivory.
          Same treatment as EmployerCalloutStrip on /medical-certificate
          so service-page superpower sections read as a consistent pattern. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 dark:opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(245, 198, 160, 0.18) 0%, rgba(245, 198, 160, 0.06) 40%, transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.08] dark:shadow-none p-7 sm:p-10 lg:p-12 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold text-success uppercase tracking-[0.12em] mb-3">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Pharmacy pricing
          </p>
          <Heading level="h2" className="mb-3 text-balance">
            <span className="text-success">PBS subsidies</span> apply at the pharmacy.
          </Heading>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            You only pay the standard PBS co-payment for eligible medications. Same subsidy you would get at any GP-issued script. {SOCIAL_PROOF.scriptFulfillmentPercent}% of our scripts are fulfilled same day.
          </p>
        </div>
      </div>
    </section>
  )
}
