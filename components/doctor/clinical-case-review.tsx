"use client"

import { AlertTriangle, CheckCircle2, Clipboard, FileText, Loader2, Save, ShieldAlert, Stethoscope } from "lucide-react"
import { type RefObject } from "react"
import { toast } from "sonner"

import { ClinicalSummary } from "@/components/doctor/clinical-summary"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  buildClinicalCaseSummary,
  type PrescriptionIntent,
} from "@/lib/clinical/case-summary"
import { isClinicalNoteSufficient } from "@/lib/doctor/clinical-notes"
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
  hidePatientStory?: boolean
  hideTitle?: boolean
  hideRecommendedPlan?: boolean
  draftNoteValue?: string
  draftNoteTextareaRef?: RefObject<HTMLTextAreaElement>
  onDraftNoteChange?: (value: string) => void
  onDraftNoteSave?: (value: string) => Promise<void> | void
  isDraftNoteSaving?: boolean
  draftNoteDirty?: boolean
  draftNoteSavedAt?: Date | null
  draftNoteSaveError?: boolean
  doctorSignOffLabel?: string | null
  /**
   * Suppress the inline Parchment-preset block. Callers that render the
   * canonical PrescriptionRecommendationCard alongside this component
   * (the intake-review cockpit) set this to true to avoid double-render.
   */
  hidePrescriptionIntent?: boolean
}

function getPrescriptionCopyLabel(intent: PrescriptionIntent): string {
  const medicationLabel = [
    intent.medicationName,
    intent.strength,
    intent.form,
  ].filter(Boolean).join(" ")

  return medicationLabel || intent.presetLabel || "medicine"
}

const SOAP_SECTIONS = [
  { key: "S", label: "Subjective" },
  { key: "O", label: "Objective" },
  { key: "A", label: "Assessment" },
  { key: "P", label: "Plan" },
] as const

type SoapSectionKey = typeof SOAP_SECTIONS[number]["key"]
type SoapSections = Record<SoapSectionKey, string>

function parseSoapDraft(note: string): SoapSections | null {
  const matches = Array.from(note.matchAll(/(?:^|\n)[ \t]*([SOAP]):[ \t]*/g))
  if (matches.length < SOAP_SECTIONS.length) return null

  const sections = SOAP_SECTIONS.reduce((acc, section) => {
    acc[section.key] = ""
    return acc
  }, {} as SoapSections)
  const foundSections = new Set<SoapSectionKey>()

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const key = match[1] as SoapSectionKey
    if (!(key in sections) || typeof match.index !== "number") continue
    foundSections.add(key)
    const start = match.index + match[0].length
    const end = matches[index + 1]?.index ?? note.length
    sections[key] = note.slice(start, end).trim()
  }

  return SOAP_SECTIONS.every((section) => foundSections.has(section.key)) ? sections : null
}

function composeSoapDraft(sections: SoapSections): string {
  return SOAP_SECTIONS
    .map((section) => `${section.key}: ${sections[section.key].trim()}`)
    .join("\n")
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
  hidePatientStory = false,
  hideTitle = false,
  hideRecommendedPlan = false,
  draftNoteValue,
  draftNoteTextareaRef,
  onDraftNoteChange,
  onDraftNoteSave,
  isDraftNoteSaving = false,
  draftNoteDirty = false,
  draftNoteSavedAt = null,
  draftNoteSaveError = false,
  doctorSignOffLabel = null,
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
  const isEditableDraftNote = Boolean(onDraftNoteChange)
  const visibleDraftNote = isEditableDraftNote ? draftNoteValue ?? "" : summary.draftNote
  const draftNoteReady = isClinicalNoteSufficient(visibleDraftNote)
  const pinnedDraftFacts = compact ? [] : summary.keyFacts.slice(0, 4)
  const signOffParts = doctorSignOffLabel?.split(/\s+·\s+/, 2) ?? null
  const structuredSoapDraft = compact && isEditableDraftNote ? parseSoapDraft(visibleDraftNote) : null

  return (
    <div className={cn(compact ? "space-y-3" : "space-y-4", className)}>
      <div className={cn("space-y-4", compact && "space-y-3")}>
        {!hideTitle && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{summary.title}</h3>
            </div>
          </div>
        )}

        <div className={cn("grid", compact ? "gap-3" : "gap-5")}>
          {!hidePatientStory && (
            <section className={cn("rounded-lg bg-muted/30", compact ? "space-y-1 p-3" : "space-y-1.5 p-4")}>
              <p className="text-xs font-medium text-muted-foreground">
                Reason for visit
              </p>
              <p className={compact ? "max-h-12 overflow-hidden text-sm leading-6 text-foreground" : "text-sm leading-relaxed text-foreground"}>
                {summary.patientStory}
              </p>
            </section>
          )}

          {visibleFacts.length > 0 ? (
            <section
              aria-label="Request"
              className={cn(
                compact
                  ? "rounded-xl border border-border/60 bg-card p-3 shadow-sm shadow-primary/[0.035]"
                  : "grid grid-cols-1 gap-2 sm:grid-cols-2",
              )}
            >
              {compact ? (
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Patient answers</p>
                  </div>
                </div>
              ) : null}
              <div className={cn(compact ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "contents")}>
                {visibleFacts.map((fact) => (
                  <div key={`${fact.label}:${fact.value}`} className="rounded-lg bg-muted/30 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {fact.label}
                    </p>
                    <p className={cn("mt-0.5 text-sm font-medium text-foreground", compact && "max-h-10 overflow-hidden")}>
                      {fact.value}
                    </p>
                  </div>
                ))}
                {hiddenFactCount > 0 && (
                  <details open className="rounded-lg bg-muted/30 px-3 py-2.5 sm:col-span-2">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                      {hiddenFactCount} more facts
                    </summary>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {summary.keyFacts.slice(visibleFacts.length).map((fact) => (
                        <div key={`${fact.label}:${fact.value}`} className="rounded-md bg-background px-3 py-2">
                          <p className="text-[11px] font-medium text-muted-foreground">
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
              </div>
            </section>
          ) : null}

          {summary.safetyItems.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
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

          {!hideRecommendedPlan && (
            <section className="rounded-lg border border-border/60 bg-background px-4 py-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {summary.prescriptionIntent ? "Prescribing plan" : "Recommended plan"}
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
          )}

          {summary.prescriptionIntent && !hidePrescriptionIntent && (
            <section className="rounded-md border border-blue-200 bg-blue-50/70 px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium text-blue-700">
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

          <section className="rounded-xl border border-border/60 bg-card shadow-sm shadow-primary/[0.035]">
            <div className="flex flex-col gap-2 border-b border-border/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Clinical note
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Private until sent
                  </p>
                </div>
              </div>
              {isEditableDraftNote ? (
                <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                  {draftNoteSaveError ? (
                    <span className="text-destructive">Save failed</span>
                  ) : isDraftNoteSaving ? (
                    <span>Saving...</span>
                  ) : draftNoteDirty ? (
                    <span>Auto-saving...</span>
                  ) : draftNoteSavedAt ? (
                    <span>Draft saved</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            {isEditableDraftNote ? (
              <div className="space-y-2 p-3">
                {!compact ? (
                  <div
                    aria-label="Pinned reason for visit"
                    className="rounded-md border border-border/50 bg-background/80 px-2.5 py-2"
                  >
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      Reason for visit
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-5 text-foreground">
                      {summary.patientStory}
                    </p>
                  </div>
                ) : null}
                {!compact && pinnedDraftFacts.length > 0 ? (
                  <div
                    aria-label="Pinned case facts"
                    className="grid gap-1.5 rounded-md border border-border/50 bg-background/80 p-2 sm:grid-cols-2"
                  >
                    {pinnedDraftFacts.map((fact) => (
                      <div key={`draft:${fact.label}:${fact.value}`} className="min-w-0">
                        <p className="text-[10px] font-semibold text-muted-foreground">
                          {fact.label}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                          {fact.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {structuredSoapDraft ? (
                  <div className="space-y-1.5" aria-label="Structured SOAP note">
                    {SOAP_SECTIONS.map((section) => (
                      <div
                        key={section.key}
                        className="grid gap-1.5 rounded-md border border-border/60 bg-background/80 p-2.5 sm:grid-cols-[104px_minmax(0,1fr)] sm:items-start"
                      >
                        <label
                          htmlFor={`draft-soap-${section.key}`}
                          className="pt-1 text-[11px] font-semibold text-slate-500 dark:text-muted-foreground"
                        >
                          {section.label}
                        </label>
                        <Textarea
                          id={`draft-soap-${section.key}`}
                          ref={section.key === "S" ? draftNoteTextareaRef : undefined}
                          value={structuredSoapDraft[section.key]}
                          placeholder={`${section.label} note`}
                          onChange={(event) => {
                            onDraftNoteChange?.(composeSoapDraft({
                              ...structuredSoapDraft,
                              [section.key]: event.target.value,
                            }))
                          }}
                          className="w-full"
                          textareaClassName="min-h-[52px] max-h-[118px] resize-none overflow-y-auto border-transparent bg-transparent px-0 py-0 text-sm leading-relaxed shadow-none hover:border-transparent focus:min-h-[104px] focus:max-h-[220px] focus:border-transparent focus:ring-0 focus-visible:ring-0"
                          aria-label={`Draft clinical note ${section.label}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Textarea
                    ref={draftNoteTextareaRef}
                    value={visibleDraftNote}
                    placeholder="Start your note. Private until you send."
                    onChange={(event) => {
                      onDraftNoteChange?.(event.target.value)
                    }}
                    className="w-full"
                    textareaClassName="min-h-[172px] max-h-[280px] resize-none overflow-y-auto border-border/60 bg-background pb-6 text-sm leading-relaxed motion-safe:transition-[min-height,box-shadow] motion-safe:duration-150 motion-safe:ease-out focus:min-h-[280px] focus:max-h-[380px] focus-visible:ring-primary/20"
                    aria-label="Draft clinical note"
                  />
                )}
                {!draftNoteReady ? (
                  <p className="rounded-md border border-border/60 bg-muted/25 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                    Add one clinical note line before signing.
                  </p>
                ) : null}
                {signOffParts ? (
                  <div className="rounded-md border border-primary/10 bg-primary/[0.025] px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                    Issue sign-off:{" "}
                    <span className="font-semibold text-foreground">{signOffParts[0]}</span>
                    {signOffParts[1] ? (
                      <>
                        <span className="text-muted-foreground"> · </span>
                        <span className="font-mono text-[11px] text-foreground">{signOffParts[1]}</span>
                      </>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Saved as you type. Private until you send.
                  </p>
                  {draftNoteSaveError && onDraftNoteSave ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void onDraftNoteSave(visibleDraftNote)}
                      disabled={isDraftNoteSaving}
                    >
                      {isDraftNoteSaving ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Save note
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-2 px-3 py-2">
                <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-foreground">
                  {summary.draftNote}
                </pre>
                {signOffParts ? (
                  <div className="rounded-md border border-primary/10 bg-primary/[0.025] px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                    Issue sign-off:{" "}
                    <span className="font-semibold text-foreground">{signOffParts[0]}</span>
                    {signOffParts[1] ? (
                      <>
                        <span className="text-muted-foreground"> · </span>
                        <span className="font-mono text-[11px] text-foreground">{signOffParts[1]}</span>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </section>
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
