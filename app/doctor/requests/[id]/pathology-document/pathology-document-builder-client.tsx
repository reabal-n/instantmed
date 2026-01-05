"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectItem } from "@/components/ui/select"
import {
  ArrowLeft,
  FileText,
  User,
  Stethoscope,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Wifi,
  WifiOff,
  RefreshCw,
  FlaskConical,
  ScanLine,
} from "lucide-react"
import {
  savePathologyDraftAction,
  generatePathologyPdfAndApproveAction,
  testApiConnectionAction,
  approvePathologyWithoutPdfAction,
} from "./actions"
import type { RequestWithDetails, DocumentDraft, GeneratedDocument } from "@/types/db"
import type { PathologyDraftData, PathologySubtype } from "@/lib/documents/apitemplate"

interface PathologyDocumentBuilderClientProps {
  request: RequestWithDetails
  draft: DocumentDraft
  existingDocument: GeneratedDocument | null
  patientAge: number
  formatCategory: (category: string | null) => string
  formatSubtype: (subtype: string | null) => string
}

const urgencyOptions = [
  { value: "Routine", label: "Routine" },
  { value: "Soon", label: "Soon (within 1 week)" },
  { value: "Urgent", label: "Urgent (within 24-48 hours)" },
]

export function PathologyDocumentBuilderClient({
  request,
  draft,
  existingDocument,
  patientAge: _patientAge,
  formatCategory,
  formatSubtype: _formatSubtype,
}: PathologyDocumentBuilderClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTestingApi, setIsTestingApi] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(existingDocument?.pdf_url || null)
  const [apiStatus, setApiStatus] = useState<"unknown" | "connected" | "error">("unknown")

  const [pathologySubtype, setPathologySubtype] = useState<PathologySubtype>(
    (draft.subtype as PathologySubtype) || "pathology_imaging",
  )

  const draftData = draft.data as PathologyDraftData
  const [formData, setFormData] = useState<PathologyDraftData>({
    patient_name: draftData.patient_name || "",
    dob: draftData.dob || "",
    medicare_number: draftData.medicare_number || "",
    tests_requested: draftData.tests_requested || "",
    clinical_indication: draftData.clinical_indication || "",
    symptom_duration: draftData.symptom_duration || "",
    severity: draftData.severity || "",
    urgency: draftData.urgency || "Routine",
    previous_tests: draftData.previous_tests || "",
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

  const updateField = (field: keyof PathologyDraftData, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setSavedMessage(null)
    setErrorMessage(null)
  }

  const handleSubtypeChange = (newSubtype: PathologySubtype) => {
    setPathologySubtype(newSubtype)
    setSavedMessage(null)
    setErrorMessage(null)
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    setSavedMessage(null)
    setErrorMessage(null)

    startTransition(async () => {
      const result = await savePathologyDraftAction(draft.id, formData, pathologySubtype)
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
      const result = await generatePathologyPdfAndApproveAction(draft.id, formData, pathologySubtype)
      setIsGenerating(false)

      if (result.success && result.pdfUrl) {
        setGeneratedPdfUrl(result.pdfUrl)
        setSavedMessage("Referral form generated and request approved!")
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
      await savePathologyDraftAction(draft.id, formData, pathologySubtype)
      const result = await approvePathologyWithoutPdfAction(request.id)
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

  const isBloodTest = pathologySubtype === "pathology_bloods"

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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pathology/Imaging Request Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">Build and preview the referral form before generating</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#00E2B5]/10 text-[#00E2B5] border-0">{formatCategory(request.category)}</Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            {isBloodTest ? <FlaskConical className="h-3 w-3" /> : <ScanLine className="h-3 w-3" />}
            {isBloodTest ? "Blood Tests" : "Imaging"}
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
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
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
            <span className="text-sm font-medium">Referral form has been generated</span>
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
          {/* Referral Type Toggle */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-[#00E2B5]" />
              <h2 className="text-lg font-semibold">Referral Type</h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant={isBloodTest ? "default" : "outline"}
                onClick={() => handleSubtypeChange("pathology_bloods")}
                className={`flex-1 rounded-xl ${isBloodTest ? "btn-glow" : "bg-transparent"}`}
              >
                <FlaskConical className="mr-2 h-4 w-4" />
                Blood Tests
              </Button>
              <Button
                variant={!isBloodTest ? "default" : "outline"}
                onClick={() => handleSubtypeChange("pathology_imaging")}
                className={`flex-1 rounded-xl ${!isBloodTest ? "btn-glow" : "bg-transparent"}`}
              >
                <ScanLine className="mr-2 h-4 w-4" />
                Imaging
              </Button>
            </div>
          </div>

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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField("patient_name", e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField("dob", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicare_number">Medicare Number</Label>
                  <Input
                    id="medicare_number"
                    value={formData.medicare_number || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField("medicare_number", e.target.value)}
                    placeholder="1234 56789 0"
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Referral Details */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              {isBloodTest ? (
                <FlaskConical className="h-5 w-5 text-[#00E2B5]" />
              ) : (
                <ScanLine className="h-5 w-5 text-[#00E2B5]" />
              )}
              <h2 className="text-lg font-semibold">{isBloodTest ? "Pathology Details" : "Imaging Details"}</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tests_requested">{isBloodTest ? "Tests Requested" : "Imaging Requested"}</Label>
                <Textarea
                  id="tests_requested"
                  value={formData.tests_requested}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField("tests_requested", e.target.value)}
                  placeholder={isBloodTest ? "FBC, U&E, LFTs, Lipids..." : "X-ray chest, Ultrasound abdomen..."}
                  className="rounded-xl min-h-20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinical_indication">Clinical Indication</Label>
                <Textarea
                  id="clinical_indication"
                  value={formData.clinical_indication || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField("clinical_indication", e.target.value)}
                  placeholder="Reason for investigation..."
                  className="rounded-xl min-h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symptom_duration">Symptom Duration</Label>
                  <Input
                    id="symptom_duration"
                    value={formData.symptom_duration || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField("symptom_duration", e.target.value)}
                    placeholder="e.g. 2 weeks"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Input
                    id="severity"
                    value={formData.severity || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField("severity", e.target.value)}
                    placeholder="e.g. Moderate"
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency</Label>
                <Select
                  selectedKeys={formData.urgency ? [formData.urgency] : ["Routine"]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string
                    updateField("urgency", selected)
                  }}
                  className="rounded-xl"
                >
                  {urgencyOptions.map((option) => (
                    <SelectItem key={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="previous_tests">Previous Tests (Optional)</Label>
                <Textarea
                  id="previous_tests"
                  value={formData.previous_tests || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField("previous_tests", e.target.value)}
                  placeholder="Any relevant previous investigations..."
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField("doctor_name", e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider_number">Provider Number</Label>
                <Input
                  id="provider_number"
                  value={formData.provider_number}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField("provider_number", e.target.value)}
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
              <h2 className="text-lg font-semibold">Referral Preview</h2>
              <Badge variant="outline" className="text-xs">
                Live Preview
              </Badge>
            </div>

            {/* Referral Preview Card */}
            <div className="bg-white rounded-xl border-2 border-[#0A0F1C]/10 p-6 space-y-6 shadow-sm">
              {/* Header */}
              <div className="text-center border-b border-[#0A0F1C]/10 pb-4">
                <h3 className="text-xl font-bold text-[#0A0F1C]">InstantMed</h3>
                <p className="text-xs text-muted-foreground mt-1">Telehealth Medical Services</p>
              </div>

              <div className="text-center">
                <h4 className="text-lg font-semibold text-[#0A0F1C] uppercase tracking-wide">
                  {isBloodTest ? "Pathology Request" : "Imaging Request"}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {isBloodTest ? "Blood Tests" : "Radiology / Diagnostic Imaging"}
                </p>
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Medicare:</span>
                  <span className="font-medium">{formData.medicare_number || "Not provided"}</span>
                </div>
              </div>

              {/* Tests Requested */}
              <div className="bg-[#F8FAFC] rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase">
                  {isBloodTest ? "Tests Requested" : "Imaging Requested"}
                </p>
                <p className="text-sm font-medium text-[#0A0F1C]">{formData.tests_requested || "Not specified"}</p>
              </div>

              {/* Clinical Indication */}
              <div className="bg-[#F8FAFC] rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase">Clinical Indication</p>
                <p className="text-sm text-[#0A0F1C]">{formData.clinical_indication || "As clinically indicated"}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-[#F8FAFC] rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-semibold text-sm">{formData.symptom_duration || "—"}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Severity</p>
                  <p className="font-semibold text-sm">{formData.severity || "—"}</p>
                </div>
                <div
                  className={`rounded-lg p-3 text-center ${formData.urgency === "Urgent" ? "bg-red-50" : formData.urgency === "Soon" ? "bg-amber-50" : "bg-[#F8FAFC]"}`}
                >
                  <p className="text-xs text-muted-foreground">Urgency</p>
                  <p
                    className={`font-semibold text-sm ${formData.urgency === "Urgent" ? "text-red-700" : formData.urgency === "Soon" ? "text-amber-700" : ""}`}
                  >
                    {formData.urgency || "Routine"}
                  </p>
                </div>
              </div>

              {/* Previous Tests */}
              {formData.previous_tests && (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Previous Tests:</p>
                  <p className="text-[#0A0F1C]">{formData.previous_tests}</p>
                </div>
              )}

              {/* Doctor Signature */}
              <div className="border-t border-[#0A0F1C]/10 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Requested by:</span>
                  <span className="font-medium">{formData.doctor_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Provider No:</span>
                  <span className="font-medium">{formData.provider_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date:</span>
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

      {/* Action Buttons - Mobile (Sticky) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-white/40 lg:hidden">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
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
            className="flex-1 rounded-xl btn-glow"
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {generatedPdfUrl ? "Generated" : "Generate PDF"}
          </Button>
        </div>
      </div>
    </div>
  )
}
