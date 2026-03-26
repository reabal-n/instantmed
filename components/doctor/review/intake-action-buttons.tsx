"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"

export function IntakeActionButtons() {
  const {
    intake,
    service,
    isPending,
    isLoadingPreview,
    handleMedCertApprove,
    handleStatusChange,
    setShowDeclineDialog,
  } = useIntakeReview()

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

      {/* Repeat scripts: approve */}
      {(service?.type === "repeat_rx" || service?.type === "common_scripts") && intake.status === "paid" && (
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

      {/* Consults: complete */}
      {service?.type === "consults" && intake.status === "paid" && (
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
      {!["med_certs", "repeat_rx", "common_scripts", "consults"].includes(service?.type || "") &&
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
