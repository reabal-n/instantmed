"use client"

import { AlertTriangle, CheckCircle2, Clipboard, FileText, Loader2, Save, ShieldAlert, Stethoscope } from "lucide-react"
import { type RefObject } from "react"
import { toast } from "sonner"

import { ClinicalSummary } from "@/components/doctor/clinical-summary"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { buildClinicalCaseSummary, type PrescriptionIntent } from "@/lib/clinical/case-summary"
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
   * Suppress the inline Parchment handoff block. Callers that render the
   * canonical PrescriptionRecommendationCard alongside this component
   * (the intake-review cockpit) set this to true to avoid double-render.
   */
  hidePrescriptionIntent?: boolean
}

const SOAP_SECTIONS = [
  { key: "S", label: "Subjective" },
  { key: "O", label: "Objective" },
  { key: "A", label: "Assessment" },
  { key: "P", label: "Plan" },
] as const
const COMPACT_FACT_LIMIT = 4
const PINNED_DRAFT_FACT_LIMIT = 4

function getPrescriptionCopyLabel(intent: PrescriptionIntent): string {
  const medicationLabel = [
    intent.medicationName,
    intent.strength,
    intent.form,
  ].filter(Boolean).join(" ")

  return medicationLabel || intent.presetLabel || "medicine"
}

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

function getSoapTextareaRows(section: SoapSectionKey, value: string): number {
  const explicitLines = value.split("\n").length
  const wrappedLines = Math.ceil(value.length / 78)
  const baseline = section === "P" ? 4 : 3

  return Math.min(9, Math.max(baseline, explicitLines + wrappedLines))
}

function getCompactSoapTextareaRows(section: SoapSectionKey, value: string): number {
  if (section === "S") return Math.min(3, Math.max(2, Math.ceil(value.length / 96)))
  if (section === "P") return 3
  return 2
}

function normaliseClinicalFactText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function isDuplicatePatientNoteFact(label: string, value: string, patientStory: string): boolean {
  if (label.toLowerCase() !== "patient note") return false
  const note = normaliseClinicalFactText(value)
  if (note.length < 24) return false
  return normaliseClinicalFactText(patientStory).includes(note)
}

function getSafetyItemClasses(severity: "info" | "caution" | "block", compact: boolean): string {
  if (severity === "block") {
    return "border-red-200 bg-red-50 text-red-900"
  }
  if (severity === "caution") {
    return "border-amber-200 bg-amber-50 text-amber-900"
  }
  return compact
    ? "border-border/60 bg-background text-foreground"
    : "border-border/60 bg-muted/25 text-foreground"
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
      toast.error("Could not copy prescribing context")
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
  const scannableFacts = summary.keyFacts.filter((fact) => (
    compact && hidePatientStory
      ? !isDuplicatePatientNoteFact(fact.label, fact.value, summary.patientStory)
      : true
  ))
  const visibleFacts = compact ? scannableFacts.slice(0, COMPACT_FACT_LIMIT) : scannableFacts
  const hiddenFactCount = Math.max(scannableFacts.length - visibleFacts.length, 0)
  const isEditableDraftNote = Boolean(onDraftNoteChange)
  const visibleDraftNote = isEditableDraftNote ? draftNoteValue ?? "" : summary.draftNote
  const draftNoteReady = isClinicalNoteSufficient(visibleDraftNote)
  const pinnedDraftFacts = compact ? [] : summary.keyFacts.slice(0, PINNED_DRAFT_FACT_LIMIT)
  const signOffParts = doctorSignOffLabel?.split(/\s+·\s+/, 2) ?? null
  const structuredSoapDraft = isEditableDraftNote ? parseSoapDraft(visibleDraftNote) : null
  // In compact mode (cockpit panel) facts come first so the doctor can scan
  // clinical context before reviewing the draft note. Full-page view keeps
  // the note at the top as the primary work surface.
  const showClinicalNoteBeforeAnswers = !compact && isEditableDraftNote
  const setDraftNoteEditableRef = (node: HTMLDivElement | null) => {
    if (!draftNoteTextareaRef) return
    ;(draftNoteTextareaRef as unknown as { current: HTMLTextAreaElement | null }).current =
      node as unknown as HTMLTextAreaElement | null
  }
  const clinicalNoteSection = (
    <section className="rounded-xl border border-border/60 bg-card shadow-sm shadow-primary/[0.035]">
      <div
        className={cn(
          "flex flex-col gap-2 border-b border-border/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
          compact ? "bg-card" : "sticky top-0 z-10 bg-card/95 backdrop-blur",
        )}
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs font-semibold text-foreground">
            {isEditableDraftNote ? "Draft note" : "Clinical note"}
            <span className="font-normal text-muted-foreground"> · Check before you send.</span>
          </p>
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
        <div className={cn("space-y-2", compact ? "p-2.5" : "p-3")}>
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
            <div
              className={cn("grid gap-2", compact ? "xl:grid-cols-2" : "grid-cols-1")}
              aria-label="Structured SOAP note"
            >
              {SOAP_SECTIONS.map((section) => (
                <div
                  key={section.key}
                  className={cn(
                    "sm:items-start",
                    compact
                      ? "grid gap-0.5 border-b border-border/30 pb-1.5 last:border-0 last:pb-0"
                      : "grid gap-1.5 rounded-md border border-border/60 bg-background/80 p-2.5 sm:grid-cols-[108px_minmax(0,1fr)]",
                  )}
                >
                  <label
                    htmlFor={`draft-soap-${section.key}`}
                    className={cn(
                      "text-[11px] font-semibold text-slate-500 dark:text-muted-foreground",
                      !compact && "pt-1",
                    )}
                  >
                    {compact ? `${section.key} · ${section.label}` : section.label}
                  </label>
                  <Textarea
                    id={`draft-soap-${section.key}`}
                    ref={section.key === "S" ? draftNoteTextareaRef : undefined}
                    value={structuredSoapDraft[section.key]}
                    placeholder={`${section.label} note`}
                    minRows={compact ? getCompactSoapTextareaRows(section.key, structuredSoapDraft[section.key]) : getSoapTextareaRows(section.key, structuredSoapDraft[section.key])}
                    onChange={(event) => {
                      onDraftNoteChange?.(composeSoapDraft({
                        ...structuredSoapDraft,
                        [section.key]: event.target.value,
                      }))
                    }}
                    className="w-full"
                    textareaClassName="resize-y overflow-auto border-transparent bg-transparent px-0 py-0 text-sm leading-relaxed shadow-none hover:border-transparent focus:border-transparent focus:ring-0 focus-visible:ring-0"
                    aria-label={`Draft clinical note ${section.label}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              ref={setDraftNoteEditableRef}
              role="textbox"
              aria-label="Draft clinical note"
              aria-multiline="true"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start your note. Press Cmd+Enter to approve."
              onInput={(event) => {
                onDraftNoteChange?.(event.currentTarget.innerText)
              }}
              onPaste={(event) => {
                event.preventDefault()
                const text = event.clipboardData.getData("text/plain")
                document.execCommand("insertText", false, text)
              }}
              className="min-h-[112px] w-full scroll-mt-6 overflow-visible whitespace-pre-wrap rounded-md border border-border/70 bg-[#FFFEFB] px-3 pb-2 pt-6 font-sans text-sm font-medium leading-6 text-foreground shadow-inner shadow-primary/[0.025] outline-none transition-[min-height,border-color,box-shadow] duration-150 ease-out empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] hover:border-border focus:min-h-[150px] focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-card"
            >
              {visibleDraftNote}
            </div>
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
          ) : !compact ? (
            <p className="text-xs text-muted-foreground">
              Saved as you type. Private until you send.
            </p>
          ) : null}
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
  )

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
              <p className={compact ? "text-sm leading-6 text-foreground" : "text-sm leading-relaxed text-foreground"}>
                {summary.patientStory}
              </p>
            </section>
          )}

          {showClinicalNoteBeforeAnswers ? clinicalNoteSection : null}

          {visibleFacts.length > 0 ? (
            compact ? (
              <section
                aria-label="Request"
                className="rounded-lg border border-border/50 bg-background/80 px-2.5 py-2"
              >
                <dl className="flex flex-wrap gap-x-3 gap-y-1">
                  {visibleFacts.map((fact) => (
                    <div key={`${fact.label}:${fact.value}`} className="flex items-baseline gap-1">
                      <dt className="text-[11px] text-muted-foreground/80 shrink-0">{fact.label}</dt>
                      <dd className="max-w-[28ch] truncate text-[13px] font-medium text-foreground">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
                {hiddenFactCount > 0 ? (
                  // Expandable in-panel rather than a dead-end "+N more in full
                  // intake" hint: allergies + current medications can fall past the
                  // compact cap, and the prescribing checklist tells the doctor to
                  // confirm them before Parchment — they must be reachable without
                  // leaving the review panel. <details> renders its children in the
                  // DOM even when collapsed, so the data is always present in-panel.
                  <details className="mt-1.5">
                    <summary className="cursor-pointer list-none text-[11px] font-medium text-muted-foreground hover:text-foreground">
                      +{hiddenFactCount} more — including allergies &amp; current medicines
                    </summary>
                    <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {scannableFacts.slice(visibleFacts.length).map((fact) => (
                        <div key={`${fact.label}:${fact.value}`} className="flex items-baseline gap-1">
                          <dt className="text-[11px] text-muted-foreground/80 shrink-0">{fact.label}</dt>
                          <dd className="max-w-[28ch] truncate text-[13px] font-medium text-foreground">{fact.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                ) : null}
              </section>
            ) : (
              <section
                aria-label="Request"
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                <div className="contents">
                  {visibleFacts.map((fact) => (
                    <div key={`${fact.label}:${fact.value}`} className="rounded-lg bg-muted/30 px-3 py-2.5">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {fact.label}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
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
                        {scannableFacts.slice(visibleFacts.length).map((fact) => (
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
            )
          ) : null}

          {summary.safetyItems.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Safety
              </p>
              <div
                className={cn(
                  compact ? "grid gap-1.5 sm:grid-cols-3" : "space-y-2",
                )}
                data-compact-safety-summary={compact ? "true" : undefined}
              >
                {summary.safetyItems.map((item) => {
                  const destructive = item.severity === "block"
                  const SafetyIcon = destructive
                    ? ShieldAlert
                    : item.severity === "caution"
                      ? AlertTriangle
                      : CheckCircle2
                  return (
                    <div
                      key={`${item.label}:${item.detail}`}
                      data-safety-severity={item.severity}
                      className={cn(
                        "flex gap-2 rounded-md border",
                        compact ? "px-2.5 py-2 text-xs" : "px-3 py-2 text-sm",
                        getSafetyItemClasses(item.severity, compact),
                      )}
                    >
                      <SafetyIcon
                        className={cn(
                          "mt-0.5 shrink-0",
                          compact ? "h-3.5 w-3.5" : "h-4 w-4",
                          item.severity === "info" && "text-emerald-600",
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="font-medium">{item.label}</p>
                        <p className={cn("mt-0.5 leading-relaxed", compact && "line-clamp-2 text-muted-foreground")}>
                          {item.detail}
                        </p>
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
                    {summary.prescriptionIntent ? "Prescribing context" : "Clinical plan"}
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
                    Parchment handoff context
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
                  <p className="text-xs text-blue-800">
                    Confirm medicine, dose and all prescribing details in Parchment.
                  </p>
                </div>
                {summary.prescriptionIntent.clipboardText && (
                  <Button type="button" variant="outline" size="sm" className="bg-white" onClick={copyPreset}>
                    <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                    Copy
                  </Button>
                )}
              </div>
            </section>
          )}

          {showClinicalNoteBeforeAnswers ? null : clinicalNoteSection}
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
