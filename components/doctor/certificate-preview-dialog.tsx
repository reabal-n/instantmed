"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle,
  Loader2,
  FileText,
  Calendar,
  User,
  Stethoscope,
  Edit3,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface CertificatePreviewData {
  patientName: string
  patientDob: string | null
  certificateType: "work" | "study" | "carer"
  startDate: string
  endDate: string
  medicalReason: string
  doctorName: string
  providerNumber: string
  consultDate: string
}

interface CertificatePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: CertificatePreviewData
  onConfirm: (editedData: CertificatePreviewData) => void
  isPending: boolean
}

const CERT_TYPE_LABELS: Record<string, string> = {
  work: "Work / Sick Leave",
  study: "University / Study",
  carer: "Carer's Certificate",
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function calculateDuration(start: string, end: string): number {
  const s = new Date(start + "T00:00:00")
  const e = new Date(end + "T00:00:00")
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export function CertificatePreviewDialog({
  open,
  onOpenChange,
  data,
  onConfirm,
  isPending,
}: CertificatePreviewDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<CertificatePreviewData>(data)
  const [dateError, setDateError] = useState<string | null>(null)

  // Reset state when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setEditedData(data)
      setIsEditing(false)
      setDateError(null)
    }
    onOpenChange(open)
  }

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    const updated = { ...editedData, [field]: value }
    setEditedData(updated)

    // Validate dates
    if (updated.startDate && updated.endDate) {
      const start = new Date(updated.startDate)
      const end = new Date(updated.endDate)
      if (end < start) {
        setDateError("End date cannot be before start date")
      } else {
        const days = calculateDuration(updated.startDate, updated.endDate)
        if (days > 30) {
          setDateError("Certificate duration cannot exceed 30 days")
        } else {
          setDateError(null)
        }
      }
    }
  }

  const handleConfirm = () => {
    if (dateError) return
    onConfirm(editedData)
  }

  const duration = editedData.startDate && editedData.endDate
    ? calculateDuration(editedData.startDate, editedData.endDate)
    : null

  const hasEdits = (
    editedData.startDate !== data.startDate ||
    editedData.endDate !== data.endDate ||
    editedData.medicalReason !== data.medicalReason
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-primary" />
            Certificate Preview
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Review the certificate details below before sending to the patient.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* Certificate Preview Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Certificate Type Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-medium">
              <FileText className="h-3 w-3 mr-1" />
              Medical Certificate
            </Badge>
            <Badge variant="outline" className="text-xs">
              {CERT_TYPE_LABELS[editedData.certificateType] || editedData.certificateType}
            </Badge>
          </div>

          {/* Patient Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <User className="h-3 w-3" />
              Patient
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
                <p className="text-xs text-muted-foreground mb-0.5">Name</p>
                <p className="text-sm font-medium">{editedData.patientName}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
                <p className="text-xs text-muted-foreground mb-0.5">Date of Birth</p>
                <p className="text-sm font-medium">
                  {editedData.patientDob
                    ? new Date(editedData.patientDob + "T00:00:00").toLocaleDateString("en-AU")
                    : "Not provided"}
                </p>
              </div>
            </div>
          </div>

          {/* Certificate Dates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Calendar className="h-3 w-3" />
                Certificate Period
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="h-3 w-3" />
                {isEditing ? "Done" : "Edit"}
              </Button>
            </div>

            {isEditing ? (
              <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Date</Label>
                    <Input
                      type="date"
                      value={editedData.startDate}
                      onChange={(e) => handleDateChange("startDate", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Date</Label>
                    <Input
                      type="date"
                      value={editedData.endDate}
                      onChange={(e) => handleDateChange("endDate", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                {dateError && (
                  <p className="text-xs text-destructive">{dateError}</p>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Medical Reason</Label>
                  <Textarea
                    value={editedData.medicalReason}
                    onChange={(e) => setEditedData({ ...editedData, medicalReason: e.target.value })}
                    className="min-h-[60px] text-sm resize-none"
                    placeholder="e.g., Medical Illness"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-0.5">From</p>
                    <p className="text-sm font-medium">{formatDisplayDate(editedData.startDate)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-0.5">To</p>
                    <p className="text-sm font-medium">{formatDisplayDate(editedData.endDate)}</p>
                  </div>
                </div>
                {duration !== null && (
                  <p className="text-xs text-muted-foreground pl-1">
                    Duration: <span className="font-medium text-foreground">{duration} day{duration !== 1 ? "s" : ""}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Medical Reason (read-only unless editing) */}
          {!isEditing && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Stethoscope className="h-3 w-3" />
                Medical Reason
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
                <p className="text-sm">{editedData.medicalReason || "Medical Illness"}</p>
              </div>
            </div>
          )}

          {/* Doctor Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Stethoscope className="h-3 w-3" />
              Issuing Doctor
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
                <p className="text-xs text-muted-foreground mb-0.5">Name</p>
                <p className="text-sm font-medium">{editedData.doctorName}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
                <p className="text-xs text-muted-foreground mb-0.5">Provider #</p>
                <p className="text-sm font-medium font-mono">{editedData.providerNumber}</p>
              </div>
            </div>
          </div>

          {/* Edit indicator */}
          {hasEdits && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <Edit3 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-[13px] font-medium text-amber-700 dark:text-amber-300">
                You&apos;ve made edits — changes will be recorded in the audit trail.
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <DialogFooter className="px-6 py-4 gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
            className="text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || !!dateError}
            className={cn(
              "text-sm gap-2",
              "bg-emerald-600 hover:bg-emerald-700 text-white",
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Confirm & Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
