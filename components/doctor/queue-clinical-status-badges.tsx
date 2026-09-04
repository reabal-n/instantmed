import { PhoneCall, ShieldAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"

interface QueueClinicalStatusBadgesProps {
  hasClinicalRisk: boolean
  requiresLiveConsult: boolean
}

/**
 * Keep clinical acuity and workflow requirements visually distinct.
 * A live consultation can be required without the case being high risk.
 */
export function QueueClinicalStatusBadges({
  hasClinicalRisk,
  requiresLiveConsult,
}: QueueClinicalStatusBadgesProps) {
  if (!hasClinicalRisk && !requiresLiveConsult) return null

  return (
    <>
      {hasClinicalRisk && (
        <Badge className="border-destructive/20 bg-destructive/10 text-destructive">
          <ShieldAlert className="mr-1 h-3 w-3" aria-hidden="true" />
          High risk
        </Badge>
      )}
      {requiresLiveConsult && (
        <Badge
          variant="outline"
          className="border-warning-border bg-warning-light text-warning"
          title="Live consultation required before completion."
          aria-label="Needs call: live consultation required before completion"
          data-queue-needs-call-chip
        >
          <PhoneCall className="mr-1 h-3 w-3" aria-hidden="true" />
          Needs call
        </Badge>
      )}
    </>
  )
}
