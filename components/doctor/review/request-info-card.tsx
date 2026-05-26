"use client"

import { CheckCircle, Clock, FileText } from "lucide-react"

import { ClinicalCaseReview } from "@/components/doctor/clinical-case-review"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getQueueEnteredAt } from "@/lib/doctor/queue-utils"
import { formatServiceType } from "@/lib/format/intake"
import { cn } from "@/lib/utils"

interface RequestInfoCardProps {
  compact?: boolean
  hideFullAnswers?: boolean
  /**
   * Suppress the inline Parchment-preset block. The intake-review cockpit
   * sets this so the canonical PrescriptionRecommendationCard does not
   * double-render alongside the legacy inline preset section.
   */
  hidePrescriptionIntent?: boolean
}

/**
 * Request facts always visible (no collapse-toggle).
 *
 * Pre-2026-05-21 this card collapsed via a chevron click in the header.
 * That added a click on the most-used tab and hid the patient story
 * behind a state-management surprise. The card now renders open every
 * time it mounts.
 */
export function RequestInfoCard({
  compact = false,
  hideFullAnswers = false,
  hidePrescriptionIntent = false,
}: RequestInfoCardProps) {
  const { intake, service, answers, formatDate } = useIntakeReview()
  const submittedAt = intake.submitted_at ?? intake.created_at
  const queueEnteredAt = getQueueEnteredAt(intake)

  return (
    <Card>
      <CardHeader className={cn(compact ? "px-4 py-3" : "px-5 py-4")}>
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" aria-hidden="true" />
          {service?.name || formatServiceType(service?.type || "")}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-4", compact ? "px-4 py-3" : "px-5 py-4")}>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Submitted: {formatDate(submittedAt)}
          </div>
          {(intake.payment_status === "paid" || intake.paid_at) && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
              Paid: {intake.paid_at ? formatDate(queueEnteredAt) : "time missing"}
            </div>
          )}
        </div>

        <ClinicalCaseReview
          answers={answers}
          category={intake.category}
          subtype={intake.subtype}
          serviceType={service?.type}
          patientName={intake.patient.full_name}
          patientDateOfBirth={intake.patient.date_of_birth ?? null}
          patientSex={intake.patient.sex ?? null}
          riskTier={intake.risk_tier}
          requiresLiveConsult={intake.requires_live_consult}
          compact={compact}
          showFullAnswers={!hideFullAnswers}
          hidePrescriptionIntent={hidePrescriptionIntent}
        />
      </CardContent>
    </Card>
  )
}
