"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Calendar, User, FileText } from "lucide-react"
import type { RequestWithPatient } from "@/types/db"

interface CertReviewModalProps {
  open: boolean
  onClose: () => void
  request: RequestWithPatient | null
  doctorName: string
  onConfirm: (data: CertReviewData) => Promise<void>
}

export interface CertReviewData {
  doctorName: string
  consultDate: string // YYYY-MM-DD
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  medicalReason: string
}

export function CertReviewModal({
  open,
  onClose,
  request,
  doctorName,
  onConfirm,
}: CertReviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CertReviewData>({
    doctorName: doctorName || "",
    consultDate: new Date().toISOString().split("T")[0],
    startDate: "",
    endDate: "",
    medicalReason: "Medical Illness",
  })

  // Calculate requested days off from request answers
  const requestedDaysOff = request?.answers?.answers
    ? (() => {
        const answers = request.answers.answers as Record<string, unknown>
        if (answers.duration === "specific" && answers.specificDateFrom && answers.specificDateTo) {
          const start = new Date(answers.specificDateFrom as string)
          const end = new Date(answers.specificDateTo as string)
          const diffTime = Math.abs(end.getTime() - start.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
          return diffDays
        }
        if (typeof answers.duration === "string" && answers.duration !== "specific") {
          const daysMap: Record<string, number> = {
            "1": 1,
            "2": 2,
            "3": 3,
            "4": 4,
            "5": 5,
            "7": 7,
            "14": 14,
          }
          return daysMap[answers.duration] || 1
        }
        return 1
      })()
    : 1

  // Initialize form data when request changes
  useEffect(() => {
    if (request && open) {
      const answers = request.answers?.answers as Record<string, unknown> | undefined
      
      // Set start/end dates from request if available
      let startDate = ""
      let endDate = ""
      
      if (answers?.duration === "specific") {
        if (answers.specificDateFrom) {
          startDate = new Date(answers.specificDateFrom as string).toISOString().split("T")[0]
        }
        if (answers.specificDateTo) {
          endDate = new Date(answers.specificDateTo as string).toISOString().split("T")[0]
        }
      } else {
        // Default to today + requested days
        const today = new Date()
        startDate = today.toISOString().split("T")[0]
        const end = new Date(today)
        end.setDate(end.getDate() + requestedDaysOff - 1)
        endDate = end.toISOString().split("T")[0]
      }

      setFormData({
        doctorName: doctorName || "",
        consultDate: new Date().toISOString().split("T")[0],
        startDate,
        endDate,
        medicalReason: "Medical Illness",
      })
    }
  }, [request, open, doctorName, requestedDaysOff])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.startDate || !formData.endDate) {
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(formData)
      onClose()
    } catch (error) {
      // Error handling is done in parent component via toast notifications
      // Silently fail here - parent component will show error toast
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!request) return null

  const patientName = request.patient?.full_name || "Patient"
  const requestDate = new Date(request.created_at).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Review Medical Certificate
          </DialogTitle>
          <DialogDescription>
            Review and edit the certificate details before sending to the patient.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Information (Read-only) */}
          <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/50">
            <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
              <User className="h-4 w-4" />
              Patient Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Patient Name</Label>
                <p className="text-sm font-medium mt-1">{patientName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Request Date</Label>
                <p className="text-sm font-medium mt-1">{requestDate}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Requested Days Off</Label>
                <p className="text-sm font-medium mt-1">{requestedDaysOff} day{requestedDaysOff !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/80">Certificate Details</h3>

            {/* Doctor Name */}
            <div className="space-y-2">
              <Label htmlFor="doctorName">Doctor Name</Label>
              <Input
                id="doctorName"
                value={formData.doctorName}
                onChange={(e) => setFormData((prev) => ({ ...prev, doctorName: e.target.value }))}
                placeholder="Dr. John Smith"
                required
              />
            </div>

            {/* Consult Date */}
            <div className="space-y-2">
              <Label htmlFor="consultDate">Consult Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="consultDate"
                  type="date"
                  value={formData.consultDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, consultDate: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Start Date & End Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="pl-10"
                    max={formData.endDate || undefined}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="pl-10"
                    min={formData.startDate || undefined}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Medical Reason */}
            <div className="space-y-2">
              <Label htmlFor="medicalReason">Medical Reason</Label>
              <Textarea
                id="medicalReason"
                value={formData.medicalReason}
                onChange={(e) => setFormData((prev) => ({ ...prev, medicalReason: e.target.value }))}
                placeholder="Medical Illness"
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.startDate || !formData.endDate}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm & Send"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
