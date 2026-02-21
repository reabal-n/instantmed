"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Save,
  User,
  Clock,
  Loader2,
  Send,
  Mail,
} from "lucide-react"
import { updateStatusAction, saveDoctorNotesAction, declineIntakeAction, markScriptSentAction, markAsRefundedAction } from "@/app/doctor/queue/actions"
import { resendCertificateAdmin } from "@/app/actions/resend-certificate-admin"
import { regenerateCertificateAction } from "@/app/actions/regenerate-certificate"
import { generateMedCertPdfAndApproveAction, fetchCertPreviewDataAction, approveWithPreviewDataAction } from "@/app/doctor/intakes/[id]/document/actions"
import { CertificatePreviewDialog, type CertificatePreviewData } from "@/components/doctor/certificate-preview-dialog"
import { logViewedIntakeAnswersAction, logViewedSafetyFlagsAction } from "@/app/actions/clinician-audit"
import { acquireIntakeLockAction, releaseIntakeLockAction, extendIntakeLockAction } from "@/app/actions/intake-lock"
import { formatIntakeStatus, formatServiceType } from "@/lib/format-intake"
import type { IntakeWithDetails, IntakeWithPatient, IntakeStatus, DeclineReasonCode } from "@/types/db"
import type { AIDraft } from "@/app/actions/draft-approval"
import { DraftReviewPanel } from "@/components/doctor/draft-review-panel"
import { ClinicalSummary } from "@/components/doctor/clinical-summary"
import { ChatTranscriptPanel } from "@/components/doctor/chat-transcript-panel"
import { RepeatPrescriptionChecklist } from "@/components/doctor/repeat-prescription-checklist"
import { useDoctorShortcuts } from "@/hooks/use-doctor-shortcuts"
import { toast } from "sonner"

interface IntakeDetailClientProps {
  intake: IntakeWithDetails
  patientAge: number | null
  maskedMedicare: string
  previousIntakes?: IntakeWithPatient[]
  initialAction?: string
  aiDrafts?: AIDraft[]
  nextIntakeId?: string | null
  draftId?: string | null
}

// P0 DOCTOR_WORKLOAD_AUDIT: Pre-filled decline reason templates to equalize approve/decline effort
const DECLINE_REASONS: { code: DeclineReasonCode; label: string; template: string }[] = [
  { 
    code: "requires_examination", 
    label: "Requires in-person examination",
    template: "This condition requires a physical examination that cannot be conducted via telehealth. Please see your regular doctor or visit a clinic for an in-person assessment."
  },
  { 
    code: "not_telehealth_suitable", 
    label: "Not suitable for telehealth",
    template: "Based on the information provided, this request is not suitable for an asynchronous telehealth consultation. Please book a video/phone consultation or see your regular doctor."
  },
  { 
    code: "prescribing_guidelines", 
    label: "Against prescribing guidelines",
    template: "This request cannot be fulfilled as it does not align with current prescribing guidelines. Please discuss with your regular doctor who has access to your full medical history."
  },
  { 
    code: "controlled_substance", 
    label: "Controlled substance request",
    template: "This medication is a controlled substance and cannot be prescribed via this telehealth service. Please see your regular doctor who can assess you in person."
  },
  { 
    code: "urgent_care_needed", 
    label: "Requires urgent care",
    template: "Based on your symptoms, you may need more urgent assessment. Please visit your nearest emergency department or call 000 if experiencing a medical emergency."
  },
  { 
    code: "insufficient_info", 
    label: "Insufficient information",
    template: "We need more information to safely assess your request. Please provide additional details about your condition and medical history, or see your regular doctor."
  },
  { 
    code: "patient_not_eligible", 
    label: "Patient not eligible",
    template: "Based on the eligibility criteria, we are unable to process this request. Please see your regular doctor for assistance."
  },
  { 
    code: "outside_scope", 
    label: "Outside scope of practice",
    template: "This request falls outside the scope of what can be safely managed via telehealth. Please consult with your regular doctor or an appropriate specialist."
  },
  { 
    code: "other", 
    label: "Other reason",
    template: ""
  },
]

// Format consult subtype for display
function formatConsultSubtype(subtype: string): string {
  const labels: Record<string, string> = {
    general: 'General consult',
    new_medication: 'New medication',
    ed: 'Erectile dysfunction',
    hair_loss: 'Hair loss',
    womens_health: "Women's health",
    weight_loss: 'Weight loss',
  }
  return labels[subtype] || subtype.replace(/_/g, ' ')
}

export function IntakeDetailClient({
  intake,
  patientAge,
  maskedMedicare,
  previousIntakes = [],
  initialAction,
  aiDrafts = [],
  nextIntakeId,
  draftId,
}: IntakeDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [doctorNotes, setDoctorNotes] = useState(intake.doctor_notes || "")
  const [noteSaved, setNoteSaved] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(initialAction === "decline")
  const [showScriptDialog, setShowScriptDialog] = useState(false)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [declineReason, setDeclineReason] = useState(DECLINE_REASONS[0].template)
  const [declineReasonCode, setDeclineReasonCode] = useState<DeclineReasonCode>("requires_examination")
  
  // P0 DOCTOR_WORKLOAD_AUDIT: Auto-populate template when reason changes
  const handleDeclineReasonCodeChange = (code: DeclineReasonCode) => {
    setDeclineReasonCode(code)
    const template = DECLINE_REASONS.find(r => r.code === code)?.template || ""
    setDeclineReason(template)
  }
  const [parchmentReference, setParchmentReference] = useState("")
  const [refundReason, setRefundReason] = useState("")
  
  // P0 SAFETY: Red flag acknowledgment before approval
  const [redFlagsAcknowledged, setRedFlagsAcknowledged] = useState(false)

  // Certificate preview dialog
  const [showCertPreview, setShowCertPreview] = useState(false)
  const [certPreviewData, setCertPreviewData] = useState<CertificatePreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined
  
  // P0 SAFETY: Detect red flags that require acknowledgment before approval
  const intakeAnswers = intake.answers?.answers as Record<string, unknown> | undefined
  const hasRedFlags = Boolean(
    intakeAnswers?.red_flags_detected || 
    intakeAnswers?.emergency_symptoms ||
    intake.risk_tier === "high" ||
    intake.requires_live_consult
  )
  const redFlagDetails = [
    intakeAnswers?.red_flags_detected && `Red flags: ${intakeAnswers.red_flags_detected}`,
    intakeAnswers?.emergency_symptoms && `Emergency symptoms: ${intakeAnswers.emergency_symptoms}`,
    intake.risk_tier === "high" && "High risk tier",
    intake.requires_live_consult && "Requires live consult",
  ].filter(Boolean) as string[]
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const viewStartTime = useRef<number>(Date.now())
  const hasLoggedView = useRef(false)

  // P1 MEDICOLEGAL: Log clinician view events for audit trail
  // P1 EFFICIENCY: Acquire soft lock to prevent duplicate review work
  useEffect(() => {
    if (hasLoggedView.current) return
    hasLoggedView.current = true
    
    // Log that clinician viewed intake answers
    logViewedIntakeAnswersAction(intake.id, service?.type)
    
    // Log safety flags view if present
    const flagAnswers = intake.answers?.answers as Record<string, unknown> | undefined
    if (flagAnswers?.red_flags_detected || flagAnswers?.yellow_flags_detected || flagAnswers?.emergency_symptoms) {
      logViewedSafetyFlagsAction(intake.id, service?.type)
    }
    
    // Acquire soft lock on intake
    acquireIntakeLockAction(intake.id).then((result) => {
      if (result.warning) {
        setActionMessage({
          type: "error",
          text: result.warning,
        })
      }
    })
    
    // Extend lock periodically while viewing
    const lockInterval = setInterval(() => {
      extendIntakeLockAction(intake.id)
    }, 5 * 60 * 1000) // Every 5 minutes
    
    // Log page unload to capture view duration and release lock
    const handleUnload = () => {
      const duration = Date.now() - viewStartTime.current
      // Fire-and-forget - can't await on unload
      navigator.sendBeacon?.(
        '/api/doctor/log-view-duration',
        JSON.stringify({ intakeId: intake.id, durationMs: duration })
      )
      // Release lock on page unload
      releaseIntakeLockAction(intake.id)
    }
    
    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      clearInterval(lockInterval)
      // Release lock on component unmount
      releaseIntakeLockAction(intake.id)
    }
  }, [intake.id, intake.answers, service?.type])

  // P1 RK-1: Minimum clinical notes length for defensibility
  const MIN_CLINICAL_NOTES_LENGTH = 20

  // P2 DOCTOR_WORKLOAD_AUDIT: Keyboard shortcuts for faster workflow
  useDoctorShortcuts({
    onApprove: () => {
      if (intake.status === "paid" && !isPending) {
        if (service?.type === "med_certs") {
          handleMedCertApprove()
        } else if (service?.type === "repeat_rx" || service?.type === "common_scripts") {
          handleStatusChange("awaiting_script")
        } else {
          handleStatusChange("approved")
        }
      }
    },
    onDecline: () => {
      if (!["approved", "declined", "completed"].includes(intake.status)) {
        setShowDeclineDialog(true)
      }
    },
    onNext: () => router.push("/doctor/queue"),
    onNote: () => notesRef.current?.focus(),
    onEscape: () => {
      setShowDeclineDialog(false)
      setShowScriptDialog(false)
      setShowRefundDialog(false)
    },
    disabled: isPending,
  })

  // Auto-advance: go to next intake in queue, or back to queue if none
  const advanceToNext = () => {
    if (nextIntakeId) {
      router.push(`/doctor/intakes/${nextIntakeId}`)
    } else {
      router.push("/doctor/queue")
    }
  }

  // Med cert approval: show preview dialog first, then approve on confirm
  const handleMedCertApprove = async () => {
    // P0 SAFETY: Block approval if red flags not acknowledged
    if (hasRedFlags && !redFlagsAcknowledged) {
      toast.error("Review and acknowledge safety flags before approving.")
      return
    }

    // P1 RK-1: Require clinical notes before approval
    if (doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH) {
      toast.error(`Clinical notes required (min ${MIN_CLINICAL_NOTES_LENGTH} chars).`)
      notesRef.current?.focus()
      return
    }

    // Fetch draft data and show preview dialog
    setIsLoadingPreview(true)
    try {
      const result = await fetchCertPreviewDataAction(intake.id, draftId || "")
      if (result.success && result.data) {
        setCertPreviewData(result.data)
        setShowCertPreview(true)
      } else {
        toast.error(result.error || "Failed to load certificate data")
      }
    } catch {
      toast.error("Failed to load certificate preview")
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Called when doctor confirms the preview dialog
  const handleCertPreviewConfirm = async (editedData: CertificatePreviewData) => {
    startTransition(async () => {
      // Save clinical notes first
      await saveDoctorNotesAction(intake.id, doctorNotes)

      const result = await approveWithPreviewDataAction(intake.id, {
        startDate: editedData.startDate,
        endDate: editedData.endDate,
        medicalReason: editedData.medicalReason,
        doctorName: editedData.doctorName,
        consultDate: editedData.consultDate,
      })

      if (result.success) {
        setShowCertPreview(false)
        const emailNote = result.emailStatus === "sent"
          ? "Certificate approved and sent to patient."
          : "Certificate approved. Email will be sent shortly."
        toast.success(emailNote)
        setTimeout(advanceToNext, 1000)
      } else {
        toast.error(result.error || "Failed to approve certificate")
      }
    })
  }

  const handleStatusChange = async (status: IntakeStatus) => {
    // P0 SAFETY: Block approval if red flags not acknowledged
    if ((status === "approved" || status === "awaiting_script") && hasRedFlags && !redFlagsAcknowledged) {
      toast.error("Review and acknowledge safety flags before approving.")
      return
    }

    // P1 RK-1: Require clinical notes before approval per MEDICOLEGAL_AUDIT_REPORT
    if ((status === "approved" || status === "awaiting_script") && doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH) {
      toast.error(`Clinical notes required (min ${MIN_CLINICAL_NOTES_LENGTH} chars).`)
      notesRef.current?.focus()
      return
    }

    startTransition(async () => {
      // Save notes first if approving
      if (status === "approved" || status === "awaiting_script") {
        await saveDoctorNotesAction(intake.id, doctorNotes)
      }

      // Note: server action uses authenticated profile.id internally; this param is vestigial
      const result = await updateStatusAction(intake.id, status, intake.id)
      if (result.success) {
        toast.success(status === "approved" ? "Case approved" : "Case updated")
        setTimeout(advanceToNext, 1000)
      } else {
        toast.error(result.error || "Failed to update status")
      }
    })
  }

  const handleDecline = async () => {
    if (!declineReason.trim()) return
    startTransition(async () => {
      const result = await declineIntakeAction(intake.id, declineReasonCode, declineReason)
      if (result.success) {
        setShowDeclineDialog(false)
        toast.success("Case declined and patient notified")
        setTimeout(advanceToNext, 1000)
      } else {
        toast.error(result.error || "Failed to decline")
      }
    })
  }

  const handleSaveNotes = async () => {
    startTransition(async () => {
      const result = await saveDoctorNotesAction(intake.id, doctorNotes)
      if (result.success) {
        setNoteSaved(true)
        setTimeout(() => setNoteSaved(false), 3000)
      } else {
        toast.error(result.error || "Failed to save notes")
      }
    })
  }

  const handleMarkScriptSent = async () => {
    startTransition(async () => {
      const result = await markScriptSentAction(intake.id, parchmentReference || undefined)
      if (result.success) {
        setShowScriptDialog(false)
        toast.success("Script marked as sent")
        setTimeout(advanceToNext, 1000)
      } else {
        toast.error(result.error || "Failed to mark script sent")
      }
    })
  }

  const handleMarkRefunded = async () => {
    startTransition(async () => {
      const result = await markAsRefundedAction(intake.id, refundReason || undefined)
      if (result.success) {
        setShowRefundDialog(false)
        toast.success("Marked as refunded")
        setTimeout(advanceToNext, 1000)
      } else {
        toast.error(result.error || "Failed to mark as refunded")
      }
    })
  }

  const handleResendCertificate = () => {
    startTransition(async () => {
      const result = await resendCertificateAdmin(intake.id)
      if (result.success) {
        toast.success("Certificate email resent to patient")
      } else {
        toast.error(result.error || "Failed to resend certificate")
      }
    })
  }

  const handleRegenerateCertificate = () => {
    startTransition(async () => {
      const result = await regenerateCertificateAction({
        intakeId: intake.id,
        reason: "Doctor requested regeneration"
      })
      if (result.success) {
        toast.success("Certificate regeneration initiated")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to regenerate certificate")
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "completed":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
      case "declined":
        return "bg-destructive/10 text-destructive"
      case "pending_info":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      case "awaiting_script":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
      default:
        return "bg-primary/10 text-primary"
    }
  }

  // Parse answers for display
  const answers = intake.answers?.answers || {}

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/doctor/queue">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Queue
          </Link>
        </Button>
        <Badge className={getStatusColor(intake.status)}>
          {formatIntakeStatus(intake.status)}
        </Badge>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-lg ${
            actionMessage.type === "success" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-destructive/10 text-destructive"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Patient Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{intake.patient.full_name}</p>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Age / DOB</p>
                <p className="font-medium">{patientAge != null ? `${patientAge}y` : "N/A"} • {intake.patient.date_of_birth ? new Date(intake.patient.date_of_birth).toLocaleDateString("en-AU") : "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Medicare</p>
                <p className="font-medium font-mono">{maskedMedicare}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{intake.patient.phone || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-sm truncate">{intake.patient.email || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">
                  {intake.patient.suburb || "N/A"}, {intake.patient.state || ""}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {service?.name || formatServiceType(service?.type || "")}
            {/* Display consult subtype for consult service */}
            {intake.category === 'consult' && intake.subtype && intake.subtype !== 'general' && (
              <Badge variant="secondary" className="ml-2 text-xs font-normal">
                {formatConsultSubtype(intake.subtype)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Submitted: {formatDate(intake.created_at)}
            </div>
            {intake.paid_at && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Paid: {formatDate(intake.paid_at)}
              </div>
            )}
          </div>

          {/* P1 DOCTOR_WORKLOAD_AUDIT: Structured clinical summary instead of raw JSON */}
          {Object.keys(answers).length > 0 && (
            <ClinicalSummary 
              answers={answers} 
              serviceType={service?.type}
              consultSubtype={intake.category === 'consult' && intake.subtype ? intake.subtype : undefined}
              className="border-0 shadow-none p-0"
            />
          )}
        </CardContent>
      </Card>

      {/* AI-Generated Drafts */}
      {aiDrafts.length > 0 && (
        <DraftReviewPanel
          drafts={aiDrafts}
          intakeId={intake.id}
          onDraftApproved={() => router.refresh()}
          onDraftRejected={() => router.refresh()}
        />
      )}

      {/* AI Chat Transcript */}
      <ChatTranscriptPanel intakeId={intake.id} />

      {/* Repeat Prescription Checklist */}
      {service?.type === "common_scripts" && (
        <RepeatPrescriptionChecklist
          intakeId={intake.id}
          intakeStatus={intake.status}
          aiDrafts={aiDrafts}
          prescriptionSentAt={intake.prescription_sent_at || null}
          prescriptionSentBy={intake.prescription_sent_by || null}
          prescriptionSentChannel={intake.prescription_sent_channel || null}
        />
      )}

      {/* Doctor Notes - Editable for pending, read-only for approved/completed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {["approved", "completed", "awaiting_script"].includes(intake.status)
              ? "Approved Clinical Note"
              : "Clinical Notes (Private)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {["approved", "completed", "awaiting_script"].includes(intake.status) ? (
            // Read-only view for approved intakes
            <div className="space-y-2">
              {intake.doctor_notes ? (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm whitespace-pre-wrap">{intake.doctor_notes}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No clinical notes recorded for this case.</p>
              )}
              {intake.reviewed_at && (
                <p className="text-xs text-muted-foreground">
                  Reviewed on {new Date(intake.reviewed_at).toLocaleString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          ) : (
            // Editable view for pending intakes
            <>
              <Textarea
                ref={notesRef}
                placeholder="Add your clinical notes here... (⌘+N to focus)"
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                className="min-h-[120px]"
              />
              <div className="flex items-center gap-2">
                <Button onClick={handleSaveNotes} disabled={isPending} variant="outline">
                  <Save className="h-4 w-4 mr-2" />
                  Save Notes
                </Button>
                {noteSaved && <span className="text-sm text-emerald-600">Saved!</span>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Patient History */}
      {previousIntakes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {previousIntakes.map((prev) => {
                const prevService = prev.service as { short_name?: string } | undefined
                const hasNotes = Boolean(prev.doctor_notes)
                return (
                  <Link 
                    key={prev.id} 
                    href={`/doctor/intakes/${prev.id}`}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{prevService?.short_name || "Request"}</span>
                      {hasNotes && (
                        <Badge variant="outline" className="text-xs h-4 px-1 bg-violet-50 text-violet-700 border-violet-200">
                          <FileText className="h-2.5 w-2.5 mr-0.5" />
                          Note
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {formatIntakeStatus(prev.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(prev.created_at).toLocaleDateString("en-AU")}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* P0 SAFETY: Red Flag Acknowledgment Card */}
      {hasRedFlags && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Safety Flags Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1">
              {redFlagDetails.map((detail, i) => (
                <p key={i} className="text-destructive-foreground">• {detail}</p>
              ))}
            </div>
            <div className="flex items-center space-x-2 pt-2 border-t border-destructive/20">
              <input
                type="checkbox"
                id="acknowledge-flags"
                checked={redFlagsAcknowledged}
                onChange={(e) => setRedFlagsAcknowledged(e.target.checked)}
                className="h-4 w-4 rounded border-destructive text-destructive focus:ring-destructive"
              />
              <label htmlFor="acknowledge-flags" className="text-sm font-medium text-destructive-foreground">
                I have reviewed these safety flags and determined it is appropriate to proceed
              </label>
            </div>
            {!redFlagsAcknowledged && (
              <p className="text-xs text-muted-foreground italic">
                You must acknowledge safety flags before approving this case.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            {/* For med certs - preview then approve: shows preview dialog first */}
            {service?.type === "med_certs" && intake.status !== "approved" && (
              <Button onClick={handleMedCertApprove} className="bg-emerald-600 hover:bg-emerald-700" disabled={isPending || isLoadingPreview}>
                {(isPending || isLoadingPreview) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {isLoadingPreview ? "Loading Preview..." : isPending ? "Generating Certificate..." : "Review & Send Certificate"}
              </Button>
            )}

            {/* For repeat scripts - approve then mark sent externally */}
            {(service?.type === "repeat_rx" || service?.type === "common_scripts") && intake.status === "paid" && (
              <Button onClick={() => handleStatusChange("awaiting_script")} className="bg-primary hover:bg-primary/90" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {isPending ? "Approving..." : "Approve Script"}
              </Button>
            )}

            {/* Mark script as sent (for awaiting_script status) */}
            {intake.status === "awaiting_script" && (
              <Button onClick={() => setShowScriptDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                <Send className="h-4 w-4 mr-2" />
                Mark Script Sent
              </Button>
            )}

            {/* For consults - approve after call with notes */}
            {service?.type === "consults" && intake.status === "paid" && (
              <Button onClick={() => handleStatusChange("approved")} className="bg-primary hover:bg-primary/90" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {isPending ? "Completing..." : "Complete Consultation"}
              </Button>
            )}

            {/* Generic approve for other services */}
            {!["med_certs", "repeat_rx", "common_scripts", "consults"].includes(service?.type || "") && intake.status === "paid" && (
              <Button onClick={() => handleStatusChange("approved")} className="bg-primary hover:bg-primary/90" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {isPending ? "Approving..." : "Approve"}
              </Button>
            )}

            {/* Decline */}
            {!["approved", "declined", "completed"].includes(intake.status) && (
              <Button variant="destructive" onClick={() => setShowDeclineDialog(true)} disabled={isPending}>
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            )}

            {/* Refund - show for paid intakes that haven't been refunded */}
            {intake.payment_status === "paid" && (
              <Button variant="outline" onClick={() => setShowRefundDialog(true)} disabled={isPending} className="text-amber-600 border-amber-300 hover:bg-amber-50">
                <CreditCard className="h-4 w-4 mr-2" />
                Mark Refunded
              </Button>
            )}

            {/* Resend Certificate - show for approved med certs */}
            {["approved", "completed"].includes(intake.status) && 
             (intake.category === "medical_certificate" || intake.category === "med_certs") && (
              <>
                <Button variant="outline" onClick={handleResendCertificate} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  Resend Certificate
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleRegenerateCertificate} 
                  disabled={isPending}
                  className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20"
                >
                  {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Regenerate Certificate
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Request</AlertDialogTitle>
            <AlertDialogDescription>
              Please select a reason and provide details for declining this request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={declineReasonCode} onValueChange={(v) => handleDeclineReasonCodeChange(v as DeclineReasonCode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECLINE_REASONS.map((r) => (
                    <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                placeholder="Provide additional details..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleDecline()
              }} 
              disabled={!declineReason.trim() || isPending} 
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Decline Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Script Sent Dialog */}
      <AlertDialog open={showScriptDialog} onOpenChange={setShowScriptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Script as Sent</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that you have sent the prescription via Parchment or other means.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Parchment Reference (optional)</Label>
              <Input
                placeholder="e.g., PAR-12345"
                value={parchmentReference}
                onChange={(e) => setParchmentReference(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkScriptSent} disabled={isPending} className="bg-purple-600">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Sent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Dialog */}
      <AlertDialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Refunded</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that you have processed a refund for this request in Stripe. This will update the payment status to refunded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Refund Reason (optional)</Label>
              <Textarea
                placeholder="e.g., Patient requested cancellation"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkRefunded} disabled={isPending} className="bg-amber-600 hover:bg-amber-700">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Refunded
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Certificate Preview Dialog */}
      {certPreviewData && (
        <CertificatePreviewDialog
          open={showCertPreview}
          onOpenChange={setShowCertPreview}
          data={certPreviewData}
          onConfirm={handleCertPreviewConfirm}
          isPending={isPending}
        />
      )}
    </div>
  )
}
