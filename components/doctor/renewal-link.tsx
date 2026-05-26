import { ArrowUpRight } from "lucide-react"
import Link from "next/link"

import type { RenewalMatch } from "@/lib/doctor/renewal-format"
import { cn } from "@/lib/utils"

interface RenewalLinkProps {
  /**
   * Renewal match for the intake. When null/undefined the component
   * renders nothing, which is the common case (most intakes are not
   * renewals).
   */
  renewalMatch: RenewalMatch | null | undefined
  /** The patient id used to build the patient profile deep-link. */
  patientId: string
  className?: string
}

/**
 * Inline link surfaced on the intake review slide when the intake is a
 * renewal of a prior approved script. Lets the doctor jump straight to
 * the prior prescription on the patient profile without digging through
 * the timeline by hand.
 *
 * The button is intentionally calm (text + arrow, no badge background)
 * so it does not compete with the patient-decision-strip status chips.
 */
export function RenewalLink({
  renewalMatch,
  patientId,
  className,
}: RenewalLinkProps) {
  if (!renewalMatch) return null

  const trimmedStrength = renewalMatch.strength?.trim()
  const label = [renewalMatch.medicationName, trimmedStrength]
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(" ")

  const href = renewalMatch.priorPrescriptionId
    ? `/doctor/patients/${patientId}?focus=prescription-${renewalMatch.priorPrescriptionId}`
    : `/doctor/patients/${patientId}?tab=prescriptions`

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline",
        className,
      )}
      title={`Renewal of: ${label}`}
    >
      View prior {label} script
      <ArrowUpRight className="h-3 w-3" aria-hidden />
    </Link>
  )
}
