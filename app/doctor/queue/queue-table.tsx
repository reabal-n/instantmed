"use client"

import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Clock,
  ExternalLink,
  Eye,
  Loader2,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState,useTransition } from "react"
import { toast } from "sonner"

import { revokeAIApproval } from "@/app/actions/revoke-ai-approval"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Pagination,UserCard } from "@/components/uix"
import { capture } from "@/lib/analytics/capture"
import { buildPatientSnapshot } from "@/lib/doctor/patient-snapshot"
import { prefetchReviewData } from "@/lib/doctor/review-data-cache"
import { SERVICE_TYPES } from "@/lib/doctor/service-types"
import { calculateAge } from "@/lib/format"
import { formatServiceType } from "@/lib/format/intake"
import { cn } from "@/lib/utils"
import type { IntakeWithPatient } from "@/types/db"

import type { PaginationInfo } from "./types"
import type { QueueDialogState } from "./use-queue-dialogs"

function getChiefComplaint(intake: IntakeWithPatient): string | null {
  const a = (intake.answers as Array<{ answers: Record<string, unknown> }> | null | undefined)?.[0]?.answers
  if (!a) return null
  const candidate = (
    a["symptom_details"] ??
    a["symptoms"] ??
    a["consult_reason"] ??
    a["edGoal"] ??
    a["medication_name"] ??
    a["drug_name"] ??
    a["reason_for_request"]
  )
  if (typeof candidate !== "string" || !candidate.trim()) return null
  return candidate.length > 50 ? `${candidate.slice(0, 50)}…` : candidate
}

/**
 * Map a consult subtype to a short scanning-aid label for the queue chip.
 * Returns null for general / null / undefined / unknown so the chip is hidden.
 */
function getConsultSubtypeLabel(subtype: string | null | undefined): string | null {
  if (!subtype) return null
  const labels: Record<string, string> = {
    ed: "ED",
    hair_loss: "Hair Loss",
    womens_health: "Women's Health",
    weight_loss: "Weight Loss",
  }
  return labels[subtype] ?? null
}

export interface QueueTableProps {
  filteredIntakes: IntakeWithPatient[]
  intakes?: IntakeWithPatient[]
  expandedId: string | null
  onToggleExpand: (id: string) => void
  isPending: boolean
  identityComplete: boolean
  onApprove: (intakeId: string, serviceType?: string | null) => void
  hasRedFlags: (intake: IntakeWithPatient) => boolean
  calculateWaitTime: (createdAt: string) => string
  getWaitTimeSeverity: (createdAt: string, slaDeadline?: string | null) => "normal" | "warning" | "critical"
  calculateSlaCountdown: (slaDeadline: string | null | undefined) => string | null
  openReviewPanel: (intakeId: string) => void
  openIntakeId: string | null
  readIds: Set<string>
  dialogs: QueueDialogState

  // Extra sections
  aiApprovedIntakes: IntakeWithPatient[]
  recentlyCompleted: IntakeWithPatient[]
  pagination?: PaginationInfo
}

export function QueueTable({
  filteredIntakes,
  intakes: _intakes,
  expandedId,
  onToggleExpand,
  isPending,
  identityComplete,
  onApprove,
  hasRedFlags,
  calculateWaitTime,
  getWaitTimeSeverity,
  calculateSlaCountdown,
  openReviewPanel,
  openIntakeId,
  readIds,
  dialogs: {
    declineDialog,
    setDeclineDialog,
    declineReasonCode,
    setDeclineReasonCode,
    declineReasonNote,
    setDeclineReasonNote,
    declineTemplates,
    handleDecline,
    handleDeclineTemplateChange,
    requiresNote,
    infoDialog,
    setInfoDialog,
    infoTemplateCode,
    infoMessage,
    setInfoMessage,
    infoTemplates,
    handleRequestInfo,
    handleInfoTemplateChange,
    flagDialog,
    setFlagDialog,
    flagReason,
    setFlagReason,
    handleFlag,
    revokeDialog,
    setRevokeDialog,
    revokeReason,
    setRevokeReason,
  },
  aiApprovedIntakes,
  recentlyCompleted,
  pagination,
}: QueueTableProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [completedExpanded, setCompletedExpanded] = useState(false)
  const [aiExpanded, setAiExpanded] = useState(false)

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1
  const currentPage = pagination?.page ?? 1

  // A patient is "returning" if they have a recently completed case — derived from recentlyCompleted prop
  const returningPatientIds = new Set(recentlyCompleted.map((r) => r.patient_id))

  return (
    <>
      {/* Queue List — flat rows, single click opens review panel */}
      {filteredIntakes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl border border-dashed border-border/60 bg-muted/20">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-success-border bg-success-light">
            <CheckCircle className="h-5 w-5 text-success" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Queue is clear!</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            All caught up. New requests will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm shadow-primary/[0.03]">
          {filteredIntakes.map((intake, index) => {
            const isFocused = expandedId === intake.id
            const waitSeverity = getWaitTimeSeverity(intake.created_at, intake.sla_deadline)
            const patientSnapshot = buildPatientSnapshot(intake.patient)
            const patientAge = calculateAge(intake.patient.date_of_birth)
            const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined

            const isOpen = openIntakeId === intake.id
            const isRead = readIds.has(intake.id)
            const isReturning = returningPatientIds.has(intake.patient_id)
            const chiefComplaint = getChiefComplaint(intake)
            return (
              <div
                key={intake.id}
                className={cn(
                  "group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-3 py-3 transition-colors sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto_auto_auto] sm:items-center sm:px-4",
                  "hover:bg-muted/40",
                  index < filteredIntakes.length - 1 && "border-b border-border/40",
                  isFocused && "bg-primary/[0.04] ring-1 ring-inset ring-primary/20",
                  isOpen && "bg-primary/[0.06]"
                )}
                onMouseEnter={() => prefetchReviewData(intake.id)}
                onClick={() => {
                  capture("doctor_case_opened", {
                    intake_id: intake.id,
                    service_type: service?.type,
                  })
                  onToggleExpand(intake.id)
                  openReviewPanel(intake.id)
                }}
              >
                {/* Patient */}
                <div className="col-start-1 row-start-1 min-w-0 sm:shrink-0">
                  <UserCard
                    name={patientSnapshot.name}
                    description={patientAge != null ? `${patientAge}y` : "DOB missing"}
                    size="sm"
                  />
                  {chiefComplaint && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[160px] pl-9">
                      {chiefComplaint}
                    </p>
                  )}
                </div>

                {/* Badges */}
                <div className="col-span-2 col-start-1 row-start-2 flex min-w-0 flex-wrap items-center gap-1.5 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                  <Badge variant="outline" className="text-xs">
                    {service?.short_name || formatServiceType(service?.type || "")}
                  </Badge>
                  {(() => {
                    const subtypeLabel = getConsultSubtypeLabel(intake.subtype)
                    return subtypeLabel ? (
                      <Badge variant="secondary" className="text-xs">{subtypeLabel}</Badge>
                    ) : null
                  })()}
                  {intake.is_priority && (
                    <Badge className="bg-warning-light text-warning border-warning-border">
                      <Zap className="w-3 h-3 mr-1" />Priority
                    </Badge>
                  )}
                  {hasRedFlags(intake) && (
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                      <ShieldAlert className="w-3 h-3 mr-1" />Flagged
                    </Badge>
                  )}
                  {intake.ai_draft_status === "completed" && (
                    <Badge className="bg-info-light text-info border-info-border">
                      <Sparkles className="w-3 h-3 mr-1" />AI ready
                    </Badge>
                  )}
                  {intake.ai_approved && (
                    <Badge className="bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20">
                      <Sparkles className="w-3 h-3 mr-1" />Auto-reviewed
                    </Badge>
                  )}
                  {isReturning && (
                    <Badge variant="outline" className="text-xs text-muted-foreground border-border/50">
                      Returning
                    </Badge>
                  )}
                  {patientSnapshot.completenessTone !== "complete" && (
                    <Badge
                      variant={patientSnapshot.completenessTone === "partial" ? "warning" : "destructive"}
                      className="text-xs"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {patientSnapshot.missingCriticalFields.slice(0, 2).join(", ")} missing
                    </Badge>
                  )}
                  {isOpen && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                      Open
                    </Badge>
                  )}
                </div>

                {/* Quick actions */}
                <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-1 sm:col-start-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      openReviewPanel(intake.id)
                    }}
                    disabled={isPending}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Open
                  </Button>
                  <div className={cn(
                    "items-center gap-1",
                    "hidden group-hover:flex group-focus-within:flex",
                    isFocused && "flex"
                  )}>
                    <Button
                      size="sm"
                      className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={(e) => { e.stopPropagation(); onApprove(intake.id, service?.type) }}
                      disabled={isPending || !identityComplete}
                      title={!identityComplete ? "Complete your Certificate Identity in Settings first" : undefined}
                    >
                      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                      {service?.type === SERVICE_TYPES.MED_CERTS ? "Review" : service?.type === SERVICE_TYPES.COMMON_SCRIPTS ? "Script" : "Approve"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); setDeclineDialog(intake.id) }}
                      disabled={isPending}
                    >
                      Decline
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label={`Request more information for ${intake.patient.full_name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setInfoDialog(intake.id)
                      }}
                      title="Request more info"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label={`Open patient profile for ${intake.patient.full_name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(patientSnapshot.profileHref)
                      }}
                      title="Open patient profile"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Unread dot */}
                {!isRead && (
                  <span
                    className="col-start-1 row-start-3 h-2 w-2 shrink-0 rounded-full bg-primary sm:col-start-4 sm:row-start-1"
                    role="img"
                    aria-label="Unread case"
                  />
                )}

                {/* Wait time */}
                <div className={cn(
                  "col-start-2 row-start-3 flex shrink-0 items-center justify-end gap-1 text-xs font-medium tabular-nums sm:col-start-5 sm:row-start-1",
                  waitSeverity === "critical" ? "text-destructive" : waitSeverity === "warning" ? "text-warning" : "text-muted-foreground"
                )}>
                  <Clock className="h-3.5 w-3.5" />
                  <span>{intake.sla_deadline ? calculateSlaCountdown(intake.sla_deadline) : calculateWaitTime(intake.created_at)}</span>
                </div>
                {waitSeverity === "critical" && (
                  <AlertTriangle className="col-start-2 row-start-3 h-3.5 w-3.5 shrink-0 justify-self-end text-destructive sm:col-start-5 sm:row-start-1" aria-label="Critical" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* AI-Approved Review Section - above pagination so doctors always see it */}
      {aiApprovedIntakes.length > 0 && (
        <Card className="overflow-hidden rounded-xl border-teal-200/60 bg-card/90 shadow-sm shadow-primary/[0.025] dark:border-teal-500/20">
          <CardHeader className="p-0">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/35"
              onClick={() => setAiExpanded((v) => !v)}
              aria-expanded={aiExpanded}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <h3 className="text-sm font-semibold text-foreground">
                    AI-approved certificates ({aiApprovedIntakes.length})
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Batch review queue. Expand when spot-checking or revoking.
                </p>
              </div>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", aiExpanded && "rotate-180")} />
            </button>
          </CardHeader>
          {aiExpanded && <CardContent className="space-y-1.5 border-t border-border/40 px-3 py-3">
            {aiApprovedIntakes.map((intake) => {
              const aiService = intake.service as { short_name?: string; type?: string } | undefined
              return (
                <div
                  key={intake.id}
                  className="flex cursor-pointer flex-col justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5 transition-colors hover:bg-muted/45 sm:flex-row sm:items-center sm:gap-3"
                  onMouseEnter={() => prefetchReviewData(intake.id)}
                  onClick={() => openReviewPanel(intake.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserCard name={intake.patient.full_name} size="sm" className="shrink-0" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {aiService?.short_name || "Med Cert"}
                      </Badge>
                      <Badge className="bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI approved
                      </Badge>
                      {Boolean((intake as IntakeWithPatient & { soft_flags?: string[] }).soft_flags) && (
                        <Badge
                          variant="outline"
                          className="text-xs border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400"
                        >
                          Flagged for review
                        </Badge>
                      )}
                      {intake.ai_approved_at && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {new Date(intake.ai_approved_at).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        openReviewPanel(intake.id)
                      }}
                    >
                      Review
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={async (e) => {
                        e.stopPropagation()
                        try {
                          const res = await fetch(`/api/doctor/certificates/${intake.id}/download`)
                          if (!res.ok) { toast.error("Certificate not available"); return }
                          const blob = await res.blob()
                          window.open(URL.createObjectURL(blob), "_blank")
                        } catch {
                          toast.error("Failed to load certificate")
                        }
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRevokeDialog(intake.id)
                      }}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>}
        </Card>
      )}

      {/* Recently Completed Today */}
      {recentlyCompleted.length > 0 && (
        <Card className="overflow-hidden rounded-xl border-border/50 bg-card/90 shadow-none">
          <CardHeader className="p-0">
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/35"
              onClick={() => setCompletedExpanded((v) => !v)}
              aria-expanded={completedExpanded}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <h3 className="text-sm font-semibold text-foreground">
                  Completed Today ({recentlyCompleted.length})
                </h3>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", completedExpanded && "rotate-180")} />
            </button>
          </CardHeader>
          {completedExpanded && (
          <CardContent className="space-y-1.5 border-t border-border/40 px-3 py-3">
            {recentlyCompleted.slice(0, 5).map((intake) => {
              const svc = intake.service as { short_name?: string; type?: string } | undefined
              return (
                <div
                  key={intake.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View completed case for ${intake.patient.full_name}`}
                  className="flex cursor-pointer flex-col justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5 transition-colors hover:bg-muted/45 sm:flex-row sm:items-center sm:gap-3"
                  onClick={() => router.push(`/doctor/intakes/${intake.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      router.push(`/doctor/intakes/${intake.id}`)
                    }
                  }}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
                    <UserCard name={intake.patient.full_name} size="sm" className="shrink-0" />
                    <Badge variant="outline" className="text-xs">
                      {svc?.short_name || "Request"}
                    </Badge>
                    <Badge
                      className={cn(
                        "text-xs",
                        intake.status === "approved"
                          ? "bg-success-light text-success border-success-border"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      )}
                    >
                      {intake.status === "approved" ? "Approved" : "Declined"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {intake.reviewed_at
                      ? new Date(intake.reviewed_at).toLocaleTimeString("en-AU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
              )
            })}
          </CardContent>
          )}
        </Card>
      )}

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-2 border-t px-2 py-4 sm:flex-row">
          <div className="text-sm text-muted-foreground">
            {(currentPage - 1) * pagination.pageSize + 1} –{" "}
            {Math.min(currentPage * pagination.pageSize, pagination.total)} of {pagination.total}
          </div>
          <Pagination
            total={totalPages}
            page={currentPage}
            onChange={(page) => {
              const params = new URLSearchParams(window.location.search)
              params.set("page", String(page))
              router.push(`/doctor/dashboard?${params.toString()}`)
            }}
            showControls
            size="sm"
          />
        </div>
      )}

      {/* Revoke AI Approval Dialog */}
      <Dialog
        open={!!revokeDialog}
        onOpenChange={() => {
          setRevokeDialog(null)
          setRevokeReason("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke AI-Approved Certificate</DialogTitle>
            <DialogDescription>
              This will invalidate the certificate and move the request back to the review queue. The patient will be
              notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Reason for revocation</label>
              <Textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Explain why this certificate should be revoked..."
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevokeDialog(null)
                setRevokeReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={revokeReason.trim().length < 5 || isPending}
              onClick={() => {
                if (!revokeDialog) return
                startTransition(async () => {
                  const result = await revokeAIApproval({ intakeId: revokeDialog, reason: revokeReason.trim() })
                  if (result.success) {
                    toast.success("Certificate revoked. Request moved back to queue.")
                    setRevokeDialog(null)
                    setRevokeReason("")
                    router.refresh()
                  } else {
                    toast.error(result.error || "Failed to revoke certificate")
                  }
                })
              }}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Revoke Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog
        open={!!declineDialog}
        onOpenChange={() => {
          setDeclineDialog(null)
          setDeclineReasonCode("")
          setDeclineReasonNote("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>Select a reason. The patient will be notified by email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2.5">Reason</p>
              <div className="flex flex-wrap gap-2">
                {declineTemplates.map((template) => (
                  <button
                    key={template.code}
                    onClick={() => handleDeclineTemplateChange(template.code)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border transition-colors",
                      declineReasonCode === template.code
                        ? "bg-destructive text-destructive-foreground border-destructive"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    )}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
            {declineReasonCode && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Note {requiresNote ? "(required)" : "(optional)"}
                </label>
                <Textarea
                  placeholder="Additional details for the patient..."
                  value={declineReasonNote}
                  onChange={(e) => setDeclineReasonNote(e.target.value)}
                  className="min-h-[80px]"
                  autoFocus
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeclineDialog(null)
                setDeclineReasonCode("")
                setDeclineReasonNote("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={!declineReasonCode || (requiresNote && !declineReasonNote.trim()) || isPending}
            >
              Decline & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Request Dialog */}
      <Dialog
        open={!!infoDialog}
        onOpenChange={() => {
          setInfoDialog(null)
          setInfoMessage("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request More Information</DialogTitle>
            <DialogDescription>The patient will be notified by email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">What do you need?</label>
              <Select value={infoTemplateCode} onValueChange={handleInfoTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {infoTemplates.map((template) => (
                    <SelectItem key={template.code} value={template.code}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message to patient</label>
              <Textarea
                placeholder="Explain what you need..."
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setInfoDialog(null)
                setInfoMessage("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestInfo}
              disabled={!infoTemplateCode || !infoMessage.trim() || isPending}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={!!flagDialog} onOpenChange={() => setFlagDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag for Follow-up</DialogTitle>
            <DialogDescription>Add a note about why this case needs follow-up.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Follow-up reason..."
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleFlag} disabled={!flagReason.trim() || isPending}>
              Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
