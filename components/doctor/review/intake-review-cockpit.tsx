"use client"

import { FileText, Loader2, RefreshCw } from "lucide-react"

import { PatientDecisionStrip } from "@/components/doctor/patient-decision-strip"
import { PatientTimeline } from "@/components/doctor/patient-timeline"
import { ClinicalNotesEditor } from "@/components/doctor/review/clinical-notes-editor"
import { IntakeActionButtons } from "@/components/doctor/review/intake-action-buttons"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { PatientMessageThread } from "@/components/doctor/review/patient-message-thread"
import { RequestInfoCard } from "@/components/doctor/review/request-info-card"
import { ReviewBlockersStrip } from "@/components/doctor/review/review-blockers-strip"
import { SafetyFlagsCard } from "@/components/doctor/review/safety-flags-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface IntakeReviewCockpitProps {
  className?: string
  showDecisionStrip?: boolean
}

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
    <div className="rounded-xl border bg-card p-4 space-y-3">
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
      {data.certificate.email_opened_at && (
        <p className="text-xs text-muted-foreground">
          Opened {new Date(data.certificate.email_opened_at).toLocaleString("en-AU", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      )}
    </div>
  )
}

export function IntakeReviewCockpit({
  className,
  showDecisionStrip = true,
}: IntakeReviewCockpitProps) {
  const {
    data,
    intake,
    answers,
    service,
    doctorNotes,
  } = useIntakeReview()

  return (
    <div className={cn("space-y-4", className)}>
      {showDecisionStrip && (
        <PatientDecisionStrip
          intake={intake}
          answers={answers}
          previousIntakes={data.previousIntakes ?? []}
          service={service}
          doctorNotes={doctorNotes}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] xl:items-start">
        <div className="min-w-0 space-y-4">
          <RequestInfoCard compact hideFullAnswers />
          <PatientMessageThread
            messages={data.patientMessages ?? []}
            infoRequestMessage={intake.info_request_message}
            infoRequestedAt={intake.info_requested_at}
            status={intake.status}
          />
          <SafetyFlagsCard />
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-0">
          <ReviewBlockersStrip />
          <ClinicalNotesEditor />
          <IntakeActionButtons />
          <CertificateDeliveryCard />
          <PatientTimeline
            requests={data.previousIntakes ?? []}
            notes={data.patientNotes ?? []}
            compact
            maxItems={4}
            title="Patient timeline"
            emptyLabel="No previous patient activity."
          />
        </aside>
      </div>
    </div>
  )
}
