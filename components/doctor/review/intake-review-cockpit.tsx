"use client"

import { AlertTriangle, FileText, Loader2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { requestMoreInfoAction } from "@/app/actions/request-more-info"
import { PatientDecisionStrip } from "@/components/doctor/patient-decision-strip"
import { PatientTimeline } from "@/components/doctor/patient-timeline"
import { RenewalLink } from "@/components/doctor/renewal-link"
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
  showThinMedCertWarning?: boolean
}

const MED_CERT_SYMPTOM_DETAIL_REQUEST =
  "Could you please add a brief description of your symptoms and when they started? I need that before I can safely issue a medical certificate."

/**
 * IntakeReviewCockpit, single-column edition.
 *
 * 2026-05-26: collapses the Request/Notes/History tabs into one
 * scrollable column. The patient decision strip, blockers, safety
 * flags, request facts, optional patient messages, the visible draft
 * note, the recommended prescription card, and certificate delivery
 * status all live above the fold. The unified patient timeline stays
 * inside a bottom "Show full intake" disclosure; Cmd+N focuses the
 * visible note instead of opening a hidden duplicate editor.
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
  showThinMedCertWarning = true,
}: IntakeReviewCockpitProps) {
  const review = useIntakeReview()
  const { data, intake, answers, service } = review
  const router = useRouter()

  const [disclosureOpen, setDisclosureOpen] = useState(false)
  const [isRequestingClinicalDetail, startRequestingClinicalDetail] = useTransition()

  const messageCount = (data.patientMessages?.length ?? 0) +
    (intake.info_request_message ? 1 : 0)

  const caseSummary = useMemo(
    () =>
      buildClinicalCaseSummary({
        category: intake.category,
        subtype: intake.subtype,
        serviceType: service?.type,
        patientName: intake.patient?.full_name,
        patientDateOfBirth: intake.patient?.date_of_birth ?? null,
        patientSex: intake.patient?.sex ?? null,
        answers: answers ?? {},
        riskTier: intake.risk_tier,
        requiresLiveConsult: intake.requires_live_consult,
      }),
    [
      intake.category,
      intake.subtype,
      intake.patient?.full_name,
      intake.patient?.date_of_birth,
      intake.patient?.sex,
      intake.requires_live_consult,
      intake.risk_tier,
      service?.type,
      answers,
    ],
  )
  const hasPrescriptionIntent = Boolean(caseSummary.prescriptionIntent)
  const symptomDetail =
    typeof answers?.symptomDetails === "string"
      ? answers.symptomDetails
      : typeof answers?.symptom_details === "string"
        ? answers.symptom_details
        : ""
  const hasThinMedCertIntake = service?.type === "med_certs" && symptomDetail.trim().length === 0
  const canRequestClinicalDetail = hasThinMedCertIntake && ["paid", "in_review"].includes(intake.status)
  const handleRequestClinicalDetail = useCallback(() => {
    if (!canRequestClinicalDetail) return

    startRequestingClinicalDetail(async () => {
      const result = await requestMoreInfoAction(
        intake.id,
        "symptom_clarification",
        MED_CERT_SYMPTOM_DETAIL_REQUEST,
      )

      if (result.success) {
        toast.success("Detail request sent to patient")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to request detail")
      }
    })
  }, [canRequestClinicalDetail, intake.id, router])

  const decisionActions = (
    <IntakeActionButtons
      placement="bottom"
      requiresClinicalDetail={canRequestClinicalDetail}
      onRequestClinicalDetail={handleRequestClinicalDetail}
      isRequestingClinicalDetail={isRequestingClinicalDetail}
    />
  )

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
      setTimeout(() => review.notesRef.current?.focus(), 60)
    },
    onEscape: () => {
      if (review.showDeclineDialog) review.setShowDeclineDialog(false)
    },
  })

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div
        className="flex min-h-0 flex-1 flex-col motion-safe:animate-[review-body-in_200ms_cubic-bezier(0.16,1,0.3,1)]"
        data-review-body-transition
      >
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
        <div
          className="min-h-0 flex-1 overflow-y-auto pr-1"
        >
          <div className="space-y-3">
            {data.renewalMatch ? (
              <div className="flex items-center justify-end">
                <RenewalLink
                  renewalMatch={data.renewalMatch}
                  patientId={intake.patient.id}
                />
              </div>
            ) : null}
            <section className="min-h-[116px] rounded-xl border border-border/50 bg-card p-4 shadow-sm shadow-primary/[0.04]">
              <p className="text-xs font-medium text-muted-foreground">Reason for visit</p>
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-foreground">
                {caseSummary.patientStory}
              </p>
              {showThinMedCertWarning && hasThinMedCertIntake ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-slate-600 dark:text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <p className="text-xs font-medium leading-relaxed">
                    No symptoms yet. Ask the patient for detail.
                  </p>
                </div>
              ) : null}
            </section>
            <RequestInfoCard
              compact
              hideFullAnswers
              hidePatientStory
              hidePrescriptionIntent
            />
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
      </div>
      {decisionActions}
    </div>
  )
}
