"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
} from "lucide-react"
import type { IntakeWithDetails, DocumentDraft, GeneratedDocument, MedCertDraftData } from "@/types/db"
import { saveMedCertDraftAction, generateMedCertPdfAndApproveAction } from "./actions"

interface DocumentBuilderClientProps {
  intake: IntakeWithDetails
  draft: DocumentDraft
  existingDocument: GeneratedDocument | null
  patientAge: number
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
}: DocumentBuilderClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
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
    startTransition(async () => {
      try {
        const result = await generateMedCertPdfAndApproveAction(intake.id, draft.id)
        if (result.success) {
          setActionMessage({ type: "success", text: "Certificate generated and sent to patient!" })
          setTimeout(() => router.push("/doctor/queue"), 2500)
        } else {
          setActionMessage({ type: "error", text: result.error || "Failed to generate certificate" })
        }
      } finally {
        setIsGenerating(false)
      }
    })
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
        >
          {actionMessage.text}
        </div>
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
            <Label>Date of Birth</Label>
            <Input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
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
            <div>
              <Label>Date From</Label>
              <Input
                type="date"
                value={formData.dateFrom}
                onChange={(e) => setFormData({ ...formData, dateFrom: e.target.value })}
              />
            </div>
            <div>
              <Label>Date To</Label>
              <Input
                type="date"
                value={formData.dateTo}
                onChange={(e) => setFormData({ ...formData, dateTo: e.target.value })}
              />
            </div>
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
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving || isPending}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Draft
        </Button>

        <Button
          onClick={handleGenerateAndApprove}
          disabled={isGenerating || isPending || !formData.reason.trim()}
          className="bg-emerald-600 hover:bg-emerald-700"
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
