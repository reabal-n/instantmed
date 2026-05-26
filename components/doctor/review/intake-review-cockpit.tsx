"use client"

import { FileText, Loader2, RefreshCw } from "lucide-react"
import { useMemo, useState } from "react"

import { PatientDecisionStrip } from "@/components/doctor/patient-decision-strip"
import { PatientTimeline } from "@/components/doctor/patient-timeline"
import { ClinicalNotesEditor } from "@/components/doctor/review/clinical-notes-editor"
import { IntakeActionButtons } from "@/components/doctor/review/intake-action-buttons"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { IntakeSecondaryDisclosure } from "@/components/doctor/review/intake-secondary-disclosure"
import { PatientMessageThread } from "@/components/doctor/review/patient-message-thread"
import { PrescriptionRecommendationCard } from "@/components/doctor/review/prescription-recommendation-card"
import { RequestInfoCard } from "@/components/doctor/review/request-info-card"
import { ReviewBlockersStrip } from "@/components/doctor/review/review-blockers-strip"
import { SafetyFlagsCard } from "@/components/doctor/review/safety-flags-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { useDoctorShortcuts } from "@/lib/hooks/use-doctor-shortcuts"
import { cn } from "@/lib/utils"

interface IntakeReviewCockpitProps {
  className?: string
  showDecisionStrip?: boolean
}

/**
 * IntakeReviewCockpit, single-column edition.
 *
 * 2026-05-26: collapses the Request/Notes/History tabs into one
 * scrollable column. The patient decision strip, blockers, safety
 * flags, request facts, optional patient messages, the recommended
 * prescription card, and certificate delivery status all live above
 * the fold. The clinical notes editor and the unified patient
 * timeline live inside a bottom "Show full intake" disclosure that
 * is closed by default; Cmd+N opens the disclosure first and then
 * focuses the notes textarea so notes are always reachable.
 */

function CertificateDeliveryCard() {
  const {
    data,
    intake,
    isViewingCert,
    isResending,
    handleViewCertificate,
    handleResend,
  } = useIntakeReview()

  if (!data.certificate || !["approved", "completed"].includes(intake.status)) return null

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="font-medium text-foreground">Certificate delivery</span>
          {data.certificate.email_opened_at ? (
            <Badge className="bg-success-light text-success border-success-border text-xs">
              Opened
            </Badge>
          ) : data.certificate.email_sent_at ? (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Sent
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Pending
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={isViewingCert || !handleViewCertificate}
          onClick={handleViewCertificate}
        >
          {isViewingCert ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <FileText className="h-3.5 w-3.5 mr-1" />
          )}
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={isResending || !handleResend || (data.certificate.resend_count ?? 0) >= 3}
          onClick={handleResend}
          title={(data.certificate.resend_count ?? 0) >= 3 ? "Maximum resends reached" : undefined}
        >
          {isResending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          )}
          {(data.certificate.resend_count ?? 0) > 0
            ? `Resent (${data.certificate.resend_count})`
            : "Resend"}
        </Button>
      </div>
      {data.certificate.email_opened_at ? (
        <p className="text-xs text-muted-foreground">
          Opened {new Date(data.certificate.email_opened_at).toLocaleString("en-AU", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      ) : null}
    </div>
  )
}

export function IntakeReviewCockpit({
  className,
  showDecisionStrip = true,
}: IntakeReviewCockpitProps) {
  const review = useIntakeReview()
  const { data, intake, answers, service } = review

  const [disclosureOpen, setDisclosureOpen] = useState(false)

  const messageCount = (data.patientMessages?.length ?? 0) +
    (intake.info_request_message ? 1 : 0)

  const caseSummary = useMemo(
    () =>
      buildClinicalCaseSummary({
        category: intake.category,
        subtype: intake.subtype,
        serviceType: service?.type,
        patientName: intake.patient?.full_name,
        answers: answers ?? {},
        riskTier: intake.risk_tier,
        requiresLiveConsult: intake.requires_live_consult,
      }),
    [
      intake.category,
      intake.subtype,
      intake.patient?.full_name,
      intake.requires_live_consult,
      intake.risk_tier,
      service?.type,
      answers,
    ],
  )
  const hasPrescriptionIntent = Boolean(caseSummary.prescriptionIntent)

  useDoctorShortcuts({
    disabled: review.isPending,
    onApprove: () => {
      if (intake.status !== "paid" && intake.status !== "in_review") return
      if (
        intake.category === "consult" &&
        ["ed", "hair_loss"].includes(intake.subtype || "") &&
        hasPrescriptionIntent
      ) {
        review.handleApproveAndOpenParchment()
      } else if (service?.type === "med_certs") {
        review.handleMedCertApprove()
      } else if (service?.type === "repeat_rx" || service?.type === "common_scripts") {
        review.handleStatusChange("awaiting_script")
      } else {
        review.handleStatusChange("approved")
      }
    },
    onDecline: () => {
      if (["approved", "declined", "completed"].includes(intake.status)) return
      review.setShowDeclineDialog(true)
    },
    onNote: () => {
      // Open the disclosure BEFORE focusing notes so the textarea exists in the DOM.
      setDisclosureOpen(true)
      setTimeout(() => review.notesRef.current?.focus(), 60)
    },
    onEscape: () => {
      if (review.showDeclineDialog) review.setShowDeclineDialog(false)
    },
  })

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {/* Sticky top: patient header + always-on blockers. Compact density. */}
      <div className="flex flex-col gap-3 pb-3">
        {showDecisionStrip ? (
          <PatientDecisionStrip
            intake={intake}
            answers={answers}
            previousIntakes={data.previousIntakes ?? []}
            service={service}
            compact
          />
        ) : null}
        <ReviewBlockersStrip />
        <SafetyFlagsCard />
      </div>

      {/* Scrollable middle: single column, no tabs. */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-3">
          <RequestInfoCard compact hideFullAnswers hidePrescriptionIntent />
          {messageCount > 0 ? (
            <PatientMessageThread
              messages={data.patientMessages ?? []}
              infoRequestMessage={intake.info_request_message}
              infoRequestedAt={intake.info_requested_at}
              status={intake.status}
            />
          ) : null}
          <PrescriptionRecommendationCard intent={caseSummary.prescriptionIntent} />
          <CertificateDeliveryCard />

          <IntakeSecondaryDisclosure
            priorRequestCount={data.previousIntakes?.length ?? 0}
            noteCount={data.patientNotes?.length ?? 0}
            open={disclosureOpen}
            onOpenChange={setDisclosureOpen}
          >
            <ClinicalNotesEditor />
            <PatientTimeline
              requests={data.previousIntakes ?? []}
              notes={data.patientNotes ?? []}
              compact
              maxItems={20}
              title="Patient history"
              emptyLabel="No previous patient activity."
            />
          </IntakeSecondaryDisclosure>
        </div>
      </div>

      {/* Sticky bottom: action bar. Always visible. */}
      <div className="mt-3 shrink-0 border-t border-border/40 pt-3">
        <IntakeActionButtons />
      </div>
    </div>
  )
}
