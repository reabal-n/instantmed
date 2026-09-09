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

function ReviewFactItem({
  fact,
  prominent = false,
  inline = false,
}: {
  fact: ReviewFact
  prominent?: boolean
  inline?: boolean
}) {
  return (
    <div
      className={cn("min-w-0", fact.optional && "text-muted-foreground")}
      data-review-fact={fact.key}
      data-review-fact-state={fact.state}
    >
      <dt className={cn(
        "text-muted-foreground",
        inline ? "inline text-xs font-medium" : "text-[10px] font-semibold uppercase tracking-[0.06em]",
      )}>
        {fact.label}{inline ? ":" : ""}
      </dt>
      <dd
        className={cn(
          "whitespace-pre-wrap break-words font-semibold",
          inline ? "ml-1.5 inline" : "mt-0.5",
          prominent ? "text-base leading-6" : "text-[13px] leading-5",
          reviewFactTone(fact),
        )}
      >
        {fact.value}
      </dd>
      {fact.issue ? (
        <p className="mt-0.5 text-[11px] font-medium leading-4 text-warning">
          {fact.state === "inferred" ? "Inferred from patient text · " : ""}
          {fact.issue}
        </p>
      ) : null}
    </div>
  )
}

const SAFETY_FACT_KEYS: Record<string, string> = {
  current_medications: "other_medications",
  pregnant_breastfeeding: "pregnancy_breastfeeding",
  adverse_medication_reactions: "medication_reactions",
}

const ED_CONTEXT_FACT_KEYS = new Set([
  "main_goal", "duration", "erection_frequency", "iief_5_score", "treatment_preference",
])

const ED_PRIOR_TREATMENT_FACT_KEYS = new Set([
  "previous_ed_medication", "previous_treatment_detail", "previous_treatment_response",
])

const ED_SCREEN_ANSWER_KEYS: Record<string, string> = {
  nitrate_use: "edNitrates",
  recent_heart_event: "edRecentHeartEvent",
  severe_heart_condition: "edSevereHeart",
  alpha_blockers: "edAlphaBlockers",
  blood_pressure_medication: "edBpMedication",
}

function isExplicitNegativeEdScreen(fact: ReviewFact, answers: Record<string, unknown>): boolean {
  const answerKey = ED_SCREEN_ANSWER_KEYS[fact.key]
  if (!answerKey || fact.state !== "confirmed" || fact.value !== "No" || fact.issue) return false
  const answer = answers[answerKey]
  // Only known yes/no screen answers can join this row. Do not classify free
  // text, an omitted answer, "none" or "not applicable" as a negative screen.
  return answer === false || (
    typeof answer === "string" && ["no", "false"].includes(answer.trim().toLowerCase())
  )
}

const REPEAT_SAFETY_SCREEN_KEYS = new Set([
  "side_effects", "allergies", "medication_reactions", "conditions", "other_medications", "pregnancy_breastfeeding",
])

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
    noteDirty,
    noteSaved,
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
  const isRepeatPrescription = packet.workflow.kind === "repeat_prescription"
  const medicationFact = isRepeatPrescription
    ? packet.facts.find((fact) => fact.key === "medicine")
    : null
  const supportingFacts = packet.facts.filter((fact) => (
    fact.key !== medicationFact?.key &&
    // Keep any distinct summary detail, but do not repeat an identical source
    // finding already visible in its labelled safety row.
    !packet.safety.rows.some((row) => (
      row.key === (SAFETY_FACT_KEYS[fact.key] || fact.key) && row.display.includes(fact.value)
    ))
  ))
  const regimenFact = isRepeatPrescription
    ? supportingFacts.find((fact) => fact.key === "patient_dose")
    : null
  const adjacentFacts = isRepeatPrescription
    ? supportingFacts.filter((fact) => fact.key === "indication" || fact.key === "frequency")
    : []
  const isEdRequest = packet.workflow.kind === "prescribing_consult" && intake.subtype === "ed"
  const clinicalContextFacts = isEdRequest
    ? supportingFacts.filter((fact) => ED_CONTEXT_FACT_KEYS.has(fact.key))
    : []
  const priorTreatmentFacts = isEdRequest
    ? supportingFacts.filter((fact) => ED_PRIOR_TREATMENT_FACT_KEYS.has(fact.key))
    : []
  const negativeScreeningFacts = isEdRequest
    ? supportingFacts.filter((fact) => isExplicitNegativeEdScreen(fact, answers))
    : []
  const remainingFacts = supportingFacts.filter((fact) => (
    fact !== regimenFact && !adjacentFacts.includes(fact) &&
    !clinicalContextFacts.includes(fact) && !priorTreatmentFacts.includes(fact) && !negativeScreeningFacts.includes(fact)
  ))
  const negativeSafetyRows = packet.safety.rows.filter((row) => (
    REPEAT_SAFETY_SCREEN_KEYS.has(row.key) && row.state === "confirmed_negative" && !row.issue
  ))
  const notableSafetyRows = packet.safety.rows.filter((row) => !negativeSafetyRows.includes(row))

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

      <div className="mt-2 space-y-2 border-t border-border/50 pt-2">
        {clinicalContextFacts.length > 0 ? (
          <dl
            aria-label="Clinical context"
            data-review-clinical-context="true"
            className="flex flex-wrap gap-x-5 gap-y-1"
          >
            {clinicalContextFacts.map((fact) => <ReviewFactItem key={fact.key} fact={fact} inline />)}
          </dl>
        ) : null}
        {priorTreatmentFacts.length > 0 ? (
          <dl aria-label="Previous treatment" className="space-y-1">
            {priorTreatmentFacts.map((fact) => <ReviewFactItem key={fact.key} fact={fact} inline />)}
          </dl>
        ) : null}
        {negativeScreeningFacts.length > 0 ? (
          <dl
            aria-label="Patient-reported negative screening"
            data-review-negative-screening="true"
            className="flex flex-wrap gap-x-4 gap-y-1"
          >
            {negativeScreeningFacts.map((fact) => <ReviewFactItem key={fact.key} fact={fact} inline />)}
          </dl>
        ) : null}
        {medicationFact ? (
          <dl>
            <ReviewFactItem fact={medicationFact} prominent />
          </dl>
        ) : null}
        {regimenFact ? (
          <dl>
            <ReviewFactItem fact={regimenFact} />
          </dl>
        ) : null}
        {adjacentFacts.length > 0 ? (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {adjacentFacts.map((fact) => <ReviewFactItem key={fact.key} fact={fact} />)}
          </dl>
        ) : null}
        {remainingFacts.length > 0 ? (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {remainingFacts.map((fact) => <ReviewFactItem key={fact.key} fact={fact} />)}
          </dl>
        ) : null}
      </div>

      {isRepeatPrescription && packet.safety.rows.length > 0 ? (
        <section
          aria-label="Patient-reported safety"
          data-review-safety-context="true"
          className="mt-3 border-t border-border/50 pt-2"
        >
          <p className="mb-2 text-xs font-semibold text-foreground">Patient-reported safety</p>
          {negativeSafetyRows.length > 0 ? (
            <dl
              aria-label="Patient-reported negative screening"
              data-review-negative-screening="true"
              className="mb-2 flex flex-wrap gap-x-4 gap-y-1"
            >
              {negativeSafetyRows.map((row) => (
                <div key={row.key} className="min-w-0" data-review-safety-row={row.key} data-review-safety-state={row.state}>
                  <dt className="sr-only">{row.label}</dt>
                  <dd className="whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{row.display}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {notableSafetyRows.length > 0 ? (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              {notableSafetyRows.map((row) => (
                <div key={row.key} className="min-w-0" data-review-safety-row={row.key} data-review-safety-state={row.state}>
                  <dt className="text-xs font-medium text-muted-foreground">{row.label}</dt>
                  <dd className={cn(
                    "whitespace-pre-wrap break-words text-[13px] leading-5",
                    row.state === "confirmed_negative" ? "text-muted-foreground" :
                      row.state === "confirmed_positive" ? "font-semibold text-foreground" : "font-medium text-warning",
                  )}>
                    {row.display}
                    {row.issue ? <span className="block text-xs text-warning">{row.issue}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ) : null}

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
          hideRecordedPrescriptionInfo={packet.fulfilment.status === "recorded"}
          draftNoteOpen={draftNoteOpen}
          onDraftNoteOpenChange={onDraftNoteOpenChange}
          draftNoteValue={doctorNotes}
          draftNoteTextareaRef={notesRef}
          onDraftNoteChange={(value) => {
            setDoctorNotes(value)
          }}
          onDraftNoteSave={handleSaveNotes}
          isDraftNoteSaving={isAutoSaving}
          draftNoteDirty={noteDirty}
          draftNoteSavedAt={savedAt}
          draftNoteSaved={noteSaved}
          draftNoteSaveError={autoSaveError}
          draftNoteReadOnly={isPending}
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
