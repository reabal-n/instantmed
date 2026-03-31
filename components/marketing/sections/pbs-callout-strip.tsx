"use client"

import { CheckCircle2 } from "lucide-react"

// =============================================================================
// COMPONENT
// =============================================================================

/** Thin PBS subsidy callout strip — reassures patients about pharmacy pricing */
export function PBSCalloutStrip() {
  return (
    <section
      aria-label="PBS subsidy information"
      className="bg-success/5 border-y border-success/15 py-4"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <p className="flex items-center justify-center gap-2 text-sm text-success/90 font-medium text-center">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          PBS subsidies apply at the pharmacy &mdash; you only pay the standard
          co-payment for eligible medications
        </p>
      </div>
    </section>
  )
}
