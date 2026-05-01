"use client"

import { CheckCircle, ChevronDown, Clock, FileText } from "lucide-react"
import { useState } from "react"

import { ClinicalCaseReview } from "@/components/doctor/clinical-case-review"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getQueueEnteredAt } from "@/lib/doctor/queue-utils"
import { formatServiceType } from "@/lib/format/intake"
import { cn } from "@/lib/utils"

export function RequestInfoCard() {
  const { intake, service, answers, formatDate } = useIntakeReview()
  const [open, setOpen] = useState(true)
  const submittedAt = intake.submitted_at ?? intake.created_at
  const queueEnteredAt = getQueueEnteredAt(intake)

  return (
    <Card>
      <CardHeader
        className="py-4 px-5 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          {service?.name || formatServiceType(service?.type || "")}
          <ChevronDown className={cn("h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform", !open && "-rotate-90")} />
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Submitted: {formatDate(submittedAt)}
            </div>
            {(intake.payment_status === "paid" || intake.paid_at) && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
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
            riskTier={intake.risk_tier}
            requiresLiveConsult={intake.requires_live_consult}
          />
        </CardContent>
      )}
    </Card>
  )
}
