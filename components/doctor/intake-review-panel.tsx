"use client"

import { useState, useTransition, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import Link from "next/link"
import { SheetPanel } from "@/components/panels/sheet-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  ExternalLink,
  Mail,
} from "lucide-react"
import { updateStatusAction, saveDoctorNotesAction, declineIntakeAction } from "@/app/doctor/queue/actions"
import { fetchCertPreviewDataAction, approveWithPreviewDataAction } from "@/app/doctor/intakes/[id]/document/actions"
import { CertificatePreviewDialog, type CertificatePreviewData } from "@/components/doctor/certificate-preview-dialog"
import { logViewedIntakeAnswersAction, logViewedSafetyFlagsAction } from "@/app/actions/clinician-audit"
import { acquireIntakeLockAction, releaseIntakeLockAction, extendIntakeLockAction } from "@/app/actions/intake-lock"
import { ClinicalSummary } from "@/components/doctor/clinical-summary"
import { DraftReviewPanel } from "@/components/doctor/draft-review-panel"
import { ChatTranscriptPanel } from "@/components/doctor/chat-transcript-panel"
import { formatIntakeStatus, formatServiceType } from "@/lib/format-intake"
import { usePanel } from "@/components/panels/panel-provider"
import { useDoctorShortcuts } from "@/hooks/use-doctor-shortcuts"
import type { IntakeWithDetails, IntakeStatus, DeclineReasonCode } from "@/types/db"
import type { AIDraft } from "@/app/actions/draft-approval"
import { toast } from "sonner"

// Decline reason templates (same as intake detail page)
const DECLINE_REASONS: { code: DeclineReasonCode; label: string; template: string }[] = [
  { code: "requires_examination", label: "Requires in-person examination", template: "This condition requires a physical examination that cannot be conducted via telehealth. Please see your regular doctor or visit a clinic for an in-person assessment." },
  { code: "not_telehealth_suitable", label: "Not suitable for telehealth", template: "Based on the information provided, this request is not suitable for an asynchronous telehealth consultation. Please book a video/phone consultation or see your regular doctor." },
  { code: "prescribing_guidelines", label: "Against prescribing guidelines", template: "This request cannot be fulfilled as it does not align with current prescribing guidelines. Please discuss with your regular doctor who has access to your full medical history." },
  { code: "controlled_substance", label: "Controlled substance request", template: "This medication is a controlled substance and cannot be prescribed via this telehealth service. Please see your regular doctor who can assess you in person." },
  { code: "urgent_care_needed", label: "Requires urgent care", template: "Based on your symptoms, you may need more urgent assessment. Please visit your nearest emergency department or call 000 if experiencing a medical emergency." },
  { code: "insufficient_info", label: "Insufficient information", template: "We need more information to safely assess your request. Please provide additional details about your condition and medical history, or see your regular doctor." },
  { code: "patient_not_eligible", label: "Patient not eligible", template: "Based on the eligibility criteria, we are unable to process this request. Please see your regular doctor for assistance." },
  { code: "outside_scope", label: "Outside scope of practice", template: "This request falls outside the scope of what can be safely managed via telehealth. Please consult with your regular doctor or an appropriate specialist." },
  { code: "other", label: "Other reason", template: "" },
]

interface ReviewData {
  intake: IntakeWithDetails
  patientAge: number | null
  maskedMedicare: string
  aiDrafts: AIDraft[]
  nextIntakeId: string | null
  draftId: string | null
}

interface IntakeReviewPanelProps {
  intakeId: string
  onActionComplete?: () => void
}

export function IntakeReviewPanel({ intakeId, onActionComplete }: IntakeReviewPanelProps) {
  const router = useRouter()
  const { userId } = useAuth()
  const { closePanel } = usePanel()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<ReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [doctorNotes, setDoctorNotes] = useState("")
  const [noteSaved, setNoteSaved] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declineReason, setDeclineReason] = useState(DECLINE_REASONS[0].template)
  const [declineReasonCode, setDeclineReasonCode] = useState<DeclineReasonCode>("requires_examination")

  // Safety flags
  const [redFlagsAcknowledged, setRedFlagsAcknowledged] = useState(false)

  // Certificate preview
  const [showCertPreview, setShowCertPreview] = useState(false)
  const [certPreviewData, setCertPreviewData] = useState<CertificatePreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  // Lock warning
  const [lockWarning, setLockWarning] = useState<string | null>(null)

  const notesRef = useRef<HTMLTextAreaElement>(null)
  const viewStartTime = useRef<number>(Date.now())
  const hasInitialized = useRef(false)

  const MIN_CLINICAL_NOTES_LENGTH = 20

  // Fetch data on mount
  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch(`/api/doctor/intakes/${intakeId}/review-data`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Failed to load" }))
          throw new Error(body.error || `HTTP ${res.status}`)
        }
        const reviewData: ReviewData = await res.json()
        if (!cancelled) {
          setData(reviewData)
          setDoctorNotes(reviewData.intake.doctor_notes || "")
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load intake data")
          setIsLoading(false)
        }
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [intakeId])

  // Audit logging + lock management (runs once after data loads)
  useEffect(() => {
    if (!data || hasInitialized.current) return
    hasInitialized.current = true

    const intake = data.intake
    const service = intake.service as { type?: string } | undefined

    // Log clinician viewed intake answers
    logViewedIntakeAnswersAction(intake.id, service?.type)

    // Log safety flags view if present
    const flagAnswers = intake.answers?.answers as Record<string, unknown> | undefined
    if (flagAnswers?.red_flags_detected || flagAnswers?.yellow_flags_detected || flagAnswers?.emergency_symptoms) {
      logViewedSafetyFlagsAction(intake.id, service?.type)
    }

    // Acquire soft lock
    acquireIntakeLockAction(intake.id).then((result) => {
      if (result.warning) {
        setLockWarning(result.warning)
      }
    })

    // Extend lock periodically
    const lockInterval = setInterval(() => {
      extendIntakeLockAction(intake.id)
    }, 5 * 60 * 1000)

    return () => {
      clearInterval(lockInterval)
      releaseIntakeLockAction(intake.id)
    }
  }, [data])

  // Handle panel close — release lock + log view duration
  const handlePanelClose = useCallback(() => {
    if (data) {
      const duration = Date.now() - viewStartTime.current
      navigator.sendBeacon?.(
        "/api/doctor/log-view-duration",
        JSON.stringify({ intakeId: data.intake.id, durationMs: duration })
      )
      releaseIntakeLockAction(data.intake.id)
    }
  }, [data])

  // Computed values from data
  const intake = data?.intake
  const service = intake?.service as { name?: string; type?: string; short_name?: string } | undefined
  const answers = (intake?.answers?.answers || {}) as Record<string, unknown>
  const intakeAnswers = intake?.answers?.answers as Record<string, unknown> | undefined

  const hasRedFlags = Boolean(
    intakeAnswers?.red_flags_detected ||
    intakeAnswers?.emergency_symptoms ||
    intake?.risk_tier === "high" ||
    intake?.requires_live_consult
  )
  const redFlagDetails = intake
    ? [
        intakeAnswers?.red_flags_detected && `Red flags: ${intakeAnswers.red_flags_detected}`,
        intakeAnswers?.emergency_symptoms && `Emergency symptoms: ${intakeAnswers.emergency_symptoms}`,
        intake.risk_tier === "high" && "High risk tier",
        intake.requires_live_consult && "Requires live consult",
      ].filter(Boolean) as string[]
    : []

  // Close panel + refresh queue
  const closeAndRefresh = useCallback(() => {
    closePanel()
    onActionComplete?.()
    router.refresh()
  }, [closePanel, onActionComplete, router])

  // Decline reason template auto-fill
  const handleDeclineReasonCodeChange = (code: DeclineReasonCode) => {
    setDeclineReasonCode(code)
    const template = DECLINE_REASONS.find((r) => r.code === code)?.template || ""
    setDeclineReason(template)
  }

  // --- Actions ---

  const handleMedCertApprove = async () => {
    if (!intake || !data) return

    if (hasRedFlags && !redFlagsAcknowledged) {
      toast.error("Review and acknowledge safety flags before approving.")
      return
    }
    if (doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH) {
      toast.error(`Clinical notes required (min ${MIN_CLINICAL_NOTES_LENGTH} chars).`)
      notesRef.current?.focus()
      return
    }

    setIsLoadingPreview(true)
    try {
      const result = await fetchCertPreviewDataAction(intake.id, data.draftId || "")
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

  const handleCertPreviewConfirm = async (editedData: CertificatePreviewData) => {
    if (!intake) return
    startTransition(async () => {
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
        const emailNote =
          result.emailStatus === "sent"
            ? "Certificate approved and sent to patient."
            : "Certificate approved. Email will be sent shortly."
        toast.success(emailNote)
        setTimeout(closeAndRefresh, 800)
      } else {
        toast.error(result.error || "Failed to approve certificate")
      }
    })
  }

  const handleStatusChange = async (status: IntakeStatus) => {
    if (!intake) return

    if ((status === "approved" || status === "awaiting_script") && hasRedFlags && !redFlagsAcknowledged) {
      toast.error("Review and acknowledge safety flags before approving.")
      return
    }
    if ((status === "approved" || status === "awaiting_script") && doctorNotes.trim().length < MIN_CLINICAL_NOTES_LENGTH) {
      toast.error(`Clinical notes required (min ${MIN_CLINICAL_NOTES_LENGTH} chars).`)
      notesRef.current?.focus()
      return
    }

    startTransition(async () => {
      if (status === "approved" || status === "awaiting_script") {
        await saveDoctorNotesAction(intake.id, doctorNotes)
      }
      const result = await updateStatusAction(intake.id, status, userId ?? "")
      if (result.success) {
        toast.success(status === "approved" ? "Case approved" : "Case updated")
        setTimeout(closeAndRefresh, 800)
      } else {
        toast.error(result.error || "Failed to update status")
      }
    })
  }

  const handleDecline = async () => {
    if (!intake || !declineReason.trim()) return
    startTransition(async () => {
      const result = await declineIntakeAction(intake.id, declineReasonCode, declineReason)
      if (result.success) {
        setShowDeclineDialog(false)
        toast.success("Case declined and patient notified")
        setTimeout(closeAndRefresh, 800)
      } else {
        toast.error(result.error || "Failed to decline")
      }
    })
  }

  const handleSaveNotes = async () => {
    if (!intake) return
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

  // Keyboard shortcuts
  useDoctorShortcuts({
    onApprove: () => {
      if (!intake || intake.status !== "paid" || isPending) return
      if (service?.type === "med_certs") {
        handleMedCertApprove()
      } else if (service?.type === "repeat_rx" || service?.type === "common_scripts") {
        handleStatusChange("awaiting_script")
      } else {
        handleStatusChange("approved")
      }
    },
    onDecline: () => {
      if (intake && !["approved", "declined", "completed"].includes(intake.status)) {
        setShowDeclineDialog(true)
      }
    },
    onNote: () => notesRef.current?.focus(),
    onEscape: () => {
      if (showDeclineDialog) {
        setShowDeclineDialog(false)
      } else {
        // Panel escape is handled by SheetPanel itself
      }
    },
    disabled: isPending || isLoading,
  })

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

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

  // --- Render ---

  // Loading skeleton
  if (isLoading) {
    return (
      <SheetPanel
        title="Loading case..."
        width={720}
        onClose={handlePanelClose}
      >
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </SheetPanel>
    )
  }

  // Error state
  if (error || !intake) {
    return (
      <SheetPanel title="Error" width={720} onClose={handlePanelClose}>
        <div className="text-center py-12">
          <p className="text-destructive font-medium">{error || "Intake not found"}</p>
          <Button variant="outline" className="mt-4" onClick={closePanel}>
            Close
          </Button>
        </div>
      </SheetPanel>
    )
  }

  return (
    <>
      <SheetPanel
        title={intake.patient.full_name}
        description={`${service?.short_name || formatServiceType(service?.type || "")} · ${formatIntakeStatus(intake.status)}`}
        width={720}
        onClose={handlePanelClose}
      >
        <div className="space-y-5">
          {/* Top bar: status + open full page */}
          <div className="flex items-center justify-between">
            <Badge className={getStatusColor(intake.status)}>
              {formatIntakeStatus(intake.status)}
            </Badge>
            <Link
              href={`/doctor/intakes/${intake.id}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => closePanel()}
            >
              <ExternalLink className="h-3 w-3" />
              Open full page
            </Link>
          </div>

          {/* Lock warning */}
          {lockWarning && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 text-sm text-amber-800 dark:text-amber-200">
              {lockWarning}
            </div>
          )}

          {/* Patient Info (compact) */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{intake.patient.full_name}</p>
                </div>
                <div className="flex items-start gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Age / DOB</p>
                    <p className="font-medium">
                      {data?.patientAge != null ? `${data.patientAge}y` : "N/A"} ·{" "}
                      {intake.patient.date_of_birth
                        ? new Date(intake.patient.date_of_birth).toLocaleDateString("en-AU")
                        : "Not provided"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Medicare</p>
                    <p className="font-medium font-mono text-xs">{data?.maskedMedicare}</p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{intake.patient.phone || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium text-xs truncate">{intake.patient.email || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
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

          {/* Request Info + Clinical Summary */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                {service?.name || formatServiceType(service?.type || "")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Submitted: {formatDate(intake.created_at)}
                </div>
                {intake.paid_at && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    Paid: {formatDate(intake.paid_at)}
                  </div>
                )}
              </div>

              {Object.keys(answers).length > 0 && (
                <ClinicalSummary
                  answers={answers}
                  serviceType={service?.type}
                  consultSubtype={
                    intake.category === "consult" && intake.subtype ? intake.subtype : undefined
                  }
                  className="border-0 shadow-none p-0"
                />
              )}
            </CardContent>
          </Card>

          {/* AI Drafts */}
          {data?.aiDrafts && data.aiDrafts.length > 0 && (
            <DraftReviewPanel
              drafts={data.aiDrafts}
              intakeId={intake.id}
              onDraftApproved={() => {
                /* stays in panel — no router.refresh needed */
              }}
              onDraftRejected={() => {}}
            />
          )}

          {/* Chat Transcript */}
          <ChatTranscriptPanel intakeId={intake.id} />

          {/* Safety Flags */}
          {hasRedFlags && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-destructive flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4" />
                  Safety Flags Detected
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="text-sm space-y-1">
                  {redFlagDetails.map((detail, i) => (
                    <p key={i} className="text-destructive-foreground">
                      • {detail}
                    </p>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-destructive/20">
                  <Switch
                    id="panel-acknowledge-flags"
                    checked={redFlagsAcknowledged}
                    onCheckedChange={setRedFlagsAcknowledged}
                  />
                  <Label
                    htmlFor="panel-acknowledge-flags"
                    className="text-sm font-medium text-destructive-foreground cursor-pointer"
                  >
                    I have reviewed these safety flags and determined it is appropriate to proceed
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Clinical Notes */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                {["approved", "completed", "awaiting_script"].includes(intake.status)
                  ? "Approved Clinical Note"
                  : "Clinical Notes (Private)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {["approved", "completed", "awaiting_script"].includes(intake.status) ? (
                <div className="space-y-2">
                  {intake.doctor_notes ? (
                    <div className="p-3 bg-muted/50 rounded-lg border text-sm whitespace-pre-wrap">
                      {intake.doctor_notes}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No clinical notes recorded.</p>
                  )}
                </div>
              ) : (
                <>
                  <Textarea
                    ref={notesRef}
                    placeholder="Add your clinical notes here... (⌘+N to focus)"
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    className="min-h-[100px] text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={handleSaveNotes} disabled={isPending} variant="outline" size="sm">
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      Save Notes
                    </Button>
                    {noteSaved && <span className="text-xs text-emerald-600">Saved!</span>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons (sticky bottom) */}
          <div className="sticky bottom-0 bg-background border-t border-border -mx-8 px-8 py-4 -mb-6 flex flex-wrap gap-2">
            {/* Med cert: preview then approve */}
            {service?.type === "med_certs" && ["paid", "in_review"].includes(intake.status) && (
              <Button
                onClick={handleMedCertApprove}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={isPending || isLoadingPreview}
                size="sm"
              >
                {isPending || isLoadingPreview ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                )}
                {isLoadingPreview ? "Loading..." : isPending ? "Generating..." : "Review & Send Certificate"}
              </Button>
            )}

            {/* Repeat scripts: approve */}
            {(service?.type === "repeat_rx" || service?.type === "common_scripts") && intake.status === "paid" && (
              <Button
                onClick={() => handleStatusChange("awaiting_script")}
                className="bg-primary hover:bg-primary/90"
                disabled={isPending}
                size="sm"
              >
                {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                {isPending ? "Approving..." : "Approve Script"}
              </Button>
            )}

            {/* Consults: complete */}
            {service?.type === "consults" && intake.status === "paid" && (
              <Button
                onClick={() => handleStatusChange("approved")}
                className="bg-primary hover:bg-primary/90"
                disabled={isPending}
                size="sm"
              >
                {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                {isPending ? "Completing..." : "Complete Consultation"}
              </Button>
            )}

            {/* Generic approve */}
            {!["med_certs", "repeat_rx", "common_scripts", "consults"].includes(service?.type || "") &&
              intake.status === "paid" && (
                <Button
                  onClick={() => handleStatusChange("approved")}
                  className="bg-primary hover:bg-primary/90"
                  disabled={isPending}
                  size="sm"
                >
                  {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                  {isPending ? "Approving..." : "Approve"}
                </Button>
              )}

            {/* Decline */}
            {!["approved", "declined", "completed"].includes(intake.status) && (
              <Button
                variant="destructive"
                onClick={() => setShowDeclineDialog(true)}
                disabled={isPending}
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Decline
              </Button>
            )}
          </div>
        </div>
      </SheetPanel>

      {/* Decline Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Request</AlertDialogTitle>
            <AlertDialogDescription>
              Select a reason and provide details. The patient will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Select
                value={declineReasonCode}
                onValueChange={(v) => handleDeclineReasonCodeChange(v as DeclineReasonCode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECLINE_REASONS.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Details</label>
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
    </>
  )
}
