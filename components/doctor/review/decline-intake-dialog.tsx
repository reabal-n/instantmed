"use client"

import { Loader2 } from "lucide-react"

import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DECLINE_REASONS } from "@/lib/doctor/constants"
import type { DeclineReasonCode } from "@/types/db"

export function DeclineIntakeDialog() {
  const {
    showDeclineDialog,
    setShowDeclineDialog,
    declineReasonCode,
    handleDeclineReasonCodeChange,
    declineReason,
    setDeclineReason,
    handleDecline,
    isPending,
  } = useIntakeReview()

  return (
    <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Decline Request</AlertDialogTitle>
          <AlertDialogDescription>
            Select a reason and provide details. The patient will be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Select
              value={declineReasonCode}
              onValueChange={(v) => handleDeclineReasonCodeChange(v as DeclineReasonCode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DECLINE_REASONS.map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Details</label>
            <Textarea
              placeholder="Provide additional details..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDecline()
            }}
            disabled={!declineReason.trim() || isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Decline Request
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
