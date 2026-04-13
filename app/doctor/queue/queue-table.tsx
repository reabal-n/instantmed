"use client"

import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Flag,
  Loader2,
  MoreVertical,
  ShieldAlert,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react"
import { MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
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
import { SERVICE_TYPES } from "@/lib/doctor/service-types"
import { calculateAge } from "@/lib/format"
import { formatServiceType } from "@/lib/format/intake"
import { cn } from "@/lib/utils"
import type { IntakeWithPatient } from "@/types/db"

import type { PaginationInfo } from "./types"
import type { QueueDialogState } from "./use-queue-dialogs"

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

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1
  const currentPage = pagination?.page ?? 1

  return (
    <>
      {/* Queue List */}
      <div className="space-y-3">
        {filteredIntakes.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Queue is clear!"
            description="No requests pending review. New requests will appear here automatically."
          />
        ) : (
          filteredIntakes.map((intake) => {
            const isExpanded = expandedId === intake.id
            const waitSeverity = getWaitTimeSeverity(intake.created_at, intake.sla_deadline)
            const patientAge = calculateAge(intake.patient.date_of_birth)
            const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined

            return (
              <Card
                key={intake.id}
                className={cn(
                  "rounded-xl border-border transition-all duration-200",
                  isExpanded && "ring-2 ring-primary/30"
                )}
              >
                {/* Collapsed row */}
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors py-4 px-5"
                  onClick={() => {
                    if (!isExpanded) {
                      capture("doctor_case_opened", {
                        intake_id: intake.id,
                        service_type: (intake.service as { type?: string })?.type,
                      })
                    }
                    onToggleExpand(intake.id)
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground hidden sm:block" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground hidden sm:block" />
                      )}
                      <UserCard
                        name={intake.patient.full_name}
                        description={patientAge != null ? `${patientAge}y` : ""}
                        size="sm"
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {service?.short_name || formatServiceType(service?.type || "")}
                        </Badge>
                        {(() => {
                          const subtypeLabel = getConsultSubtypeLabel(intake.subtype)
                          return subtypeLabel ? (
                            <Badge variant="secondary" className="text-xs">
                              {subtypeLabel}
                            </Badge>
                          ) : null
                        })()}
                        {intake.is_priority && (
                          <Badge className="bg-warning-light text-warning border-warning-border">
                            <Zap className="w-3 h-3 mr-1" />
                            Priority
                          </Badge>
                        )}
                        {hasRedFlags(intake) && (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            Flagged
                          </Badge>
                        )}
                        {intake.ai_draft_status === "completed" && (
                          <Badge className="bg-info-light text-info border-info-border">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI ready
                          </Badge>
                        )}
                        {intake.ai_approved && (
                          <Badge className="bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Auto-reviewed
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {intake.sla_deadline ? (
                        <div
                          className={cn(
                            "flex items-center gap-1.5 text-sm font-medium",
                            waitSeverity === "critical"
                              ? "text-destructive"
                              : waitSeverity === "warning"
                              ? "text-warning"
                              : "text-success"
                          )}
                        >
                          <Clock className="h-4 w-4" />
                          <span>{calculateSlaCountdown(intake.sla_deadline)}</span>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "flex items-center gap-1.5 text-sm",
                            waitSeverity === "critical"
                              ? "text-destructive"
                              : waitSeverity === "warning"
                              ? "text-warning"
                              : "text-muted-foreground"
                          )}
                        >
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{calculateWaitTime(intake.created_at)}</span>
                        </div>
                      )}
                      {waitSeverity === "critical" && (
                        <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Critical" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded - just link + actions, detailed review on the detail page */}
                {isExpanded && (
                  <CardContent className="pt-0 pb-5 px-5 space-y-3">
                    <button
                      type="button"
                      onClick={() => openReviewPanel(intake.id)}
                      className="inline-flex items-center text-sm text-primary hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Review case
                    </button>

                    <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t">
                      <Button
                        onClick={() => onApprove(intake.id, service?.type)}
                        disabled={isPending || !identityComplete}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                        title={
                          !identityComplete
                            ? "Complete your Certificate Identity in Settings first"
                            : undefined
                        }
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                        )}
                        {service?.type === SERVICE_TYPES.MED_CERTS
                          ? "Review & Build"
                          : service?.type === SERVICE_TYPES.COMMON_SCRIPTS
                          ? "Approve Script"
                          : "Approve"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setDeclineDialog(intake.id)}
                        disabled={isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Decline
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setInfoDialog(intake.id)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Request more info
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFlagDialog(intake.id)}>
                            <Flag className="h-4 w-4 mr-2" />
                            Flag for follow-up
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* AI-Approved Review Section - above pagination so doctors always see it */}
      {aiApprovedIntakes.length > 0 && (
        <Card className="border-violet-200/50 dark:border-violet-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <h3 className="text-sm font-semibold text-foreground">
                AI-Approved Certificates ({aiApprovedIntakes.length})
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">AI-reviewed. Please verify and revoke if needed.</p>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {aiApprovedIntakes.map((intake) => {
              const aiService = intake.service as { short_name?: string; type?: string } | undefined
              return (
                <div
                  key={intake.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => openReviewPanel(intake.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserCard name={intake.patient.full_name} size="sm" className="shrink-0" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {aiService?.short_name || "Med Cert"}
                      </Badge>
                      <Badge className="bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20">
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
          </CardContent>
        </Card>
      )}

      {/* Recently Completed Today */}
      {recentlyCompleted.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <h3 className="text-sm font-semibold text-foreground">
                Completed Today ({recentlyCompleted.length})
              </h3>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-1.5">
            {recentlyCompleted.slice(0, 5).map((intake) => {
              const svc = intake.service as { short_name?: string; type?: string } | undefined
              return (
                <div
                  key={intake.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/doctor/intakes/${intake.id}`)}
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
        </Card>
      )}

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-5 px-2 border-t">
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
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2.5 block">Reason</label>
              <Select value={declineReasonCode} onValueChange={handleDeclineTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {declineTemplates.map((template) => (
                    <SelectItem key={template.code} value={template.code}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Note {requiresNote ? "(required)" : "(optional)"}
              </label>
              <Textarea
                placeholder="Additional details for the patient..."
                value={declineReasonNote}
                onChange={(e) => setDeclineReasonNote(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
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
