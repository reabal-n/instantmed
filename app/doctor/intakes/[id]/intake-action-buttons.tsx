"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  CheckCircle,
  XCircle,
  CreditCard,
  FileText,
  Loader2,
  Send,
  Mail,
} from "lucide-react"
import type { IntakeStatus } from "@/types/db"

interface IntakeActionButtonsProps {
  serviceType: string | undefined
  intakeStatus: string
  intakeCategory: string | null
  paymentStatus: string | null
  isPending: boolean
  isLoadingPreview: boolean
  onMedCertApprove: () => void
  onStatusChange: (status: IntakeStatus) => void
  onShowDeclineDialog: () => void
  onShowScriptDialog: () => void
  onShowRefundDialog: () => void
  onResendCertificate: () => void
  onRegenerateCertificate: () => void
}

export function IntakeActionButtons({
  serviceType,
  intakeStatus,
  intakeCategory,
  paymentStatus,
  isPending,
  isLoadingPreview,
  onMedCertApprove,
  onStatusChange,
  onShowDeclineDialog,
  onShowScriptDialog,
  onShowRefundDialog,
  onResendCertificate,
  onRegenerateCertificate,
}: IntakeActionButtonsProps) {
  return (
    <Card>
      <CardContent className="px-4 py-4">
        <div className="flex flex-wrap gap-3">
          {/* For med certs - preview then approve: shows preview dialog first */}
          {serviceType === "med_certs" && ["paid", "in_review"].includes(intakeStatus) && (
            <Button onClick={onMedCertApprove} className="bg-emerald-600 hover:bg-emerald-700" disabled={isPending || isLoadingPreview}>
              {(isPending || isLoadingPreview) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              {isLoadingPreview ? "Loading Preview..." : isPending ? "Generating Certificate..." : "Approve & Send Certificate"}
            </Button>
          )}

          {/* For repeat scripts - approve then mark sent externally */}
          {(serviceType === "repeat_rx" || serviceType === "common_scripts") && intakeStatus === "paid" && (
            <Button onClick={() => onStatusChange("awaiting_script")} className="bg-primary hover:bg-primary/90" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              {isPending ? "Approving..." : "Approve Script"}
            </Button>
          )}

          {/* Mark script as sent (for awaiting_script status) */}
          {intakeStatus === "awaiting_script" && (
            <Button onClick={onShowScriptDialog} className="bg-blue-600 hover:bg-blue-700">
              <Send className="h-4 w-4 mr-2" />
              Mark Script Sent
            </Button>
          )}

          {/* For consults - approve after call with notes */}
          {serviceType === "consults" && intakeStatus === "paid" && (
            <Button onClick={() => onStatusChange("approved")} className="bg-primary hover:bg-primary/90" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              {isPending ? "Completing..." : "Complete Consultation"}
            </Button>
          )}

          {/* Generic approve for other services */}
          {!["med_certs", "repeat_rx", "common_scripts", "consults"].includes(serviceType || "") && intakeStatus === "paid" && (
            <Button onClick={() => onStatusChange("approved")} className="bg-primary hover:bg-primary/90" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              {isPending ? "Approving..." : "Approve"}
            </Button>
          )}

          {/* Decline */}
          {!["approved", "declined", "completed"].includes(intakeStatus) && (
            <Button variant="destructive" onClick={onShowDeclineDialog} disabled={isPending}>
              <XCircle className="h-4 w-4 mr-2" />
              Decline
            </Button>
          )}

          {/* Refund - show for paid intakes that haven't been refunded */}
          {paymentStatus === "paid" && (
            <Button variant="outline" onClick={onShowRefundDialog} disabled={isPending} className="text-amber-600 border-amber-300 hover:bg-amber-50">
              <CreditCard className="h-4 w-4 mr-2" />
              Issue Refund
            </Button>
          )}

          {/* Resend Certificate - show for approved med certs */}
          {["approved", "completed"].includes(intakeStatus) &&
           (intakeCategory === "medical_certificate" || intakeCategory === "med_certs") && (
            <>
              <Button variant="outline" onClick={onResendCertificate} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                Resend Certificate
              </Button>
              <Button
                variant="outline"
                onClick={onRegenerateCertificate}
                disabled={isPending}
                className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950/20"
              >
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                Regenerate Certificate
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
