"use client"

import { CheckCircle, Loader2, Send,XCircle } from "lucide-react"
import { useMemo } from "react"

import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { Button } from "@/components/ui/button"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { isConsultServiceType, isKnownDoctorServiceType } from "@/lib/doctor/service-types"

export function IntakeActionButtons() {
  const {
    intake,
    service,
    answers,
    isPending,
    isLoadingPreview,
    handleMedCertApprove,
    handleStatusChange,
    handleOpenParchmentPrescribe,
    handleApproveAndOpenParchment,
    setShowDeclineDialog,
  } = useIntakeReview()

  const caseSummary = useMemo(
    () =>
      buildClinicalCaseSummary({
        answers,
        category: intake.category,
        subtype: intake.subtype,
        serviceType: service?.type,
        patientName: intake.patient.full_name,
        riskTier: intake.risk_tier,
        requiresLiveConsult: intake.requires_live_consult,
      }),
    [
      answers,
      intake.category,
      intake.patient.full_name,
      intake.requires_live_consult,
      intake.risk_tier,
      intake.subtype,
      service?.type,
    ],
  )

  const hasPrescriptionIntent = Boolean(caseSummary.prescriptionIntent)
  const isRepeatScript = service?.type === "repeat_rx" || service?.type === "common_scripts"
  const isPrescribingConsult = intake.category === "consult" && ["ed", "hair_loss"].includes(intake.subtype || "")
  const shouldPrescribeFromConsult = isPrescribingConsult && hasPrescriptionIntent

  return (
    <div className="sticky bottom-0 bg-background border-t border-border pt-3 pb-1 flex flex-wrap gap-2">
      {/* Med cert: preview then approve */}
      {service?.type === "med_certs" && ["paid", "in_review"].includes(intake.status) && (
        <Button
          onClick={handleMedCertApprove}
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={isPending || isLoadingPreview}
          size="sm"
        >
          {isPending || isLoadingPreview ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-1.5" />
          )}
          {isLoadingPreview ? "Loading..." : isPending ? "Generating..." : "Approve & Send Certificate"}
        </Button>
      )}

      {/* Repeat scripts: approve and open Parchment when the request is clinically prescribable */}
      {isRepeatScript && intake.status === "paid" && hasPrescriptionIntent && (
        <Button
          onClick={handleApproveAndOpenParchment}
          className="bg-primary hover:bg-primary/90"
          disabled={isPending}
          size="sm"
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
          {isPending ? "Approving..." : "Approve + Prescribe"}
        </Button>
      )}

      {isRepeatScript && intake.status === "paid" && !hasPrescriptionIntent && (
        <Button
          onClick={() => handleStatusChange("awaiting_script")}
          className="bg-primary hover:bg-primary/90"
          disabled={isPending}
          size="sm"
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
          {isPending ? "Approving..." : "Approve Script"}
        </Button>
      )}

      {shouldPrescribeFromConsult && ["paid", "in_review"].includes(intake.status) && (
        <Button
          onClick={handleApproveAndOpenParchment}
          className="bg-primary hover:bg-primary/90"
          disabled={isPending}
          size="sm"
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
          {isPending ? "Approving..." : "Approve + Prescribe"}
        </Button>
      )}

      {hasPrescriptionIntent && intake.status === "awaiting_script" && (
        <Button
          onClick={handleOpenParchmentPrescribe}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={isPending}
          size="sm"
        >
          <Send className="h-4 w-4 mr-1.5" />
          Open Parchment
        </Button>
      )}

      {/* Consults: complete */}
      {isConsultServiceType(service?.type) && intake.status === "paid" && !shouldPrescribeFromConsult && (
        <Button
          onClick={() => handleStatusChange("approved")}
          className="bg-primary hover:bg-primary/90"
          disabled={isPending}
          size="sm"
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
          {isPending ? "Completing..." : "Complete Consultation"}
        </Button>
      )}

      {/* Generic approve */}
      {!isKnownDoctorServiceType(service?.type) &&
        intake.status === "paid" && (
          <Button
            onClick={() => handleStatusChange("approved")}
            className="bg-primary hover:bg-primary/90"
            disabled={isPending}
            size="sm"
          >
            {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
            {isPending ? "Approving..." : "Approve"}
          </Button>
        )}

      {/* Decline */}
      {!["approved", "declined", "completed"].includes(intake.status) && (
        <Button
          variant="destructive"
          onClick={() => setShowDeclineDialog(true)}
          disabled={isPending}
          size="sm"
        >
          <XCircle className="h-4 w-4 mr-1.5" />
          Decline
        </Button>
      )}
    </div>
  )
}
