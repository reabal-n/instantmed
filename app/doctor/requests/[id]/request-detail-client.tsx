"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Save,
  User,
  Clock,
  MessageSquare,
  Download,
  FileEdit,
  Sparkles,
  Loader2,
} from "lucide-react"
import { updateStatusAction, saveClinicalNoteAction, markEScriptSentAction, type DeclineData } from "./actions"
import type { RequestWithDetails, RequestStatus, GeneratedDocument, Request, DeclineReasonCode } from "@/types/db"
import { containsBlockedSubstance, S8_DISCLAIMER_EXAMPLES, mapLegacyAnswers, extractMedicationFromAnswers } from "@/lib/validation/repeat-script-schema"
import { formatCategory, formatSubtype } from "@/lib/format-utils"

interface RequestDetailClientProps {
  request: RequestWithDetails
  patientAge: number
  maskedMedicare: string
  existingDocument?: GeneratedDocument | null
  previousRequests?: Request[]
  initialAction?: string
}

export function RequestDetailClient({
  request,
  patientAge,
  maskedMedicare,
  existingDocument,
  previousRequests = [],
  initialAction,
}: RequestDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [clinicalNote, setClinicalNote] = useState(request.clinical_note || "")
  const [noteSaved, setNoteSaved] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(initialAction === "decline")
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isGeneratingNote, setIsGeneratingNote] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [isGeneratingDeclineReason, setIsGeneratingDeclineReason] = useState(false)
  const [declineReasonCode, setDeclineReasonCode] = useState<DeclineReasonCode>("requires_examination")

  // eScript sent dialog state
  const [showEScriptDialog, setShowEScriptDialog] = useState(false)
  const [parchmentReference, setParchmentReference] = useState("")
  const [sentVia, setSentVia] = useState<"parchment" | "paper">("parchment")
  const [isMarkingEScript, setIsMarkingEScript] = useState(false)

  // Handle quick actions from dashboard
  useEffect(() => {
    if (initialAction === "approve" && request.status === "pending") {
      // For med certs, redirect to document builder
      if (request.category === "medical_certificate") {
        router.push(`/doctor/requests/${request.id}/document`)
      }
      // For other types, we could auto-trigger approve but it&apos;s safer to let the doctor review first
    }
  }, [initialAction, request.id, request.category, request.status, router])

  // AI-powered SOAP note generation
  const handleGenerateClinicalNote = async () => {
    setIsGeneratingNote(true)
    try {
      const response = await fetch("/api/ai/clinical-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: request.patient.full_name || "Patient",
          patientAge,
          requestType: request.category,
          requestSubtype: request.subtype || "general",
          questionnaire: request.answers?.answers || {},
          redFlags: Object.entries(request.answers?.answers || {}).some(
            ([key, value]) => (key.includes("safety") || key.includes("red_flag") || key.startsWith("rf_")) && value === true
          ),
          existingNote: clinicalNote || undefined,
        }),
      })
      const data = await response.json()
      if (data.success && data.note) {
        setClinicalNote(data.note)
        setActionMessage({ type: "success", text: "AI clinical note generated - please review and edit as needed" })
        setTimeout(() => setActionMessage(null), 4000)
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to generate note" })
      }
    } catch {
      setActionMessage({ type: "error", text: "Failed to connect to AI service" })
    } finally {
      setIsGeneratingNote(false)
    }
  }

  // AI-powered decline reason generation
  const handleGenerateDeclineReason = async () => {
    setIsGeneratingDeclineReason(true)
    try {
      const response = await fetch("/api/ai/decline-reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: request.patient.full_name || "Patient",
          requestType: request.category,
          requestSubtype: request.subtype || "general",
          questionnaire: request.answers?.answers || {},
          declineReasonCode,
          additionalContext: clinicalNote || undefined,
        }),
      })
      const data = await response.json()
      if (data.success && data.reason) {
        setDeclineReason(data.reason)
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to generate decline reason" })
      }
    } catch {
      setActionMessage({ type: "error", text: "Failed to connect to AI service" })
    } finally {
      setIsGeneratingDeclineReason(false)
    }
  }

  const handleStatusChange = async (status: RequestStatus) => {
    startTransition(async () => {
      // Build decline data if declining
      const declineData: DeclineData | undefined = status === "declined" 
        ? { reasonCode: declineReasonCode, reasonNote: declineReason }
        : undefined
      
      const result = await updateStatusAction(request.id, status, declineData)
      if (result.success) {
        let message = `Request ${status === "approved" ? "approved" : status === "declined" ? "declined" : "marked as needs follow-up"}`
        
        // Add refund information for declined requests
        if (status === "declined" && result.refund) {
          if (result.refund.refunded) {
            message += ` • Patient refunded $${((result.refund.amountRefunded || 0) / 100).toFixed(2)}`
          } else if (result.refund.refundStatus === "not_eligible") {
            message += ` • No refund (${result.refund.reason})`
          } else if (result.refund.refundStatus === "failed") {
            message += ` • Refund failed: ${result.refund.reason}`
          }
        }
        
        setActionMessage({
          type: "success",
          text: message,
        })
        setTimeout(() => {
          router.push("/doctor")
        }, 2500) // Slightly longer to read refund message
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to update status" })
      }
    })
  }

  const handleSaveNote = async () => {
    startTransition(async () => {
      const result = await saveClinicalNoteAction(request.id, clinicalNote)
      if (result.success) {
        setNoteSaved(true)
        setTimeout(() => setNoteSaved(false), 3000)
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to save note" })
      }
    })
  }

  const handleMarkEScriptSent = async () => {
    setIsMarkingEScript(true)
    try {
      const result = await markEScriptSentAction(
        request.id,
        parchmentReference.trim() || null,
        sentVia
      )
      if (result.success) {
        setShowEScriptDialog(false)
        setActionMessage({
          type: "success",
          text: `eScript marked as sent${sentVia === "parchment" ? " via Parchment" : " (paper script)"} - patient email sent`,
        })
        setTimeout(() => {
          router.push("/doctor")
        }, 2500)
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to mark eScript sent" })
      }
    } catch {
      setActionMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setIsMarkingEScript(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const _getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100/80 text-amber-700 border-0 font-medium">Pending</Badge>
      case "awaiting_prescribe":
        return <Badge className="bg-violet-100/80 text-violet-700 border-0 font-medium">Awaiting eScript</Badge>
      case "approved":
        return <Badge className="bg-emerald-100/80 text-emerald-700 border-0 font-medium">Approved</Badge>
      case "declined":
        return <Badge className="bg-red-100/80 text-red-700 border-0 font-medium">Declined</Badge>
      case "needs_follow_up":
        return <Badge className="bg-orange-100/80 text-orange-700 border-0 font-medium">Needs Follow-up</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const _getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  // Parse answers JSON for display
  const answers = request.answers?.answers || {}
  const groupedAnswers: Record<string, Record<string, string>> = {}

  // Group answers by category
  Object.entries(answers).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "boolean") {
      // Determine category based on key
      let category = "Other"
      if (key.includes("safety") || key.includes("red_flag") || key.startsWith("rf_")) {
        category = "Safety Screening"
      } else if (key.includes("reason") || key.includes("symptom") || key.includes("condition")) {
        category = "Symptoms & Reason"
      } else if (key.includes("medication") || key.includes("drug")) {
        category = "Medications"
      } else if (key.includes("date") || key.includes("duration") || key.includes("time")) {
        category = "Timing"
      } else if (key.includes("impact") || key.includes("capacity") || key.includes("work")) {
        category = "Impact & Capacity"
      }

      if (!groupedAnswers[category]) {
        groupedAnswers[category] = {}
      }
      groupedAnswers[category][key] = String(value)
    }
  })

  // Check for red flags
  const hasRedFlags = Object.entries(answers).some(
    ([key, value]) => (key.includes("safety") || key.includes("red_flag") || key.startsWith("rf_")) && value === true,
  )

  const isMedCert = request.category === "medical_certificate"
  const isPrescription = request.category === "prescription"
  
  // Deprecated services - no longer offered
  const isReferral = request.category === "referral" as string
  const isPathology = request.category === "pathology" as string
  const isDeprecatedService = isReferral || isPathology

  // S8 Warning Detection: Check if patient free text contains S8 substance terms
  const mappedAnswers = mapLegacyAnswers(answers)
  const _structuredMed = extractMedicationFromAnswers(mappedAnswers)
  
  // Collect all free text fields to check for S8 mentions
  const freeTextFields = [
    answers.notes,
    answers.consult_details,
    answers.current_medications,
    answers.short_description,
    answers.description,
    answers.additional_notes,
    answers.reason,
    answers.context,
  ].filter(Boolean).map(String)
  
  const hasS8InFreeText = freeTextFields.some(text => containsBlockedSubstance(text))
  
  // Show S8 warning for consult or repeat script if:
  // - prescribed_before=false OR dose_changed=true (existing gating check)
  // - OR patient free text mentions S8 substances
  const isConsultOrRepeat = (request.category as string) === "consult" || (request.category === "prescription" && request.subtype === "repeat")
  const showS8Warning = isConsultOrRepeat && hasS8InFreeText


  // Medical cert / prescription grouped answers
  const _groupedAnswersForPrescriptionAndMedCert = {
    reason: answers.reason_label || answers.reason,
    dateNeeded: answers.date_needed_label || answers.dateNeeded || answers["Date needed"],
    workType: answers.work_type_label || answers.workType || answers["Work type"],
    impact: answers.impact_label || answers.impact || answers.Impact,
    context: answers.context_label || answers.context || answers.Context,
    caringFor: answers.caring_for_label || answers.caringFor || answers["Caring for"],
    careReason: answers.reason_label || answers.careReason || answers["Care reason"],
    duration: answers.duration_label || answers.duration || answers.Duration,
    livingSituation: answers.living_situation_label || answers.livingSituation || answers["Living situation"],
    description: answers.short_description || answers.description || answers.Description,
    medicationName: answers.medication_name,
    additionalNotes: answers.additional_notes,
    durationOnMedication: answers.duration_label || answers.duration_on_medication,
    symptomControl: answers.control_label || answers.symptom_control,
    sideEffects: answers.side_effects_label || answers.side_effects,
    requestTypes: answers.request_types_labels || answers.request_types,
    primaryCondition: answers.condition_label || answers.primary_condition,
    recentReview: answers.review_label || answers.recent_review,
    currentControl: answers.control_label || answers.current_control,
  }

  // AMT-backed structured medication data
  const structuredMedication = {
    amt_code: answers.amt_code as string | undefined,
    display: answers.medication_display as string | undefined,
    medication_name: answers.medication_name as string | undefined,
    form: answers.medication_form as string | undefined,
    strength: answers.medication_strength as string | undefined,
    prescribed_before: answers.prescribed_before as boolean | undefined,
    dose_changed: answers.dose_changed as boolean | undefined,
  }
  const hasStructuredMedication = !!structuredMedication.amt_code && !!structuredMedication.display

  // Compliance Gate: Check if this is a repeat script that should have been a consult
  const isRepeatScript = request.category === "prescription" && request.subtype === "repeat"
  const failsGatingCheck = isRepeatScript && (
    structuredMedication.prescribed_before === false || 
    structuredMedication.dose_changed === true
  )

  return (
    <div className="space-y-6 pb-32 lg:pb-8">
      {/* COMPLIANCE GATE: Warning for repeat scripts that should be consults */}
      {failsGatingCheck && (
        <div className="bg-red-100 border-2 border-red-500 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-red-900">⚠️ COMPLIANCE GATE — DO NOT APPROVE AS REPEAT SCRIPT</h2>
              <p className="text-red-800 mt-2 font-medium">
                This request requires a General Consult, not a repeat script:
              </p>
              <ul className="mt-2 space-y-1 text-red-700">
                {structuredMedication.prescribed_before === false && (
                  <li>• Patient has NOT been prescribed this medication before</li>
                )}
                {structuredMedication.dose_changed === true && (
                  <li>• Patient is requesting a dose change</li>
                )}
              </ul>
              <div className="mt-4 p-3 bg-red-200 rounded-lg">
                <p className="text-sm text-red-900 font-medium">
                  Action required: Decline this request and advise patient to book a General Consult ($44.95) for proper assessment.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* S8 WARNING: Patient free text mentions controlled substances */}
      {showS8Warning && (
        <div className="bg-red-100 border-2 border-red-500 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-red-900">🚫 NO S8 / CONTROLLED MEDS — DECLINE IF REQUESTED</h2>
              <p className="text-red-800 mt-2 font-medium">
                Patient&apos;s free text mentions terms associated with Schedule 8 or controlled substances.
              </p>
              <div className="mt-3 p-3 bg-red-200 rounded-lg">
                <p className="text-xs text-red-900 font-medium mb-1">Examples we do NOT prescribe:</p>
                <p className="text-xs text-red-800">
                  {S8_DISCLAIMER_EXAMPLES.join(", ")}
                </p>
              </div>
              <p className="text-sm text-red-700 mt-3">
                If patient is requesting any S8/controlled medication, decline and advise them to see their regular GP.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground hover:text-foreground rounded-lg -ml-2 mb-2"
          >
            <Link href="/doctor">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Request Details</h1>
          <p className="text-sm text-muted-foreground mt-1">Submitted {formatDate(request.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-[#00E2B5]/10 text-[#00E2B5] border-0">{formatCategory(request.category)}</Badge>
          <Badge variant="outline">{formatSubtype(request.subtype)}</Badge>
          <Badge
            className={
              request.status === "pending"
                ? "bg-amber-100 text-amber-700 border-0"
                : request.status === "awaiting_prescribe"
                  ? "bg-violet-100 text-violet-700 border-0"
                  : request.status === "approved"
                    ? "bg-emerald-100 text-emerald-700 border-0"
                    : request.status === "declined"
                      ? "bg-red-100 text-red-700 border-0"
                      : "bg-blue-100 text-blue-700 border-0"
            }
          >
            {request.status === "awaiting_prescribe" ? "Awaiting eScript" : request.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border ${actionMessage.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <span>{actionMessage.text}</span>
          </div>
        </div>
      )}

      {/* Deprecated Service Warning */}
      {isDeprecatedService && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-800">Service No Longer Offered</h3>
              <p className="text-sm text-amber-700 mt-1">
                {isReferral 
                  ? "Referral services have been discontinued. Please decline this request with an explanation to the patient."
                  : "Pathology & imaging referral services have been discontinued. Please decline this request with an explanation to the patient."}
              </p>
              <p className="text-sm text-amber-600 mt-2">
                Suggested decline message: &quot;We apologize, but this service is no longer available through InstantMed. Please visit your local GP for this request.&quot;
              </p>
            </div>
          </div>
        </div>
      )}

      {existingDocument && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#00E2B5]/10 border border-[#00E2B5]/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-[#00E2B5]" />
            <span className="text-sm font-medium">Certificate has been generated</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(existingDocument.pdf_url, "_blank")}
            className="rounded-lg"
          >
            <Download className="mr-2 h-4 w-4" />
            View PDF
          </Button>
        </div>
      )}

      {/* Patient Summary Card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-[#00E2B5]" />
          <h2 className="text-lg font-semibold">Patient Summary</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{request.patient.full_name}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs text-muted-foreground">Age</p>
              <p className="font-medium">{patientAge} years old</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium">
                {request.patient.suburb || "—"}, {request.patient.state || "—"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{request.patient.phone || "Not provided"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CreditCard className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs text-muted-foreground">Medicare</p>
              <p className="font-medium font-mono text-sm">{maskedMedicare}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Red Flags Warning */}
      {hasRedFlags && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800">Safety Concerns Flagged</h3>
              <p className="text-sm text-red-700 mt-1">
                This patient has indicated one or more safety concerns in their screening. Please review carefully and
                consider whether urgent follow-up is required.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AMT-backed Medication Details (for repeat scripts) */}
      {hasStructuredMedication && isPrescription && (
        <div className="glass-card rounded-2xl p-6 border-2 border-violet-200 bg-violet-50/30">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold">Requested Medication</h2>
            <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">AMT Verified</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/80 col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Medication (AMT Display)</p>
              <p className="font-semibold">{structuredMedication.display}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/80">
              <p className="text-xs text-muted-foreground mb-1">Medication Name</p>
              <p className="font-medium">{structuredMedication.medication_name || "—"}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/80">
              <p className="text-xs text-muted-foreground mb-1">Strength</p>
              <p className="font-medium">{structuredMedication.strength || "—"}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/80">
              <p className="text-xs text-muted-foreground mb-1">Form</p>
              <p className="font-medium">{structuredMedication.form || "—"}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/80">
              <p className="text-xs text-muted-foreground mb-1">Gating</p>
              <p className="font-medium text-sm">
                Prescribed before: {structuredMedication.prescribed_before ? "Yes" : "No"} • 
                Dose changed: {structuredMedication.dose_changed ? "Yes" : "No"}
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-white/60 border border-violet-100">
            <p className="text-xs text-muted-foreground">
              <strong>AMT Code (SNOMED CT):</strong>{" "}
              <code className="bg-violet-100 px-1.5 py-0.5 rounded text-violet-700 font-mono text-xs">
                {structuredMedication.amt_code}
              </code>
            </p>
          </div>
        </div>
      )}

      {/* Request Answers */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-[#00E2B5]" />
          <h2 className="text-lg font-semibold">Questionnaire Responses</h2>
        </div>
        <div className="space-y-6">
          {Object.entries(groupedAnswers).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{category}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(items).map(([key, value]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-xl ${
                      category === "Safety Screening" && value === "true"
                        ? "bg-red-50 border border-red-200"
                        : "bg-[#F8FAFC]"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground capitalize">
                      {key.replace(/_/g, " ").replace(/rf /g, "")}
                    </p>
                    <p
                      className={`font-medium ${category === "Safety Screening" && value === "true" ? "text-red-700" : ""}`}
                    >
                      {value === "true" ? "Yes" : value === "false" ? "No" : value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Patient History */}
      {previousRequests.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Patient History</h2>
            <Badge variant="outline" className="text-xs">{previousRequests.length} previous</Badge>
          </div>
          <div className="space-y-2">
            {previousRequests.map((prevReq) => (
              <Link
                key={prevReq.id}
                href={`/doctor/requests/${prevReq.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{formatCategory(prevReq.category)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(prevReq.created_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    prevReq.status === "approved" 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : prevReq.status === "declined"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                  }
                >
                  {prevReq.status === "approved" ? "Approved" : prevReq.status === "declined" ? "Declined" : "Pending"}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Notes */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#00E2B5]" />
            <h2 className="text-lg font-semibold">Clinical Notes</h2>
            <span className="text-xs text-muted-foreground">(Private - not visible to patient)</span>
          </div>
          {noteSaved && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Note saved
            </span>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateClinicalNote}
              disabled={isGeneratingNote || request.status !== "pending"}
              className="rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 border-violet-200 text-violet-700"
            >
              {isGeneratingNote ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate SOAP Note
                </>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">AI will create a structured clinical note from questionnaire</span>
          </div>
          <Textarea
            value={clinicalNote}
            onChange={(e) => setClinicalNote(e.target.value)}
            placeholder="Add internal notes about this request... or click 'Generate SOAP Note' for AI assistance"
            className="min-h-[150px] rounded-xl font-mono text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveNote}
            disabled={isPending}
            className="rounded-lg bg-transparent"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Note
          </Button>
        </div>
      </div>

      {/* Action Buttons - Desktop */}
      {/* For awaiting_prescribe status, show Mark eScript Sent UI */}
      {request.status === "awaiting_prescribe" && isPrescription && (
        <div className="bg-violet-50 border-2 border-violet-300 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-violet-900">Awaiting eScript Entry</h2>
              <p className="text-violet-700 mt-1">
                This prescription has been approved clinically. Please enter the script in Parchment, then mark it as sent below.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setShowEScriptDialog(true)}
                  className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark eScript Sent
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="hidden lg:flex items-center justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => handleStatusChange("needs_follow_up")}
          disabled={isPending || request.status !== "pending"}
          className="rounded-xl"
        >
          <Clock className="mr-2 h-4 w-4" />
          Needs Follow-up
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowDeclineDialog(true)}
          disabled={isPending || request.status !== "pending"}
          className="rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Decline
        </Button>
        {isMedCert ? (
          <Button asChild disabled={isPending || request.status !== "pending"} className="rounded-xl btn-glow">
            <Link href={`/doctor/requests/${request.id}/document`}>
              <FileEdit className="mr-2 h-4 w-4" />
              Build Certificate
            </Link>
          </Button>
        ) : isDeprecatedService ? (
          <Button
            disabled
            className="rounded-xl opacity-50 cursor-not-allowed"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Service Discontinued
          </Button>
        ) : (
          <Button
            onClick={() => handleStatusChange("approved")}
            disabled={isPending || request.status !== "pending"}
            className="rounded-xl btn-glow"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
          </Button>
        )}
      </div>

      {/* Action Bar - Mobile (Sticky) */}
      {request.status === "pending" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-white/40 lg:hidden">
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <Button
              variant="outline"
              onClick={() => setShowDeclineDialog(true)}
              disabled={isPending}
              className="flex-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Decline
            </Button>
            {isMedCert ? (
              <Button asChild disabled={isPending} className="flex-1 rounded-xl btn-glow">
                <Link href={`/doctor/requests/${request.id}/document`}>
                  <FileEdit className="mr-2 h-4 w-4" />
                  Build Cert
                </Link>
              </Button>
            ) : isDeprecatedService ? (
              <Button
                disabled
                className="flex-1 rounded-xl opacity-50 cursor-not-allowed"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Discontinued
              </Button>
            ) : (
              <Button
                onClick={() => handleStatusChange("approved")}
                disabled={isPending}
                className="flex-1 rounded-xl btn-glow"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Action Bar - Mobile (Sticky) - For awaiting_prescribe */}
      {request.status === "awaiting_prescribe" && isPrescription && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-white/40 lg:hidden">
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <Button
              onClick={() => setShowEScriptDialog(true)}
              className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark eScript Sent
            </Button>
          </div>
        </div>
      )}

      {/* Decline Confirmation Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={(open) => {
        setShowDeclineDialog(open)
        if (!open) {
          // Reset state when closing
          setDeclineReason("")
          setDeclineReasonCode("requires_examination")
        }
      }}>
        <AlertDialogContent className="rounded-2xl max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this request</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              The patient will receive an email with your decline reason. You can use AI to help compose a compassionate message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Decline Reason Code Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Decline Reason <span className="text-red-500">*</span></label>
              <select
                value={declineReasonCode}
                onChange={(e) => setDeclineReasonCode(e.target.value as DeclineReasonCode)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <optgroup label="Clinical">
                  <option value="requires_examination">Requires in-person physical examination</option>
                  <option value="urgent_care_needed">Requires urgent in-person care</option>
                </optgroup>
                <optgroup label="Service">
                  <option value="not_telehealth_suitable">Not available via telehealth</option>
                  <option value="outside_scope">Outside scope of telehealth practice</option>
                </optgroup>
                <optgroup label="Compliance">
                  <option value="prescribing_guidelines">Against prescribing guidelines</option>
                  <option value="controlled_substance">Request for controlled/S8 substance</option>
                </optgroup>
                <optgroup label="Administrative">
                  <option value="insufficient_info">Insufficient information provided</option>
                  <option value="patient_not_eligible">Patient doesn&apos;t meet service criteria</option>
                  <option value="duplicate_request">Duplicate of existing request</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="other">Other reason (specify below)</option>
                </optgroup>
              </select>
            </div>

            {/* AI Generate Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateDeclineReason}
              disabled={isGeneratingDeclineReason}
              className="w-full rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 border-violet-200 text-violet-700"
            >
              {isGeneratingDeclineReason ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Decline Message
                </>
              )}
            </Button>

            {/* Editable Decline Reason */}
            <div>
              <label className="text-sm font-medium mb-2 block">Message to Patient <span className="text-red-500">*</span></label>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter a compassionate explanation for the patient. This will be sent via email."
                className="min-h-[120px] rounded-xl text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This message will appear in the patient&apos;s email notification.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleStatusChange("declined")}
              disabled={!declineReason.trim() || !declineReasonCode}
              className="rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Decline & Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* eScript Sent Dialog */}
      <AlertDialog open={showEScriptDialog} onOpenChange={(open) => {
        setShowEScriptDialog(open)
        if (!open) {
          // Reset state when closing
          setParchmentReference("")
          setSentVia("parchment")
        }
      }}>
        <AlertDialogContent className="rounded-2xl max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark eScript as Sent</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Confirm that you have entered the prescription in Parchment or issued a paper script. This will complete the request and notify the patient.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Sent Via Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">How was the script sent?</label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={sentVia === "parchment" ? "default" : "outline"}
                  onClick={() => setSentVia("parchment")}
                  className={`flex-1 rounded-xl ${sentVia === "parchment" ? "bg-violet-600 hover:bg-violet-700" : ""}`}
                >
                  eScript (Parchment)
                </Button>
                <Button
                  type="button"
                  variant={sentVia === "paper" ? "default" : "outline"}
                  onClick={() => setSentVia("paper")}
                  className={`flex-1 rounded-xl ${sentVia === "paper" ? "bg-violet-600 hover:bg-violet-700" : ""}`}
                >
                  Paper Script
                </Button>
              </div>
            </div>

            {/* Parchment Reference (optional) */}
            {sentVia === "parchment" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Parchment Reference (optional)</label>
                <input
                  type="text"
                  value={parchmentReference}
                  onChange={(e) => setParchmentReference(e.target.value)}
                  placeholder="e.g., PAR-12345678"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the Parchment reference ID for tracking purposes.
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isMarkingEScript}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleMarkEScriptSent}
              disabled={isMarkingEScript}
              className="rounded-xl bg-violet-600 hover:bg-violet-700"
            >
              {isMarkingEScript ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm & Complete
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
