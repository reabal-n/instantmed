"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Save,
  FileText,
  User,
  Stethoscope,
  CheckCircle,
  Download,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Briefcase,
  GraduationCap,
  Heart,
} from "lucide-react"
import type { RequestWithDetails, DocumentDraft, GeneratedDocument, MedCertDraftData } from "@/types/db"
import {
  saveMedCertDraftAction,
  generateMedCertPdfAndApproveAction,
  testApiConnectionAction,
  approveWithoutPdfAction,
} from "./actions"

interface DocumentBuilderClientProps {
  request: RequestWithDetails
  draft: DocumentDraft
  existingDocument: GeneratedDocument | null
  patientAge: number
  formatCategory: (category: string | null) => string
  formatSubtype: (subtype: string | null) => string
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

function getCapacityOptions(subtype: string | null): { value: string; label: string }[] {
  switch (subtype) {
    case "uni":
      return [
        { value: "Unable to attend", label: "Unable to attend" },
        { value: "Unable to sit exams", label: "Unable to sit exams" },
        { value: "Reduced study capacity", label: "Reduced study capacity" },
        { value: "Requires extension", label: "Requires extension" },
      ]
    case "carer":
      return [
        { value: "Unable to work - providing care", label: "Unable to work - providing care" },
        { value: "Reduced capacity - caring duties", label: "Reduced capacity - caring duties" },
        { value: "Required for care recipient", label: "Required for care recipient" },
      ]
    case "work":
    default:
      return [
        { value: "Unable to work", label: "Unable to work" },
        { value: "Reduced capacity", label: "Reduced capacity" },
        { value: "Fit for light duties", label: "Fit for light duties" },
        { value: "Working from home only", label: "Working from home only" },
      ]
  }
}

export function DocumentBuilderClient({
  request,
  draft,
  existingDocument,
  patientAge,
  formatCategory,
  formatSubtype,
}: DocumentBuilderClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTestingApi, setIsTestingApi] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(existingDocument?.pdf_url || null)
  const [apiStatus, setApiStatus] = useState<"unknown" | "connected" | "error">("unknown")

  const certSubtype = draft.subtype || request.subtype || "work"

  // Form state from draft data
  const draftData = draft.data as MedCertDraftData
  const [formData, setFormData] = useState<MedCertDraftData>({
    patient_name: draftData.patient_name || "",
    dob: draftData.dob || "",
    reason: draftData.reason || "",
    date_from: draftData.date_from || "",
    date_to: draftData.date_to || "",
    work_capacity: draftData.work_capacity || getCapacityOptions(certSubtype)[0].value,
    notes: draftData.notes || "",
    doctor_name: draftData.doctor_name || "Dr Reabal Najjar",
    provider_number: draftData.provider_number || "2426577L",
    created_date: draftData.created_date || new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    const testConnection = async () => {
      setIsTestingApi(true)
      const result = await testApiConnectionAction()
      setApiStatus(result.success ? "connected" : "error")
      setIsTestingApi(false)
    }
    testConnection()
  }, [])

  const updateField = (field: keyof MedCertDraftData, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setSavedMessage(null)
    setErrorMessage(null)
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    setSavedMessage(null)
    setErrorMessage(null)

    startTransition(async () => {
      const result = await saveMedCertDraftAction(draft.id, formData)
      setIsSaving(false)

      if (result.success) {
        setSavedMessage("Draft saved successfully")
        setTimeout(() => setSavedMessage(null), 3000)
      } else {
        setErrorMessage(result.error || "Failed to save draft")
      }
    })
  }

  const handleGeneratePdf = async () => {
    setIsGenerating(true)
    setSavedMessage(null)
    setErrorMessage(null)

    startTransition(async () => {
      const result = await generateMedCertPdfAndApproveAction(draft.id, formData)
      setIsGenerating(false)

      if (result.success && result.pdfUrl) {
        setGeneratedPdfUrl(result.pdfUrl)
        setSavedMessage("Certificate generated and request approved!")
        window.open(result.pdfUrl, "_blank")
        setTimeout(() => {
          router.push(`/doctor/requests/${request.id}`)
        }, 2000)
      } else {
        setErrorMessage(result.error || "Failed to generate PDF")
      }
    })
  }

  const handleApproveWithoutPdf = async () => {
    setIsGenerating(true)
    setSavedMessage(null)
    setErrorMessage(null)

    startTransition(async () => {
      await saveMedCertDraftAction(draft.id, formData)
      const result = await approveWithoutPdfAction(request.id)
      setIsGenerating(false)

      if (result.success) {
        setSavedMessage("Request approved (manual PDF required)")
        setTimeout(() => {
          router.push(`/doctor/requests/${request.id}`)
        }, 1500)
      } else {
        setErrorMessage(result.error || "Failed to approve request")
      }
    })
  }

  const handleRetryApiTest = async () => {
    setIsTestingApi(true)
    setApiStatus("unknown")
    const result = await testApiConnectionAction()
    setApiStatus(result.success ? "connected" : "error")
    setIsTestingApi(false)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set"
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const capacityOptions = getCapacityOptions(certSubtype)

  return (
    <div className="space-y-6 pb-32 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground hover:text-foreground rounded-lg -ml-2 mb-2"
          >
            <Link href={`/doctor/requests/${request.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to request
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Document Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build and preview the medical certificate before generating
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#00E2B5]/10 text-[#00E2B5] border-0">{formatCategory(request.category)}</Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            {getSubtypeIcon(certSubtype)}
            {formatSubtype(certSubtype)}
          </Badge>
        </div>
      </div>

      {/* API Status */}
      <div className="flex items-center gap-2">
        {isTestingApi ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Testing PDF service connection...</span>
          </div>
        ) : apiStatus === "connected" ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <Wifi className="h-4 w-4" />
            <span>PDF service connected</span>
          </div>
        ) : apiStatus === "error" ? (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <WifiOff className="h-4 w-4" />
            <span>PDF service unavailable</span>
            <Button variant="ghost" size="sm" onClick={handleRetryApiTest} className="h-6 px-2">
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        ) : null}
      </div>

      {/* Messages */}
      {savedMessage && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <span>{errorMessage}</span>
            {apiStatus === "error" && (
              <p className="text-xs mt-1 opacity-75">
                You can still approve the request manually and generate the PDF later.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Already generated notice */}
      {generatedPdfUrl && !savedMessage && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#00E2B5]/10 border border-[#00E2B5]/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-[#00E2B5]" />
            <span className="text-sm font-medium">Certificate has been generated</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(generatedPdfUrl, "_blank")}
            className="rounded-lg"
          >
            <Download className="mr-2 h-4 w-4" />
            View PDF
          </Button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Patient Details */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-[#00E2B5]" />
              <h2 className="text-lg font-semibold">Patient Details</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient_name">Patient Name</Label>
                <Input
                  id="patient_name"
                  value={formData.patient_name}
                  onChange={(e) => updateField("patient_name", e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob || ""}
                  onChange={(e) => updateField("dob", e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Certificate Details */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-[#00E2B5]" />
              <h2 className="text-lg font-semibold">Certificate Details</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_from">Date From</Label>
                  <Input
                    id="date_from"
                    type="date"
                    value={formData.date_from || ""}
                    onChange={(e) => updateField("date_from", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_to">Date To</Label>
                  <Input
                    id="date_to"
                    type="date"
                    value={formData.date_to || ""}
                    onChange={(e) => updateField("date_to", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason / Condition</Label>
                <Textarea
                  id="reason"
                  value={formData.reason || ""}
                  onChange={(e) => updateField("reason", e.target.value)}
                  placeholder="Medical condition requiring absence..."
                  className="rounded-xl min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work_capacity">
                  {certSubtype === "uni"
                    ? "Study Capacity"
                    : certSubtype === "carer"
                      ? "Care Capacity"
                      : "Work Capacity"}
                </Label>
                <Select
                  value={formData.work_capacity || capacityOptions[0].value}
                  onValueChange={(value) => updateField("work_capacity", value)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {capacityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Any additional notes..."
                  className="rounded-xl min-h-[60px]"
                />
              </div>
            </div>
          </div>

          {/* Doctor Details */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="h-5 w-5 text-[#00E2B5]" />
              <h2 className="text-lg font-semibold">Doctor Details</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="doctor_name">Doctor Name</Label>
                <Input
                  id="doctor_name"
                  value={formData.doctor_name}
                  onChange={(e) => updateField("doctor_name", e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider_number">Provider Number</Label>
                <Input
                  id="provider_number"
                  value={formData.provider_number}
                  onChange={(e) => updateField("provider_number", e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Certificate Preview</h2>
              <Badge variant="outline" className="text-xs">
                Live Preview
              </Badge>
            </div>

            {/* Certificate Preview Card */}
            <div className="bg-white rounded-xl border-2 border-[#0A0F1C]/10 p-6 space-y-6 shadow-sm">
              {/* Header */}
              <div className="text-center border-b border-[#0A0F1C]/10 pb-4">
                <h3 className="text-xl font-bold text-[#0A0F1C]">InstantMed</h3>
                <p className="text-xs text-muted-foreground mt-1">Telehealth Medical Services</p>
              </div>

              <div className="text-center">
                <h4 className="text-lg font-semibold text-[#0A0F1C] uppercase tracking-wide">
                  {getCertificateTitle(certSubtype)}
                </h4>
              </div>

              {/* Patient Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient:</span>
                  <span className="font-medium">{formData.patient_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date of Birth:</span>
                  <span className="font-medium">{formatDate(formData.dob)}</span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] rounded-lg p-4 text-sm">
                <p className="text-[#0A0F1C]">
                  This is to certify that{" "}
                  <span className="font-semibold">{formData.patient_name || "[Patient Name]"}</span> was examined and
                  found to be suffering from a medical condition that renders them{" "}
                  <span className="font-semibold lowercase">{formData.work_capacity || capacityOptions[0].value}</span>.
                </p>
                {formData.reason && <p className="mt-2 text-muted-foreground">Reason: {formData.reason}</p>}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-[#F8FAFC] rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="font-semibold">{formatDate(formData.date_from)}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="font-semibold">{formatDate(formData.date_to)}</p>
                </div>
              </div>

              {/* Notes */}
              {formData.notes && (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Additional Notes:</p>
                  <p className="text-[#0A0F1C]">{formData.notes}</p>
                </div>
              )}

              {/* Doctor Signature */}
              <div className="border-t border-[#0A0F1C]/10 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Issued by:</span>
                  <span className="font-medium">{formData.doctor_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Provider No:</span>
                  <span className="font-medium">{formData.provider_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date Issued:</span>
                  <span className="font-medium">{formatDate(formData.created_date)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Desktop */}
      <div className="hidden lg:flex items-center justify-end gap-4 pt-4">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isPending || isSaving}
          className="rounded-xl bg-transparent"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Draft
        </Button>
        {apiStatus === "error" && (
          <Button
            variant="outline"
            onClick={handleApproveWithoutPdf}
            disabled={isPending || isGenerating}
            className="rounded-xl bg-transparent"
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Approve (Manual PDF)
          </Button>
        )}
        <Button
          onClick={handleGeneratePdf}
          disabled={isPending || isGenerating || !!generatedPdfUrl}
          className="rounded-xl btn-glow"
        >
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          {generatedPdfUrl ? "PDF Generated" : "Generate PDF & Approve"}
        </Button>
      </div>

      {/* Action Buttons - Mobile (sticky bottom) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isPending || isSaving}
            className="flex-1 rounded-xl bg-transparent"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
          <Button
            onClick={handleGeneratePdf}
            disabled={isPending || isGenerating || !!generatedPdfUrl}
            className="flex-[2] rounded-xl btn-glow"
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {generatedPdfUrl ? "Generated" : "Generate & Approve"}
          </Button>
        </div>
      </div>
    </div>
  )
}
