"use client"

import { AlertCircle, FileText } from "lucide-react"
import type { ReactNode } from "react"

import { ClinicalCaseReview } from "@/components/doctor/clinical-case-review"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import type { ClinicalCaseSummary } from "@/lib/clinical/case-summary"
import type { ReviewFact, ReviewPacket } from "@/lib/clinical/review-packet"
import { cn } from "@/lib/utils"

interface RequestInfoCardProps {
  packet: ReviewPacket
  summary: ClinicalCaseSummary
  draftNoteOpen: boolean
  onDraftNoteOpenChange: (open: boolean) => void
  actionSlot?: ReactNode
}

function reviewFactTone(fact: ReviewFact): string {
  if (fact.state === "missing") return "text-warning"
  if (fact.state === "inferred") return "text-amber-700 dark:text-amber-300"
  return "text-foreground"
}

/**
 * The single default-visible packet for current-request facts. ClinicalCaseReview
 * remains the note/safety editor, but its competing story, key-fact, plan, and
 * prescribing-context renderers are suppressed here.
 */
export function RequestInfoCard({
  packet,
  summary,
  draftNoteOpen,
  onDraftNoteOpenChange,
  actionSlot,
}: RequestInfoCardProps) {
  const {
    data,
    intake,
    service,
    answers,
    doctorNotes,
    setDoctorNotes,
    setNoteSaved,
    noteDirty,
    savedAt,
    isAutoSaving,
    autoSaveError,
    isPending,
    notesRef,
    handleSaveNotes,
  } = useIntakeReview()
  const doctorSignOffLabel = [
    data.reviewingClinician?.fullName,
    data.reviewingClinician?.ahpraNumber,
  ].filter(Boolean).join(" · ") || null

  return (
    <section
      aria-label="Request packet"
      data-review-packet="true"
      className="rounded-xl border border-border/50 bg-card px-3 py-3 shadow-sm shadow-primary/[0.04] sm:px-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">{packet.title}</span>
        </h3>
        {packet.issueCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {packet.issueCount} {packet.issueCount === 1 ? "item" : "items"} to confirm
          </span>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/50 pt-3 lg:grid-cols-3">
        {packet.facts.map((fact) => (
          <div
            key={fact.key}
            className={cn("min-w-0", fact.optional && "text-muted-foreground")}
            data-review-fact={fact.key}
            data-review-fact-state={fact.state}
          >
            <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {fact.label}
            </dt>
            <dd className={cn("mt-0.5 break-words text-[13px] font-semibold leading-5", reviewFactTone(fact))}>
              {fact.value}
            </dd>
            {fact.issue ? (
              <p className="mt-0.5 text-[11px] font-medium leading-4 text-warning">
                {fact.state === "inferred" ? "Inferred from patient text · " : ""}
                {fact.issue}
              </p>
            ) : null}
          </div>
        ))}
      </dl>

      <div className="mt-3 border-t border-border/50 pt-3">
        <ClinicalCaseReview
          summary={summary}
          answers={answers}
          category={intake.category}
          subtype={intake.subtype}
          serviceType={service?.type}
          patientName={intake.patient.full_name}
          patientDateOfBirth={intake.patient.date_of_birth ?? null}
          patientSex={intake.patient.sex ?? null}
          riskTier={intake.risk_tier}
          requiresLiveConsult={intake.requires_live_consult}
          scriptSent={intake.script_sent}
          compact
          showFullAnswers={false}
          hidePatientStory
          hideTitle
          hideRequestFacts
          hideRecommendedPlan
          hidePrescriptionIntent
          draftNoteOpen={draftNoteOpen}
          onDraftNoteOpenChange={onDraftNoteOpenChange}
          draftNoteValue={doctorNotes}
          draftNoteTextareaRef={notesRef}
          onDraftNoteChange={(value) => {
            setDoctorNotes(value)
            setNoteSaved(false)
          }}
          onDraftNoteSave={handleSaveNotes}
          isDraftNoteSaving={isPending || isAutoSaving}
          draftNoteDirty={noteDirty}
          draftNoteSavedAt={savedAt}
          draftNoteSaveError={autoSaveError}
          doctorSignOffLabel={doctorSignOffLabel}
        />
      </div>

      {actionSlot ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          {actionSlot}
        </div>
      ) : null}
    </section>
  )
}
