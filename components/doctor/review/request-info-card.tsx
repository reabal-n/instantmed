"use client"

import { CheckCircle, ChevronDown, Clock, FileText } from "lucide-react"
import { useState } from "react"

import { ClinicalSummary } from "@/components/doctor/clinical-summary"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatServiceType } from "@/lib/format/intake"
import { cn } from "@/lib/utils"

export function RequestInfoCard() {
  const { intake, service, answers, formatDate } = useIntakeReview()
  const [open, setOpen] = useState(true)

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
              Submitted: {formatDate(intake.created_at)}
            </div>
            {intake.paid_at && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                Paid: {formatDate(intake.paid_at)}
              </div>
            )}
          </div>

          {Object.keys(answers).length > 0 && (
            <ClinicalSummary
              answers={answers}
              consultSubtype={
                intake.category === "consult" && intake.subtype ? intake.subtype : undefined
              }
              inline
            />
          )}
        </CardContent>
      )}
    </Card>
  )
}
