"use client"

/**
 * Repeat Prescription Checklist
 * 
 * Shows completion checklist for repeat_rx intakes:
 * 1. EMR note drafted (auto-checked based on AI draft status)
 * 2. Script sent via Parchment (interactive checkbox)
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  ClipboardList, 
  FileText, 
  Send, 
  Loader2,
  CheckCircle2,
  Clock,
  User
} from "@/lib/icons"
import { toast } from "sonner"
import { markRepeatScriptSentAction } from "@/app/actions/repeat-prescription"
import type { AIDraft } from "@/app/actions/draft-approval"

interface RepeatPrescriptionChecklistProps {
  intakeId: string
  intakeStatus: string
  aiDrafts: AIDraft[]
  prescriptionSentAt: string | null
  prescriptionSentChannel: string | null
  doctorName?: string
}

export function RepeatPrescriptionChecklist({
  intakeId,
  intakeStatus,
  aiDrafts,
  prescriptionSentAt,
  prescriptionSentChannel,
  doctorName,
}: RepeatPrescriptionChecklistProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isScriptSent, setIsScriptSent] = useState(!!prescriptionSentAt)

  // Check if EMR note is drafted
  const clinicalNoteDraft = aiDrafts.find(
    (d) => d.type === "clinical_note" || d.type === "repeat_rx"
  )
  const hasEMRDraft = !!clinicalNoteDraft
  const emrDraftStatus = clinicalNoteDraft?.status || null
  const isEMRReady = hasEMRDraft && emrDraftStatus === "ready"
  const isEMRApproved = hasEMRDraft && clinicalNoteDraft?.approved_at

  // Determine checklist item states
  const emrChecked = isEMRReady || !!isEMRApproved
  const scriptChecked = isScriptSent

  // Handle script sent toggle
  const handleScriptSentToggle = (checked: boolean) => {
    if (isPending) return

    // Only allow checking (not unchecking) unless admin or within window
    if (!checked && isScriptSent) {
      // For undo, we still call the action which handles the 5-minute window
      startTransition(async () => {
        const result = await markRepeatScriptSentAction(intakeId, false)
        if (result.success) {
          setIsScriptSent(false)
          toast.success("Script sent status undone")
          router.refresh()
        } else {
          toast.error(result.error || "Failed to undo")
        }
      })
      return
    }

    if (checked && !isScriptSent) {
      startTransition(async () => {
        const result = await markRepeatScriptSentAction(intakeId, true, "parchment")
        if (result.success) {
          setIsScriptSent(true)
          toast.success("Script marked as sent - intake completed")
          router.refresh()
        } else {
          toast.error(result.error || "Failed to mark script as sent")
        }
      })
    }
  }

  // Format sent timestamp
  const formatSentTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card className="border-primary/20 bg-primary/5 dark:bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ClipboardList className="h-5 w-5 text-primary" />
          Repeat Prescription Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Item 1: EMR Note Drafted */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/50">
          <Checkbox
            id="emr-drafted"
            checked={emrChecked}
            disabled
            className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
          />
          <div className="flex-1 space-y-1">
            <label
              htmlFor="emr-drafted"
              className="text-sm font-medium leading-none flex items-center gap-2"
            >
              <FileText className="h-4 w-4 text-primary" />
              EMR note drafted
            </label>
            <p className="text-xs text-muted-foreground">
              {!hasEMRDraft && "AI draft not yet generated"}
              {hasEMRDraft && emrDraftStatus === "pending" && "Draft generation in progress..."}
              {hasEMRDraft && emrDraftStatus === "failed" && "Draft generation failed"}
              {isEMRApproved && "Draft approved by clinician"}
              {isEMRReady && !isEMRApproved && "Draft ready for review"}
            </p>
          </div>
          {emrChecked ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Done
            </Badge>
          ) : hasEMRDraft && emrDraftStatus === "pending" ? (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          ) : null}
        </div>

        {/* Item 2: Script Sent via Parchment */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/50">
          <div className="relative">
            {isPending ? (
              <Loader2 className="h-4 w-4 mt-0.5 animate-spin text-primary" />
            ) : (
              <Checkbox
                id="script-sent"
                checked={scriptChecked}
                onCheckedChange={handleScriptSentToggle}
                disabled={isPending || intakeStatus === "completed"}
                className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <label
              htmlFor="script-sent"
              className="text-sm font-medium leading-none flex items-center gap-2 cursor-pointer"
            >
              <Send className="h-4 w-4 text-primary" />
              Script sent via {prescriptionSentChannel || "Parchment"}
            </label>
            {prescriptionSentAt ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Sent {formatSentTime(prescriptionSentAt)}
                {doctorName && (
                  <>
                    <span className="mx-1">•</span>
                    <User className="h-3 w-3" />
                    {doctorName}
                  </>
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Check this after sending the prescription externally
              </p>
            )}
          </div>
          {scriptChecked ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Sent
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
              Pending
            </Badge>
          )}
        </div>

        {/* Completion Status */}
        {intakeStatus === "completed" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Prescription request completed</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
