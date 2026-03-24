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
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Minus,
  Undo2,
} from "@/lib/icons"
import { updateStatusAction, saveDoctorNotesAction, declineIntakeAction } from "@/app/doctor/queue/actions"
import { fetchCertPreviewDataAction, approveWithPreviewDataAction } from "@/app/doctor/intakes/[id]/document/actions"
import { CertificatePreviewDialog, type CertificatePreviewData } from "@/components/doctor/certificate-preview-dialog"
import { logViewedIntakeAnswersAction, logViewedSafetyFlagsAction } from "@/app/actions/clinician-audit"
import { acquireIntakeLockAction, releaseIntakeLockAction, extendIntakeLockAction } from "@/app/actions/intake-lock"
import { regenerateDrafts } from "@/app/actions/draft-approval"
import { ClinicalSummary } from "@/components/doctor/clinical-summary"
import { formatIntakeStatus, formatServiceType } from "@/lib/format-intake"
import { usePanel } from "@/components/panels/panel-provider"
import { useDoctorShortcuts } from "@/hooks/use-doctor-shortcuts"
import type { IntakeWithDetails, IntakeStatus, DeclineReasonCode } from "@/types/db"
import type { AIDraft } from "@/app/actions/draft-approval"
import { DECLINE_REASONS } from "@/lib/doctor/constants"
import { toast } from "sonner"

/**
 * Format clinical note draft JSON into SOAP clinical note text.
 */
function formatClinicalNoteContent(content: Record<string, unknown>): string | null {
  const c = content as Record<string, string>
  const sections: string[] = []
  const subj = c.presentingComplaint?.trim() || ""
  const obj = c.historyOfPresentIllness?.trim() || ""
  const assess = c.relevantInformation?.trim() || ""
  const plan = c.certificateDetails?.trim() || ""

  if (subj) sections.push(`Subjective:\n${subj}`)
  if (obj) sections.push(`Objective:\n${obj}`)
  if (assess) sections.push(`Assessment:\n${assess}`)
  if (plan) sections.push(`Plan:\n${plan}`)
  return sections.length > 0 ? sections.join("\n\n") : null
}

/**
 * Find a usable clinical_note draft from the AI drafts list.
 * Returns the draft if it's ready and not rejected.
 */
function findClinicalNoteDraft(drafts: AIDraft[]): AIDraft | null {
  return drafts.find(
    (d) => d.type === "clinical_note" && d.status === "ready" && !d.rejected_at
  ) ?? null
}

// Decline reasons imported from shared constants
// See lib/doctor/constants.ts for the full list

interface ReviewData {
  intake: IntakeWithDetails
  patientAge: number | null
  maskedMedicare: string
  aiDrafts: AIDraft[]
  nextIntakeId: string | null
  draftId: string | null
}

/** Insert formatting at cursor position in a textarea */
function insertFormatting(
  textarea: HTMLTextAreaElement,
  type: "bold" | "italic" | "h2" | "bullet" | "numbered" | "divider",
  setValue: (v: string) => void,
  setSaved: (v: boolean) => void,
) {
  const { selectionStart: start, selectionEnd: end, value } = textarea
  const selected = value.substring(start, end)
  let insert = ""
  let cursorOffset = 0

  switch (type) {
    case "bold":
      insert = selected ? `**${selected}**` : "**bold**"
      cursorOffset = selected ? insert.length : 2
      break
    case "italic":
      insert = selected ? `_${selected}_` : "_italic_"
      cursorOffset = selected ? insert.length : 1
      break
    case "h2":
      insert = selected ? `\n## ${selected}` : "\n## Heading"
      cursorOffset = insert.length
      break
    case "bullet":
      insert = selected
        ? selected.split("\n").map(l => `• ${l}`).join("\n")
        : "• "
      cursorOffset = insert.length
      break
    case "numbered":
      insert = selected
        ? selected.split("\n").map((l, i) => `${i + 1}. ${l}`).join("\n")
        : "1. "
      cursorOffset = insert.length
      break
    case "divider":
      insert = "\n---\n"
      cursorOffset = insert.length
      break
  }

  const newValue = value.substring(0, start) + insert + value.substring(end)
  setValue(newValue)
  setSaved(false)

  // Restore cursor position after React re-render
  requestAnimationFrame(() => {
    textarea.focus()
    const pos = start + cursorOffset
    textarea.setSelectionRange(pos, pos)
  })
}

interface IntakeReviewPanelProps {
  intakeId: string
  onActionComplete?: () => void
}

export function IntakeReviewPanel({ intakeId, onActionComplete }: IntakeReviewPanelProps) {
  const router = useRouter()
  useAuth()
  const { closePanel } = usePanel()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<ReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [doctorNotes, setDoctorNotes] = useState("")
  const [noteSaved, setNoteSaved] = useState(false)
  const [isAiPrefilled, setIsAiPrefilled] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declineReason, setDeclineReason] = useState(DECLINE_REASONS[0].template)
  const [declineReasonCode, setDeclineReasonCode] = useState<DeclineReasonCode>("requires_examination")

  // Safety flags
  const [redFlagsAcknowledged, setRedFlagsAcknowledged] = useState(false)

  // Certificate preview
  const [showCertPreview, setShowCertPreview] = useState(false)
  const [certPreviewData, setCertPreviewData] = useState<CertificatePreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

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

          // Pre-fill clinical notes from AI draft if doctor hasn't written notes yet
          const existingNotes = reviewData.intake.doctor_notes || ""
          if (!existingNotes && reviewData.aiDrafts) {
            const clinicalDraft = findClinicalNoteDraft(reviewData.aiDrafts)
            if (clinicalDraft) {
              const formatted = formatClinicalNoteContent(clinicalDraft.content)
              if (formatted) {
                setDoctorNotes(formatted)
                setIsAiPrefilled(true)
              } else {
                setDoctorNotes("")
              }
            } else {
              setDoctorNotes("")
            }
          } else {
            setDoctorNotes(existingNotes)
          }

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

  // Helper: check if a value is actually concerning (not "None", "No", "mild", etc.)
  const isConcerningValue = (val: unknown): boolean => {
    if (!val) return false
    const str = String(val).toLowerCase().trim()
    const benign = new Set(["none", "no", "n/a", "nil", "not applicable", "false", "true", "mild", "moderate", "low", "minimal", "minor"])
    return !benign.has(str)
  }

  // NOTE: emergency_symptoms is a safety-gate toggle ("I am NOT experiencing an emergency" → true),
  // not an actual symptom field. Blocking happens at intake time, so it's excluded here.
  const hasRedFlags = Boolean(
    isConcerningValue(intakeAnswers?.red_flags_detected) ||
    intake?.risk_tier === "high" ||
    intake?.requires_live_consult
  )
  const redFlagDetails = intake
    ? [
        isConcerningValue(intakeAnswers?.red_flags_detected) && `Red flags: ${intakeAnswers?.red_flags_detected}`,
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
      const result = await updateStatusAction(intake.id, status)
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

  const hasClinicalDraft = !!findClinicalNoteDraft(data?.aiDrafts || [])

  const handleGenerateOrRegenerateNote = async () => {
    if (!intake) return
    setIsRegenerating(true)
    try {
      const result = await regenerateDrafts(intake.id)
      if (result.success) {
        const res = await fetch(`/api/doctor/intakes/${intake.id}/review-data`)
        if (res.ok) {
          const reviewData: ReviewData = await res.json()
          setData(reviewData)
          const clinicalDraft = findClinicalNoteDraft(reviewData.aiDrafts || [])
          if (clinicalDraft) {
            const formatted = formatClinicalNoteContent(clinicalDraft.content)
            if (formatted) {
              setDoctorNotes(formatted)
              setIsAiPrefilled(true)
              toast.success(hasClinicalDraft ? "AI note regenerated" : "AI draft generated")
            } else {
              toast.error("AI draft could not be formatted. Please try again.")
            }
          } else {
            toast.error("AI draft could not be generated. Please try again or add your notes manually.")
          }
        } else {
          toast.error("Failed to load draft. Please refresh and try again.")
        }
      } else {
        toast.error(result.error || "Failed to generate draft")
      }
    } catch {
      toast.error("Failed to generate draft")
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!intake) return
    startTransition(async () => {
      const result = await saveDoctorNotesAction(intake.id, doctorNotes)
      if (result.success) {
        setNoteSaved(true)
        setIsAiPrefilled(false) // After saving, it's the doctor's note now
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
        return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
      case "declined":
        return "bg-destructive/10 text-destructive"
      case "pending_info":
        return "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
      case "awaiting_script":
        return "bg-dawn-50 dark:bg-dawn-500/10 text-dawn-700 dark:text-dawn-400 border-dawn-200 dark:border-dawn-500/20"
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
        <div className="space-y-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-36 w-full" />
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
            <CardHeader className="py-4 px-5">
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
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
            <CardHeader className="py-4 px-5">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                {service?.name || formatServiceType(service?.type || "")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-4 space-y-4">
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
                  consultSubtype={
                    intake.category === "consult" && intake.subtype ? intake.subtype : undefined
                  }
                  inline
                />
              )}
            </CardContent>
          </Card>

          {/* Safety Flags */}
          {hasRedFlags && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="py-4 px-5">
                <CardTitle className="text-destructive flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4" />
                  Safety Flags Detected
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-4 space-y-4">
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

          {/* Clinical Notes (consolidated — AI draft pre-fills, validation inline) */}
          <Card>
            <CardHeader className="py-4 px-5">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                {["approved", "completed", "awaiting_script"].includes(intake.status)
                  ? "Approved Clinical Note"
                  : "Clinical Notes"}
                {isAiPrefilled && !["approved", "completed", "awaiting_script"].includes(intake.status) && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 font-normal">
                    AI Draft
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-4 space-y-4">
              {["approved", "completed", "awaiting_script"].includes(intake.status) ? (
                <div className="space-y-2">
                  {intake.doctor_notes ? (
                    <div className="p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap">
                      {intake.doctor_notes}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No clinical notes recorded.</p>
                  )}
                </div>
              ) : (
                <>
                  {isAiPrefilled && (
                    <p className="text-xs text-muted-foreground">
                      Pre-filled from AI draft. Edits save on approval, or click Save to persist now.
                    </p>
                  )}
                  {isRegenerating && !doctorNotes ? (
                    <div className="flex items-center gap-2 py-8 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Generating draft...</span>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/60 bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-colors">
                      {/* Formatting Toolbar */}
                      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/40 bg-muted/30">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => notesRef.current && insertFormatting(notesRef.current, "bold", setDoctorNotes, setNoteSaved)}
                          disabled={isPending || isRegenerating}
                          title="Bold"
                        >
                          <Bold className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => notesRef.current && insertFormatting(notesRef.current, "italic", setDoctorNotes, setNoteSaved)}
                          disabled={isPending || isRegenerating}
                          title="Italic"
                        >
                          <Italic className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-px h-4 bg-border/60 mx-1" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => notesRef.current && insertFormatting(notesRef.current, "h2", setDoctorNotes, setNoteSaved)}
                          disabled={isPending || isRegenerating}
                          title="Heading"
                        >
                          <Heading2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => notesRef.current && insertFormatting(notesRef.current, "bullet", setDoctorNotes, setNoteSaved)}
                          disabled={isPending || isRegenerating}
                          title="Bullet list"
                        >
                          <List className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => notesRef.current && insertFormatting(notesRef.current, "numbered", setDoctorNotes, setNoteSaved)}
                          disabled={isPending || isRegenerating}
                          title="Numbered list"
                        >
                          <ListOrdered className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => notesRef.current && insertFormatting(notesRef.current, "divider", setDoctorNotes, setNoteSaved)}
                          disabled={isPending || isRegenerating}
                          title="Divider"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-px h-4 bg-border/60 mx-1" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setDoctorNotes("")
                            setNoteSaved(false)
                            notesRef.current?.focus()
                          }}
                          disabled={isPending || isRegenerating || !doctorNotes}
                          title="Clear"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {/* Editor Area */}
                      <Textarea
                        ref={notesRef}
                        placeholder="Add your clinical notes here... (⌘+N to focus)"
                        value={doctorNotes}
                        onChange={(e) => {
                          setDoctorNotes(e.target.value)
                          setNoteSaved(false)
                        }}
                        disabled={isPending || isRegenerating}
                        className="min-h-[180px] text-sm border-0 rounded-none focus-visible:ring-0 resize-y"
                      />
                    </div>
                  )}
                  {/* Actions row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button onClick={handleSaveNotes} disabled={isPending || isRegenerating} variant="outline" size="sm">
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        Save Notes
                      </Button>
                      <Button
                        onClick={handleGenerateOrRegenerateNote}
                        disabled={isPending || isRegenerating}
                        variant={hasClinicalDraft ? "ghost" : "outline"}
                        size="sm"
                      >
                        {isRegenerating ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {isRegenerating
                          ? "Generating..."
                          : hasClinicalDraft
                            ? "Regenerate AI draft"
                            : "Generate AI draft"}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {noteSaved && <span className="text-xs text-emerald-600">Saved!</span>}
                      {doctorNotes && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {doctorNotes.length} chars
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons (sticky bottom) */}
          <div className="sticky bottom-0 bg-background border-t border-border pt-3 pb-1 flex flex-wrap gap-2">
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
