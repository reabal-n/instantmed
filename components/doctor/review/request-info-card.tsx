"use client"

import { CheckCircle, Clock, FileText } from "lucide-react"
import type { ReactNode } from "react"

import { ClinicalCaseReview } from "@/components/doctor/clinical-case-review"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { getQueueEnteredAt } from "@/lib/doctor/queue-utils"
import { formatServiceType } from "@/lib/format/intake"
import { cn } from "@/lib/utils"

interface RequestInfoCardProps {
  compact?: boolean
  hideFullAnswers?: boolean
  hidePatientStory?: boolean
  actionSlot?: ReactNode
  /**
   * Suppress the inline Parchment handoff block. The intake-review cockpit
   * sets this so the canonical PrescriptionRecommendationCard does not
   * double-render alongside the legacy inline handoff section.
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
  hidePatientStory = false,
  actionSlot,
  hidePrescriptionIntent = false,
}: RequestInfoCardProps) {
  const {
    data,
    intake,
    service,
    answers,
    formatDate,
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
  const submittedAt = intake.submitted_at ?? intake.created_at
  const queueEnteredAt = getQueueEnteredAt(intake)
  const isMedCert = service?.type === "med_certs"
  const showCompactRequestHeader = !(compact && hideFullAnswers && hidePatientStory)
  const splitCompactReview = compact && hideFullAnswers && hidePatientStory
  const doctorSignOffLabel = [
    data.reviewingClinician?.fullName,
    data.reviewingClinician?.ahpraNumber,
  ].filter(Boolean).join(" · ") || null

  return (
    <section
      aria-label="Case summary"
      className={cn(
        splitCompactReview
          ? "space-y-3"
          : "rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04]",
        !splitCompactReview && (compact ? "p-4" : "p-5 sm:p-6"),
      )}
    >
      <div className="space-y-4">
        {showCompactRequestHeader ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
              {service?.name || formatServiceType(service?.type || "")}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Submitted: {formatDate(submittedAt)}
            </div>
            {(intake.payment_status === "paid" || intake.paid_at) && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                Paid: {intake.paid_at ? formatDate(queueEnteredAt) : "time missing"}
              </div>
            )}
            </div>
          </div>
        ) : null}

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
          hidePatientStory={hidePatientStory}
          hideTitle={compact}
          hideRecommendedPlan={compact || isMedCert}
          hidePrescriptionIntent={hidePrescriptionIntent}
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
        {actionSlot ? (
          <div className="border-t border-border/60 pt-3">
            {actionSlot}
          </div>
        ) : null}
      </div>
    </section>
  )
}
