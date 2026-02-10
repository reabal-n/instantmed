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
import { Loader2, Calendar, User, FileText, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { IntakeWithDetails, CertReviewData } from "@/types/db"
import { AiReviewSummary } from "@/components/doctor/ai-review-summary"
import { AIDraftsPanel } from "@/components/doctor/ai-drafts-panel"

// Re-export CertReviewData for backward compatibility
export type { CertReviewData } from "@/types/db"

interface CertReviewModalProps {
  open: boolean
  onClose: () => void
  request: IntakeWithDetails | null
  doctorName: string
  onConfirm: (data: CertReviewData) => Promise<void>
}

export function CertReviewModal({
  open,
  onClose,
  request,
  doctorName,
  onConfirm,
}: CertReviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
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

  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!formData.startDate || !formData.endDate) {
      return
    }

    // Validate end date is not before start date
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setValidationError("End date cannot be before start date.")
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(formData)
      onClose()
    } catch {
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
          {/* AI-Generated Drafts Panel */}
          <AIDraftsPanel
            intakeId={request.id}
            onMedCertDataChange={(data) => {
              // Update form with AI-generated data if available
              if (data.startDate && typeof data.startDate === "string") {
                setFormData(prev => ({ ...prev, startDate: data.startDate as string }))
              }
              if (data.endDate && typeof data.endDate === "string") {
                setFormData(prev => ({ ...prev, endDate: data.endDate as string }))
              }
            }}
          />

          {/* AI-Generated Review Summary */}
          <AiReviewSummary
            requestId={request.id}
            requestType="med_cert"
            autoGenerate={true}
          />

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
              <Input
                id="consultDate"
                type="date"
                value={formData.consultDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, consultDate: e.target.value }))}
                required
                startContent={<Calendar className="h-4 w-4 text-muted-foreground" />}
              />
            </div>

            {/* Start Date & End Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  max={formData.endDate || undefined}
                  required
                  startContent={<Calendar className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  min={formData.startDate || undefined}
                  required
                  startContent={<Calendar className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
            </div>

            {/* Date validation error */}
            {validationError && (
              <p className="text-sm text-red-600 font-medium">{validationError}</p>
            )}

            {/* Medical Reason */}
            <div className="space-y-2">
              <Label htmlFor="medicalReason">Medical Reason</Label>
              <Textarea
                id="medicalReason"
                value={formData.medicalReason}
                onChange={(e) => setFormData((prev) => ({ ...prev, medicalReason: e.target.value }))}
                placeholder="Medical Illness"
                className="min-h-[80px]"
                required
              />
            </div>
          </div>

          {/* Certificate Preview Section */}
          {showPreview && (
            <Card className="border-2 border-primary/20 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Certificate Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="border-b pb-3">
                  <h4 className="font-bold text-center text-lg">MEDICAL CERTIFICATE</h4>
                  <p className="text-center text-muted-foreground text-xs mt-1">InstantMed Pty Ltd</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">Patient Name:</span>
                    <p className="font-medium">{patientName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date of Consultation:</span>
                    <p className="font-medium">
                      {formData.consultDate ? new Date(formData.consultDate).toLocaleDateString("en-AU", {
                        day: "numeric", month: "long", year: "numeric"
                      }) : "—"}
                    </p>
                  </div>
                </div>
                
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-muted-foreground mb-1">This is to certify that the above patient was examined and found to be unfit for work/study due to:</p>
                  <p className="font-medium">{formData.medicalReason || "Medical Illness"}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">Period:</span>
                    <p className="font-medium">
                      {formData.startDate && formData.endDate ? (
                        <>
                          {new Date(formData.startDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                          {" — "}
                          {new Date(formData.endDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                          {" ("}
                          {Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}
                          {" days)"}
                        </>
                      ) : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Issued By:</span>
                    <p className="font-medium">{formData.doctorName || "Dr."}</p>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground italic pt-2 border-t">
                  This certificate will include a unique verification code, QR code, and digital signature.
                </p>
              </CardContent>
            </Card>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPreview(!showPreview)}
              disabled={isSubmitting}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? "Hide Preview" : "Preview"}
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
