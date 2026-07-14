"use client"

import { FileText, Loader2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { requestMoreInfoAction } from "@/app/actions/request-more-info"
import { ClinicalSummary } from "@/components/doctor/clinical-summary"
import { PatientTimeline } from "@/components/doctor/patient-timeline"
import { RenewalLink } from "@/components/doctor/renewal-link"
import { BatchReviewAttestation } from "@/components/doctor/review/batch-review-attestation"
import { IntakeActionButtons } from "@/components/doctor/review/intake-action-buttons"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { IntakeSecondaryDisclosure } from "@/components/doctor/review/intake-secondary-disclosure"
import { PatientMessageThread } from "@/components/doctor/review/patient-message-thread"
import { RequestInfoCard } from "@/components/doctor/review/request-info-card"
import { ReviewBlockersStrip } from "@/components/doctor/review/review-blockers-strip"
import { SafetyFlagsCard } from "@/components/doctor/review/safety-flags-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { isBatchReviewEligible } from "@/lib/clinical/batch-review-policy"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { buildReviewPacket } from "@/lib/clinical/review-packet"
import { isPrescribingServiceRequest } from "@/lib/doctor/service-types"
import { useDoctorShortcuts } from "@/lib/hooks/use-doctor-shortcuts"
import { cn } from "@/lib/utils"

interface IntakeReviewCockpitProps {
  className?: string
  onBatchReviewResolved?: (intakeId: string) => void
}

const MED_CERT_SYMPTOM_DETAIL_REQUEST =
  "Could you please add a brief description of your symptoms and when they started? I need that before I can safely issue a medical certificate."

/**
 * IntakeReviewCockpit, single-column edition.
 *
 * 2026-05-26: collapses the Request/Notes/History tabs into one
 * scrollable column. Patient safety context is owned by the fixed parent
 * header; blockers, one request packet, optional patient messages, and
 * certificate delivery status share this surface. The unified patient
 * timeline stays inside the bottom disclosure; Cmd+N opens and focuses the
 * packet's draft note.
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
  onBatchReviewResolved,
}: IntakeReviewCockpitProps) {
  const review = useIntakeReview()
  const { data, intake, answers, service } = review
  const router = useRouter()

  const [disclosureOpen, setDisclosureOpen] = useState(false)
  const [draftNoteOpen, setDraftNoteOpen] = useState(false)
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
        scriptSent: intake.script_sent,
      }),
    [
      intake.category,
      intake.subtype,
      intake.patient?.full_name,
      intake.patient?.date_of_birth,
      intake.patient?.sex,
      intake.requires_live_consult,
      intake.script_sent,
      intake.risk_tier,
      service?.type,
      answers,
    ],
  )
  const reviewPacket = useMemo(
    () =>
      buildReviewPacket({
        category: intake.category,
        serviceType: service?.type,
        subtype: intake.subtype,
        answers: answers ?? {},
        intake: {
          status: intake.status,
          script_sent: intake.script_sent,
          script_sent_at: intake.script_sent_at,
        },
        summary: caseSummary,
      }),
    [
      answers,
      caseSummary,
      intake.category,
      intake.script_sent,
      intake.script_sent_at,
      intake.status,
      intake.subtype,
      service?.type,
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

  const isPendingBatchReview = isBatchReviewEligible(intake)
  const decisionActions = isPendingBatchReview && onBatchReviewResolved ? (
    <BatchReviewAttestation intake={intake} onResolved={onBatchReviewResolved} />
  ) : (
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
      if (service?.type === "med_certs") {
        review.handleMedCertApprove()
      } else if (isPrescribingServiceRequest(service?.type, intake.subtype)) {
        if (hasPrescriptionIntent) review.handleOpenParchmentPrescribe()
      } else {
        review.handleStatusChange("approved")
      }
    },
    onDecline: () => {
      if (["approved", "declined", "completed"].includes(intake.status)) return
      review.setShowDeclineDialog(true)
    },
    onNote: () => {
      setDraftNoteOpen(true)
      requestAnimationFrame(() => review.notesRef.current?.focus())
    },
    onEscape: () => {
      if (review.showDeclineDialog) review.setShowDeclineDialog(false)
    },
  })

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <div
        className="flex min-h-0 flex-1 flex-col motion-safe:animate-[review-body-in_240ms_cubic-bezier(0.16,1,0.3,1)]"
        data-review-body-transition
      >
        {/* Sticky top: always-on clinical blockers. Compact density. */}
        <div className="flex flex-col gap-3 pb-3">
          <ReviewBlockersStrip />
          <SafetyFlagsCard />
        </div>

        {/* Scrollable middle: single column, no tabs. */}
        <div
          className="min-h-0 flex-1 overflow-y-auto pr-1 scroll-pb-32"
        >
          <div className="space-y-3 pb-8">
            {data.renewalMatch ? (
              <div className="flex items-center justify-end">
                <RenewalLink
                  renewalMatch={data.renewalMatch}
                  patientId={intake.patient.id}
                />
              </div>
            ) : null}
            <RequestInfoCard
              packet={reviewPacket}
              summary={caseSummary}
              draftNoteOpen={draftNoteOpen}
              onDraftNoteOpenChange={setDraftNoteOpen}
            />
            {messageCount > 0 ? (
              <PatientMessageThread
                messages={data.patientMessages ?? []}
                infoRequestMessage={intake.info_request_message}
                infoRequestedAt={intake.info_requested_at}
                status={intake.status}
              />
            ) : null}
            <CertificateDeliveryCard />

            <IntakeSecondaryDisclosure
              priorRequestCount={data.previousIntakes?.length ?? 0}
              noteCount={data.patientNotes?.length ?? 0}
              open={disclosureOpen}
              onOpenChange={setDisclosureOpen}
            >
              <section aria-label="Full intake answers">
                <ClinicalSummary
                  answers={answers}
                  consultSubtype={intake.category === "consult" && intake.subtype
                    ? intake.subtype
                    : undefined}
                  className="border-0 p-0 shadow-none"
                />
              </section>
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
      <div className="sticky bottom-0 z-30 mt-3 shrink-0 shadow-lg shadow-primary/[0.06]" data-action-rail-shell>
        {decisionActions}
      </div>
    </div>
  )
}
