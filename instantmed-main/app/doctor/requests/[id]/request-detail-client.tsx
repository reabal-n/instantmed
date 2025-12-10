"use client"

import { useState, useTransition } from "react"
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
  FlaskConical,
} from "lucide-react"
import { updateStatusAction, saveClinicalNoteAction } from "./actions"
import type { RequestWithDetails, RequestStatus, GeneratedDocument } from "@/types/db"

interface RequestDetailClientProps {
  request: RequestWithDetails
  patientAge: number
  maskedMedicare: string
  formatCategory: (category: string | null | undefined) => string
  formatSubtype: (subtype: string | null | undefined) => string
  formatRequestType: (type: string) => string
  existingDocument?: GeneratedDocument | null
}

export function RequestDetailClient({
  request,
  patientAge,
  maskedMedicare,
  formatCategory,
  formatSubtype,
  formatRequestType,
  existingDocument,
}: RequestDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [clinicalNote, setClinicalNote] = useState(request.clinical_note || "")
  const [noteSaved, setNoteSaved] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleStatusChange = async (status: RequestStatus) => {
    startTransition(async () => {
      const result = await updateStatusAction(request.id, status)
      if (result.success) {
        setActionMessage({
          type: "success",
          text: `Request ${status === "approved" ? "approved" : status === "declined" ? "declined" : "marked as needs follow-up"}`,
        })
        setTimeout(() => {
          router.push("/doctor")
        }, 1500)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100/80 text-amber-700 border-0 font-medium">Pending</Badge>
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

  const getInitials = (name: string) => {
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
  const isReferral = request.category === "referral"
  const isSpecialistReferral = isReferral && request.subtype === "specialist"
  const isPathologyReferral = isReferral && request.subtype === "pathology-imaging"

  const referralAnswers = {
    // Specialist fields
    specialistType: answers.specialist_type_label || answers.specialist_type,
    diagnosisStatus: answers.diagnosis_status_label || answers.diagnosis_status,
    duration: answers.duration_label || answers.duration,
    impact: answers.impact_label || answers.impact,
    reasonForReferral: answers.reason_for_referral,
    existingSpecialist: answers.existing_specialist,
    // Pathology/imaging fields
    testTypes: answers.test_types_labels || answers.test_types,
    recommendation: answers.recommendation_label || answers.recommendation,
    symptomDuration: answers.symptom_duration_label || answers.symptom_duration,
    severity: answers.severity_label || answers.severity,
    symptomsConcern: answers.symptoms_concern,
    previousTests: answers.previous_tests,
  }

  // Medical cert / prescription grouped answers
  const groupedAnswersForPrescriptionAndMedCert = {
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
                : request.status === "approved"
                  ? "bg-emerald-100 text-emerald-700 border-0"
                  : request.status === "declined"
                    ? "bg-red-100 text-red-700 border-0"
                    : "bg-blue-100 text-blue-700 border-0"
            }
          >
            {request.status.replace("_", " ")}
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
          <Textarea
            value={clinicalNote}
            onChange={(e) => setClinicalNote(e.target.value)}
            placeholder="Add internal notes about this request..."
            className="min-h-[100px] rounded-xl"
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
        ) : isPathologyReferral ? (
          <Button asChild disabled={isPending || request.status !== "pending"} className="rounded-xl btn-glow">
            <Link href={`/doctor/requests/${request.id}/pathology-document`}>
              <FlaskConical className="mr-2 h-4 w-4" />
              Build Pathology Request
            </Link>
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
            ) : isPathologyReferral ? (
              <Button asChild disabled={isPending} className="flex-1 rounded-xl btn-glow">
                <Link href={`/doctor/requests/${request.id}/pathology-document`}>
                  <FlaskConical className="mr-2 h-4 w-4" />
                  Build Request
                </Link>
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

      {/* Decline Confirmation Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this request?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will decline the patient's request. They will be notified via email. Make sure you have added
              clinical notes explaining the reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleStatusChange("declined")}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Decline Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
