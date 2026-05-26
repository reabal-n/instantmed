"use client"

import { AlertTriangle, CheckCircle2, Clipboard, FileText, ShieldAlert, Stethoscope } from "lucide-react"
import { toast } from "sonner"

import { ClinicalSummary } from "@/components/doctor/clinical-summary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  buildClinicalCaseSummary,
  type ClinicalPlanAction,
  type PrescriptionIntent,
} from "@/lib/clinical/case-summary"
import { cn } from "@/lib/utils"

interface ClinicalCaseReviewProps {
  category?: string | null
  subtype?: string | null
  serviceType?: string | null
  patientName?: string | null
  patientDateOfBirth?: string | null
  patientSex?: string | null
  answers: Record<string, unknown>
  riskTier?: string | null
  requiresLiveConsult?: boolean | null
  className?: string
  compact?: boolean
  showFullAnswers?: boolean
  /**
   * Suppress the inline Parchment-preset block. Callers that render the
   * canonical PrescriptionRecommendationCard alongside this component
   * (the intake-review cockpit) set this to true to avoid double-render.
   */
  hidePrescriptionIntent?: boolean
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

function getPrescriptionCopyLabel(intent: PrescriptionIntent): string {
  const medicationLabel = [
    intent.medicationName,
    intent.strength,
    intent.form,
  ].filter(Boolean).join(" ")

  return medicationLabel || intent.presetLabel || "medicine"
}

export function ClinicalCaseReview({
  category,
  subtype,
  serviceType,
  patientName,
  patientDateOfBirth,
  patientSex,
  answers,
  riskTier,
  requiresLiveConsult,
  className,
  compact = false,
  showFullAnswers = true,
  hidePrescriptionIntent = false,
}: ClinicalCaseReviewProps) {
  const summary = buildClinicalCaseSummary({
    category,
    subtype,
    serviceType,
    patientName,
    patientDateOfBirth,
    patientSex,
    answers,
    riskTier,
    requiresLiveConsult,
  })

  const copyPreset = async () => {
    if (!summary.prescriptionIntent?.clipboardText) return
    try {
      await navigator.clipboard.writeText(summary.prescriptionIntent.clipboardText)
      toast.success(`Copied ${getPrescriptionCopyLabel(summary.prescriptionIntent)} for Parchment`)
    } catch {
      toast.error("Could not copy preset")
    }
  }

  const copySearchHint = async () => {
    if (!summary.prescriptionIntent?.medicationSearchHint) return
    try {
      await navigator.clipboard.writeText(summary.prescriptionIntent.medicationSearchHint)
      toast.success("Copied Parchment search term")
    } catch {
      toast.error("Could not copy search term")
    }
  }
  const visibleFacts = compact ? summary.keyFacts.slice(0, 4) : summary.keyFacts
  const hiddenFactCount = Math.max(summary.keyFacts.length - visibleFacts.length, 0)

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-4", className)}>
      <div className="rounded-lg border border-border/60 bg-background">
        <div className={cn("border-b border-border/60", compact ? "px-3 py-2" : "px-4 py-3")}>
          <div className="flex flex-wrap items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{summary.title}</h3>
            <Badge className={cn("ml-auto border text-xs", ACTION_STYLES[summary.recommendedPlan.action])}>
              {actionLabel(summary.recommendedPlan.action)}
            </Badge>
          </div>
        </div>

        <div className={cn("grid", compact ? "gap-2 p-3" : "gap-4 p-4")}>
          <section className={compact ? "space-y-1" : "space-y-1.5"}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Patient story
            </p>
            <p className={compact ? "max-h-12 overflow-hidden text-sm leading-6 text-foreground" : "text-sm leading-relaxed text-foreground"}>
              {summary.patientStory}
            </p>
          </section>

          <section className={compact ? "grid grid-cols-1 gap-1.5 sm:grid-cols-2" : "grid grid-cols-1 sm:grid-cols-2 gap-2"}>
            {visibleFacts.map((fact) => (
              <div key={`${fact.label}:${fact.value}`} className="rounded-md bg-muted/35 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {fact.label}
                </p>
                <p className={cn("mt-0.5 text-sm font-medium text-foreground", compact && "max-h-10 overflow-hidden")}>
                  {fact.value}
                </p>
              </div>
            ))}
            {hiddenFactCount > 0 && (
              <details className="rounded-md bg-muted/35 px-3 py-2 sm:col-span-2">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  {hiddenFactCount} more facts
                </summary>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {summary.keyFacts.slice(visibleFacts.length).map((fact) => (
                    <div key={`${fact.label}:${fact.value}`} className="rounded-md bg-background px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {fact.label}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {fact.value}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            )}
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
                {compact ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                      Decision checks
                    </summary>
                    <ul className="mt-2 space-y-1 text-sm text-foreground">
                      {summary.recommendedPlan.nextSteps.map((step) => (
                        <li key={step} className="leading-relaxed">- {step}</li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-foreground">
                    {summary.recommendedPlan.nextSteps.map((step) => (
                      <li key={step} className="leading-relaxed">- {step}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {summary.prescriptionIntent && !hidePrescriptionIntent && (
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
                    <div className="flex flex-wrap items-center gap-2 text-sm text-blue-900">
                      <span>Search: {summary.prescriptionIntent.medicationSearchHint}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 bg-white px-2 text-xs"
                        onClick={copySearchHint}
                      >
                        <Clipboard className="mr-1 h-3 w-3" />
                        Copy search
                      </Button>
                    </div>
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

          <details className="rounded-md border border-border/60 bg-muted/25">
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <FileText className="h-4 w-4" />
              Draft note
            </summary>
            <pre className="whitespace-pre-wrap border-t border-border/60 px-3 py-2 text-sm font-sans leading-relaxed text-foreground">
              {summary.draftNote}
            </pre>
          </details>
        </div>
      </div>

      {showFullAnswers && (
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
      )}
    </div>
  )
}
