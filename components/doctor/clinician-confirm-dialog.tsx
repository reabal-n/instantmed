"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ActionType = "approve" | "decline"

interface PatientSummary {
  name?: string
  requestType?: string
  category?: string
}

interface ClinicianConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionType: ActionType
  patientSummary?: PatientSummary
  onConfirm: () => Promise<void>
}

export function ClinicianConfirmDialog({
  open,
  onOpenChange,
  actionType,
  patientSummary,
  onConfirm,
}: ClinicianConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const isApprove = actionType === "approve"

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // Error handling is done by the parent
    } finally {
      setIsLoading(false)
    }
  }

  const Icon = isApprove ? CheckCircle : XCircle
  const iconColor = isApprove ? "text-green-600" : "text-red-600"
  const actionColor = isApprove
    ? "bg-green-600 hover:bg-green-700 text-white"
    : "bg-red-600 hover:bg-red-700 text-white"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", iconColor)} />
            Confirm {isApprove ? "Approval" : "Decline"}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You are about to <strong>{isApprove ? "approve" : "decline"}</strong> this request.
              {!isApprove && " The patient will be notified and may be eligible for a refund."}
            </p>
            
            {patientSummary && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Please verify:
                </div>
                <ul className="list-disc list-inside space-y-1 text-foreground">
                  {patientSummary.name && <li>Patient: {patientSummary.name}</li>}
                  {patientSummary.requestType && <li>Request: {patientSummary.requestType}</li>}
                  {patientSummary.category && <li>Category: {patientSummary.category}</li>}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              This action will be logged for audit purposes.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={isLoading}
            className={cn(actionColor)}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Icon className="mr-2 h-4 w-4" />
                {isApprove ? "Approve Request" : "Decline Request"}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
