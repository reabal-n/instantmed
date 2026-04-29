"use client"

import { AlertTriangle, CheckCircle2, Clipboard, FileText, ShieldAlert, Stethoscope } from "lucide-react"
import { toast } from "sonner"

import { ClinicalSummary } from "@/components/doctor/clinical-summary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  buildClinicalCaseSummary,
  type ClinicalPlanAction,
} from "@/lib/clinical/case-summary"
import { cn } from "@/lib/utils"

interface ClinicalCaseReviewProps {
  category?: string | null
  subtype?: string | null
  serviceType?: string | null
  patientName?: string | null
  answers: Record<string, unknown>
  riskTier?: string | null
  requiresLiveConsult?: boolean | null
  className?: string
}

const ACTION_STYLES: Record<ClinicalPlanAction, string> = {
  approve: "bg-emerald-50 text-emerald-700 border-emerald-200",
  prescribe: "bg-blue-50 text-blue-700 border-blue-200",
  needs_call: "bg-amber-50 text-amber-700 border-amber-200",
  request_info: "bg-amber-50 text-amber-700 border-amber-200",
  decline: "bg-red-50 text-red-700 border-red-200",
}

function actionLabel(action: ClinicalPlanAction): string {
  const labels: Record<ClinicalPlanAction, string> = {
    approve: "Approve",
    prescribe: "Prescribe",
    needs_call: "Call",
    request_info: "Info",
    decline: "Decline",
  }
  return labels[action]
}

export function ClinicalCaseReview({
  category,
  subtype,
  serviceType,
  patientName,
  answers,
  riskTier,
  requiresLiveConsult,
  className,
}: ClinicalCaseReviewProps) {
  const summary = buildClinicalCaseSummary({
    category,
    subtype,
    serviceType,
    patientName,
    answers,
    riskTier,
    requiresLiveConsult,
  })

  const copyPreset = async () => {
    if (!summary.prescriptionIntent?.clipboardText) return
    try {
      await navigator.clipboard.writeText(summary.prescriptionIntent.clipboardText)
      toast.success("Parchment preset copied")
    } catch {
      toast.error("Could not copy preset")
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-lg border border-border/60 bg-background">
        <div className="border-b border-border/60 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{summary.title}</h3>
            <Badge className={cn("ml-auto border text-xs", ACTION_STYLES[summary.recommendedPlan.action])}>
              {actionLabel(summary.recommendedPlan.action)}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 p-4">
          <section className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Patient story
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {summary.patientStory}
            </p>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {summary.keyFacts.map((fact) => (
              <div key={`${fact.label}:${fact.value}`} className="rounded-md bg-muted/35 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {fact.label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-foreground">
                  {fact.value}
                </p>
              </div>
            ))}
          </section>

          {summary.safetyItems.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Safety
              </p>
              <div className="space-y-2">
                {summary.safetyItems.map((item) => {
                  const destructive = item.severity === "block"
                  return (
                    <div
                      key={`${item.label}:${item.detail}`}
                      className={cn(
                        "flex gap-2 rounded-md border px-3 py-2 text-sm",
                        destructive
                          ? "border-red-200 bg-red-50 text-red-900"
                          : "border-amber-200 bg-amber-50 text-amber-900",
                      )}
                    >
                      {destructive ? (
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="mt-0.5 leading-relaxed">{item.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <section className="rounded-md border border-border/60 px-3 py-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recommended plan
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {summary.recommendedPlan.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {summary.recommendedPlan.rationale}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-foreground">
                  {summary.recommendedPlan.nextSteps.map((step) => (
                    <li key={step} className="leading-relaxed">- {step}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {summary.prescriptionIntent && (
            <section className="rounded-md border border-blue-200 bg-blue-50/70 px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                    Parchment preset
                  </p>
                  <p className="text-sm font-semibold text-blue-950">
                    {summary.prescriptionIntent.presetLabel}
                  </p>
                  {summary.prescriptionIntent.medicationName && (
                    <p className="text-sm text-blue-950">
                      {[summary.prescriptionIntent.medicationName, summary.prescriptionIntent.strength, summary.prescriptionIntent.form].filter(Boolean).join(" ")}
                    </p>
                  )}
                  {summary.prescriptionIntent.medicationSearchHint && (
                    <p className="text-sm text-blue-900">
                      Search: {summary.prescriptionIntent.medicationSearchHint}
                    </p>
                  )}
                  <p className="text-sm text-blue-900">
                    {summary.prescriptionIntent.directionsTemplate}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="bg-white" onClick={copyPreset}>
                  <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Draft note
              </p>
            </div>
            <pre className="whitespace-pre-wrap rounded-md bg-muted/35 px-3 py-2 text-sm font-sans leading-relaxed text-foreground">
              {summary.draftNote}
            </pre>
          </section>
        </div>
      </div>

      <details className="rounded-lg border border-border/60 bg-background">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground">
          Full answers
        </summary>
        <div className="border-t border-border/60 p-4">
          <ClinicalSummary
            answers={answers}
            consultSubtype={category === "consult" && subtype ? subtype : undefined}
            className="border-0 shadow-none p-0"
          />
        </div>
      </details>
    </div>
  )
}
