"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePickerField } from "@/components/uix"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Save,
  FileText,
  User,
  CheckCircle,
  Loader2,
  Briefcase,
  GraduationCap,
  Heart,
  AlertTriangle,
  Brain,
} from "lucide-react"
import type { IntakeWithDetails, DocumentDraft, GeneratedDocument, MedCertDraftData } from "@/types/db"
import { saveMedCertDraftAction, generateMedCertPdfAndApproveAction } from "./actions"

interface AIDrafts {
  clinicalNote: Record<string, unknown> | null
  medCert: Record<string, unknown> | null
  flags: { requiresReview: boolean; flagReason: string | null } | null
}

interface DocumentBuilderClientProps {
  intake: IntakeWithDetails
  draft: DocumentDraft
  existingDocument: GeneratedDocument | null
  patientAge: number
  hasCredentials: boolean
  aiDrafts?: AIDrafts | null
}

function getSubtypeIcon(subtype: string | null) {
  switch (subtype) {
    case "uni":
      return <GraduationCap className="h-4 w-4" />
    case "carer":
      return <Heart className="h-4 w-4" />
    case "work":
    default:
      return <Briefcase className="h-4 w-4" />
  }
}

function getCertificateTitle(subtype: string | null): string {
  switch (subtype) {
    case "uni":
      return "Medical Certificate - University/School"
    case "carer":
      return "Medical Certificate - Carer's Leave"
    case "work":
    default:
      return "Medical Certificate - Work Absence"
  }
}

export function DocumentBuilderClient({
  intake,
  draft,
  existingDocument,
  patientAge,
  hasCredentials,
  aiDrafts,
}: DocumentBuilderClientProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Get certificate type from answers or default
  const answers = intake.answers?.answers || {}
  const certType = (answers.cert_type as string) || (draft.data as MedCertDraftData)?.certificate_type || "work"

  // Form state
  const draftData = draft.data as MedCertDraftData
  const [formData, setFormData] = useState({
    patientName: draftData?.patient_name || intake.patient.full_name || "",
    dob: draftData?.dob || intake.patient.date_of_birth || "",
    dateFrom: draftData?.date_from || new Date().toISOString().split("T")[0],
    dateTo: draftData?.date_to || new Date().toISOString().split("T")[0],
    reason: draftData?.reason || "",
    workCapacity: draftData?.work_capacity || "Unable to work",
    notes: draftData?.notes || "",
  })

  const handleSaveDraft = async () => {
    setIsSaving(true)
    try {
      const updatedData: MedCertDraftData = {
        patient_name: formData.patientName,
        dob: formData.dob,
        date_from: formData.dateFrom,
        date_to: formData.dateTo,
        reason: formData.reason,
        work_capacity: formData.workCapacity,
        notes: formData.notes,
        doctor_name: "",
        provider_number: "",
        created_date: new Date().toISOString().split("T")[0],
        certificate_type: certType as "work" | "uni" | "carer",
      }
      const result = await saveMedCertDraftAction(draft.id, updatedData)
      if (result.success) {
        setActionMessage({ type: "success", text: "Draft saved" })
        setTimeout(() => setActionMessage(null), 3000)
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to save" })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateAndApprove = async () => {
    setIsGenerating(true)
    setActionMessage(null)

    try {
      // Save current form data to draft before approving — the server action
      // reads dates from the database, so unsaved form edits would be lost.
      const updatedData: MedCertDraftData = {
        patient_name: formData.patientName,
        dob: formData.dob,
        date_from: formData.dateFrom,
        date_to: formData.dateTo,
        reason: formData.reason,
        work_capacity: formData.workCapacity,
        notes: formData.notes,
        doctor_name: "",
        provider_number: "",
        created_date: new Date().toISOString().split("T")[0],
        certificate_type: certType as "work" | "uni" | "carer",
      }
      const saveResult = await saveMedCertDraftAction(draft.id, updatedData)
      if (!saveResult.success) {
        setActionMessage({ type: "error", text: saveResult.error || "Failed to save draft before approval" })
        return
      }

      const result = await generateMedCertPdfAndApproveAction(intake.id, draft.id)

      if (result.success) {
        const emailNote = result.emailStatus === "sent"
          ? "Certificate sent to patient."
          : "Certificate issued. Patient will receive email shortly."
        setActionMessage({ type: "success", text: emailNote })
        setTimeout(() => router.push("/doctor/queue"), 1500)
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to approve" })
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error. Please try again."
      setActionMessage({ type: "error", text: errorMsg })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href={`/doctor/intakes/${intake.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Case
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {getSubtypeIcon(certType)}
          <span>{getCertificateTitle(certType)}</span>
        </div>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-lg ${
            actionMessage.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
          }`}
          data-testid={actionMessage.type === "success" ? "success-message" : "error-message"}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Missing Credentials Warning */}
      {!hasCredentials && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-800 font-medium">
                <span>⚠️ Certificate credentials not configured</span>
              </div>
              <p className="text-sm text-red-700">
                You need to set up your Provider Number and AHPRA Registration before issuing certificates.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href="/doctor/settings/identity">Configure Certificate Identity →</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Review Flags — requires doctor attention */}
      {aiDrafts?.flags?.requiresReview && (
        <Card className="bg-amber-50 border-amber-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">AI Flag: Requires Extra Review</p>
                {aiDrafts.flags.flagReason && (
                  <p className="text-sm text-amber-700 mt-1">{aiDrafts.flags.flagReason}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Clinical Note — pre-consultation summary for doctor */}
      {aiDrafts?.clinicalNote && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-blue-800">
              <Brain className="h-4 w-4" />
              AI Clinical Summary
              <span className="text-xs font-normal text-blue-500 ml-auto">Auto-generated — review before issuing</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-gray-700">
            {Boolean(aiDrafts.clinicalNote.presentingComplaint) && (
              <div>
                <span className="font-medium text-gray-900">Presenting Complaint: </span>
                {String(aiDrafts.clinicalNote.presentingComplaint)}
              </div>
            )}
            {Boolean(aiDrafts.clinicalNote.historyOfPresentIllness) && (
              <div>
                <span className="font-medium text-gray-900">History: </span>
                {String(aiDrafts.clinicalNote.historyOfPresentIllness)}
              </div>
            )}
            {Boolean(aiDrafts.clinicalNote.relevantInformation) && (
              <div>
                <span className="font-medium text-gray-900">Relevant Info: </span>
                {String(aiDrafts.clinicalNote.relevantInformation)}
              </div>
            )}
            {Boolean(aiDrafts.clinicalNote.certificateDetails) && (
              <div>
                <span className="font-medium text-gray-900">Certificate Details: </span>
                {String(aiDrafts.clinicalNote.certificateDetails)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Document Notice */}
      {existingDocument && (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle className="h-5 w-5" />
              <span>Certificate already generated</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patient Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={formData.patientName}
              onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
            />
          </div>
          <div>
            <DatePickerField
              label="Date of Birth"
              value={formData.dob}
              onChange={(date: string | null) => setFormData({ ...formData, dob: date || "" })}
              disableFuture
            />
          </div>
          <div>
            <Label>Age</Label>
            <Input value={`${patientAge} years`} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Certificate Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Certificate Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DatePickerField
              label="Date From"
              value={formData.dateFrom}
              onChange={(date: string | null) => setFormData({ ...formData, dateFrom: date || "" })}
            />
            <DatePickerField
              label="Date To"
              value={formData.dateTo}
              onChange={(date: string | null) => setFormData({ ...formData, dateTo: date || "" })}
              minDate={formData.dateFrom || undefined}
            />
          </div>

          <div>
            <Label>Reason / Condition</Label>
            <Textarea
              placeholder="Brief description of the medical condition..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label>Work Capacity</Label>
            <Input
              value={formData.workCapacity}
              onChange={(e) => setFormData({ ...formData, workCapacity: e.target.value })}
              placeholder="e.g., Unable to work, Reduced duties"
            />
          </div>

          <div>
            <Label>Additional Notes (Optional)</Label>
            <Textarea
              placeholder="Any additional notes for the certificate..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="min-h-[60px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div
        className="flex items-center gap-3"
        data-testid="document-actions"
      >
        <Button 
          variant="outline" 
          onClick={handleSaveDraft} 
          disabled={isSaving || isGenerating}
          data-testid="save-draft-button"
        >
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Draft
        </Button>

        <Button
          type="button"
          onClick={handleGenerateAndApprove}
          disabled={isGenerating || isSaving || !formData.reason.trim() || !hasCredentials}
          className="bg-emerald-600 hover:bg-emerald-700"
          data-testid="approve-button"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Generate Certificate & Approve
        </Button>
      </div>
    </div>
  )
}
