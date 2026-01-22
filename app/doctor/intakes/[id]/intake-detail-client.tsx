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
} from "lucide-react"
import { updateStatusAction, saveDoctorNotesAction, declineIntakeAction, markScriptSentAction, markAsRefundedAction } from "@/app/doctor/queue/actions"
import { logViewedIntakeAnswersAction, logViewedSafetyFlagsAction } from "@/app/actions/clinician-audit"
import { acquireIntakeLockAction, releaseIntakeLockAction, extendIntakeLockAction } from "@/app/actions/intake-lock"
import { formatIntakeStatus, formatServiceType } from "@/lib/format-intake"
import type { IntakeWithDetails, IntakeWithPatient, IntakeStatus, DeclineReasonCode } from "@/types/db"
import type { AIDraft } from "@/app/actions/draft-approval"
import { DraftReviewPanel } from "@/components/doctor/draft-review-panel"
import { ClinicalSummary } from "@/components/doctor/clinical-summary"
import { useDoctorShortcuts } from "@/hooks/use-doctor-shortcuts"

interface IntakeDetailClientProps {
  intake: IntakeWithDetails
  patientAge: number
  maskedMedicare: string
  previousIntakes?: IntakeWithPatient[]
  initialAction?: string
  aiDrafts?: AIDraft[]
}

// P0 DOCTOR_WORKLOAD_AUDIT: Pre-filled decline reason templates to equalize approve/decline effort
const DECLINE_REASONS: { code: DeclineReasonCode; label: string; template: string }[] = [
  { 
    code: "requires_examination", 
    label: "Requires in-person examination",
    template: "This condition requires a physical examination that cannot be conducted via telehealth. Please see your regular GP or visit a clinic for an in-person assessment."
  },
  { 
    code: "not_telehealth_suitable", 
    label: "Not suitable for telehealth",
    template: "Based on the information provided, this request is not suitable for an asynchronous telehealth consultation. Please book a video/phone consultation or see your regular GP."
  },
  { 
    code: "prescribing_guidelines", 
    label: "Against prescribing guidelines",
    template: "This request cannot be fulfilled as it does not align with current prescribing guidelines. Please discuss with your regular GP who has access to your full medical history."
  },
  { 
    code: "controlled_substance", 
    label: "Controlled substance request",
    template: "This medication is a controlled substance and cannot be prescribed via this telehealth service. Please see your regular GP who can assess you in person."
  },
  { 
    code: "urgent_care_needed", 
    label: "Requires urgent care",
    template: "Based on your symptoms, you may need more urgent assessment. Please visit your nearest emergency department or call 000 if experiencing a medical emergency."
  },
  { 
    code: "insufficient_info", 
    label: "Insufficient information",
    template: "We need more information to safely assess your request. Please provide additional details about your condition and medical history, or see your regular GP."
  },
  { 
    code: "patient_not_eligible", 
    label: "Patient not eligible",
    template: "Based on the eligibility criteria, we are unable to process this request. Please see your regular GP for assistance."
  },
  { 
    code: "outside_scope", 
    label: "Outside scope of practice",
    template: "This request falls outside the scope of what can be safely managed via telehealth. Please consult with your regular GP or an appropriate specialist."
  },
  { 
    code: "other", 
    label: "Other reason",
    template: ""
  },
]

export function IntakeDetailClient({
  intake,
  patientAge,
  maskedMedicare,
  previousIntakes = [],
  initialAction,
  aiDrafts = [],
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
          router.push(`/doctor/intakes/${intake.id}/document`)
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

  const handleStatusChange = async (status: IntakeStatus) => {
    // P0 SAFETY: Block approval if red flags not acknowledged
    if ((status === "approved" || status === "awaiting_script") && hasRedFlags && !redFlagsAcknowledged) {
      setActionMessage({
        type: "error",
        text: "This case has safety flags that require acknowledgment before approval. Please review and acknowledge the flags below.",
      })
      return
    }
    
    // P1 RK-1: Require clinical notes before approval per MEDICOLEGAL_AUDIT_REPORT
    if ((status === "approved" || status === "awaiting_script") && doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH) {
      setActionMessage({
        type: "error",
        text: `Clinical notes required before approval. Please add at least ${MIN_CLINICAL_NOTES_LENGTH} characters documenting your clinical reasoning.`,
      })
      return
    }

    startTransition(async () => {
      // Save notes first if approving
      if (status === "approved" || status === "awaiting_script") {
        await saveDoctorNotesAction(intake.id, doctorNotes)
      }

      const result = await updateStatusAction(intake.id, status, intake.patient_id)
      if (result.success) {
        setActionMessage({
          type: "success",
          text: `Case ${status === "approved" ? "approved" : "updated"}`,
        })
        setTimeout(() => router.push("/doctor/queue"), 2000)
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to update status" })
      }
    })
  }

  const handleDecline = async () => {
    if (!declineReason.trim()) return
    startTransition(async () => {
      const result = await declineIntakeAction(intake.id, declineReasonCode, declineReason)
      if (result.success) {
        setShowDeclineDialog(false)
        setActionMessage({ type: "success", text: "Case declined" })
        setTimeout(() => router.push("/doctor/queue"), 2000)
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to decline" })
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
        setActionMessage({ type: "error", text: result.error || "Failed to save notes" })
      }
    })
  }

  const handleMarkScriptSent = async () => {
    startTransition(async () => {
      const result = await markScriptSentAction(intake.id, parchmentReference || undefined)
      if (result.success) {
        setShowScriptDialog(false)
        setActionMessage({ type: "success", text: "Script marked as sent" })
        setTimeout(() => router.push("/doctor/queue"), 2000)
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to mark script sent" })
      }
    })
  }

  const handleMarkRefunded = async () => {
    startTransition(async () => {
      const result = await markAsRefundedAction(intake.id, refundReason || undefined)
      if (result.success) {
        setShowRefundDialog(false)
        setActionMessage({ type: "success", text: "Marked as refunded" })
        setTimeout(() => router.push("/doctor/queue"), 2000)
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to mark as refunded" })
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
                <p className="font-medium">{patientAge}y • {new Date(intake.patient.date_of_birth).toLocaleDateString("en-AU")}</p>
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
            <div className="flex items-start gap-2 col-span-2">
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

      {/* Doctor Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Clinical Notes (Private)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
                return (
                  <div key={prev.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">{prevService?.short_name || "Request"}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {formatIntakeStatus(prev.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(prev.created_at).toLocaleDateString("en-AU")}
                      </span>
                    </div>
                  </div>
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
            {/* For med certs - go to document builder */}
            {service?.type === "med_certs" && intake.status !== "approved" && (
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link href={`/doctor/intakes/${intake.id}/document`}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Generate Certificate
                </Link>
              </Button>
            )}

            {/* For repeat scripts - approve then mark sent externally */}
            {(service?.type === "repeat_rx" || service?.type === "common_scripts") && intake.status === "paid" && (
              <Button onClick={() => handleStatusChange("awaiting_script")} className="bg-primary hover:bg-primary/90" disabled={isPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Script
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
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Consultation
              </Button>
            )}

            {/* Generic approve for other services */}
            {!["med_certs", "repeat_rx", "common_scripts", "consults"].includes(service?.type || "") && intake.status === "paid" && (
              <Button onClick={() => handleStatusChange("approved")} className="bg-primary hover:bg-primary/90" disabled={isPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
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
              <Button variant="outline" onClick={() => setShowRefundDialog(true)} disabled={isPending} className="text-dawn-600 border-amber-300 hover:bg-amber-50">
                <CreditCard className="h-4 w-4 mr-2" />
                Mark Refunded
              </Button>
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
            <AlertDialogAction onClick={handleDecline} disabled={!declineReason.trim() || isPending} className="bg-destructive hover:bg-destructive/90">
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
            <AlertDialogAction onClick={handleMarkRefunded} disabled={isPending} className="bg-dawn-600 hover:bg-amber-700">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Refunded
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
