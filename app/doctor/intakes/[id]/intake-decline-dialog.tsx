"use client"

import { Loader2 } from "lucide-react"

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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { DeclineReasonCode } from "@/types/db"

import { DECLINE_REASONS } from "./intake-helpers"

interface IntakeDeclineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  declineReasonCode: DeclineReasonCode
  onDeclineReasonCodeChange: (code: DeclineReasonCode) => void
  declineReason: string
  onDeclineReasonChange: (reason: string) => void
  onConfirmDecline: () => void
  isPending: boolean
}

export function IntakeDeclineDialog({
  open,
  onOpenChange,
  declineReasonCode,
  onDeclineReasonCodeChange,
  declineReason,
  onDeclineReasonChange,
  onConfirmDecline,
  isPending,
}: IntakeDeclineDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Decline Request</AlertDialogTitle>
          <AlertDialogDescription>
            Please select a reason and provide details for declining this request.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={declineReasonCode} onValueChange={(v) => onDeclineReasonCodeChange(v as DeclineReasonCode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DECLINE_REASONS.map((r) => (
                  <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Details</Label>
            <Textarea
              placeholder="Provide additional details..."
              value={declineReason}
              onChange={(e) => onDeclineReasonChange(e.target.value)}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirmDecline()
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
