"use client"

import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Loader2,
  MessageSquare,
  RotateCw,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { revokeAIApproval } from "@/app/actions/revoke-ai-approval"
import { PatientProfilePanel } from "@/components/doctor/patient-profile-panel"
import { usePanel } from "@/components/panels/panel-provider"
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
import { Pagination, UserCard } from "@/components/uix"
import { capture } from "@/lib/analytics/capture"
import { ADMIN_PRESCRIBING_IDENTITY_HREF, buildDoctorIntakeHref, STAFF_DASHBOARD_HREF } from "@/lib/dashboard/routes"
import { buildPatientHandoffSummary } from "@/lib/doctor/patient-handoff"
import { buildPatientSnapshot, getPatientSnapshotOptionsForCase } from "@/lib/doctor/patient-snapshot"
import { LAST_OPENED_DOCTOR_CASE_KEY } from "@/lib/doctor/queue-focus"
import { getQueueEnteredAt, getQueueStatusMeta } from "@/lib/doctor/queue-utils"
import {
  formatRenewalMatchTitle,
  RENEWAL_FALLBACK_TITLE,
  type RenewalMatch,
} from "@/lib/doctor/renewal-format"
import { SERVICE_TYPES } from "@/lib/doctor/service-types"
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

function getCompactPatientDescription(patient: {
  ageDobLabel: string
  sex: { value?: string }
  address: { present: boolean; value?: string }
}): string {
  const location = patient.address.present && patient.address.value
    ? patient.address.value.split(",").slice(-3, -1).map((part) => part.trim()).filter(Boolean).join(" ")
    : null
  const ageDob = patient.ageDobLabel.replace(" / ", " • ")
  return [ageDob, patient.sex.value, location].filter(Boolean).join(" • ")
}

function getCompactQueueReason(service: { type?: string; name?: string; short_name?: string } | undefined, subtype: string | null | undefined): string {
  if (service?.type === SERVICE_TYPES.MED_CERTS) return "Medical certificate request"
  if (service?.type === SERVICE_TYPES.COMMON_SCRIPTS || service?.type === "repeat_rx") return "Prescription request"
  if (subtype === "ed") return "ED consult request"
  if (subtype === "hair_loss") return "Hair loss consult request"
  return `${service?.short_name || service?.name || "Clinical"} request`
}

const REVIEW_TARGET_MINUTES = 120
const REVIEW_TARGET_STATUSES = new Set(["paid", "in_review", "pending_info", "awaiting_script"])
const QUEUE_DOM_WINDOW_LIMIT = 100

// Soft-claim lock timeout — matches the server-side claim TTL in
// `lib/data/intake-lock.ts`. Hoisted to module scope so the row render
// loop doesn't re-allocate the constant on every map iteration.
const SOFT_CLAIM_TIMEOUT_MS = 10 * 60 * 1000

// AEST short timestamp formatter used by the queue row. Hoisted to module
// scope so we don't redefine the closure on every render of `QueueTable`.
const QUEUE_TS_FORMATTER = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})
function formatQueueTimestamp(value: string | null | undefined): string | null {
  if (!value) return null
  return QUEUE_TS_FORMATTER.format(new Date(value))
}

function getPlainSearchHighlight(query: string | null | undefined): string {
  if (!query) return ""
  return query
    .toLowerCase()
    .replace(/\w+:\S+/g, "")
    .trim()
}

export function isPastReviewTarget(queueEnteredAt: string | null | undefined, now = Date.now()): boolean {
  if (!queueEnteredAt) return false
  const enteredAt = new Date(queueEnteredAt).getTime()
  if (!Number.isFinite(enteredAt)) return false
  return now - enteredAt >= REVIEW_TARGET_MINUTES * 60 * 1000
}

export interface QueueTableProps {
  filteredIntakes: IntakeWithPatient[]
  intakes?: IntakeWithPatient[]
  expandedId: string | null
  isPending: boolean
  identityComplete: boolean
  onApprove: (intakeId: string, serviceType?: string | null) => void
  hasRedFlags: (intake: IntakeWithPatient) => boolean
  calculateWaitTime: (createdAt: string) => string
  getWaitTimeSeverity: (createdAt: string, slaDeadline?: string | null) => "normal" | "warning" | "critical"
  openReviewPanel: (intakeId: string) => void
  onPrimeReviewPanelCode?: () => void
  openIntakeId: string | null
  doctorId: string
  lastOpenedIntakeId: string | null
  onRememberOpenedCase: (intakeId: string) => void
  dialogs: QueueDialogState

  // Extra sections
  aiApprovedIntakes: IntakeWithPatient[]
  recentlyCompleted: IntakeWithPatient[]
  pagination?: PaginationInfo
  baseHref?: string
  emptyState?: {
    title: string
    description: string
    tone: "success" | "warning" | "neutral"
    actionHref?: string
    actionLabel?: string
    /**
     * When present AND tone is "success" (genuinely caught up, no filters
     * narrowing the view), renders a calm "All caught up" card with this
     * summary line instead of the default decorative empty state.
     */
    summary?: string | null
  }
  compactShell?: boolean
  searchQuery?: string
  /**
   * Set of row IDs that just arrived via realtime. Rendered with a calm
   * left border for ~1.5s, then removed (managed by the parent).
   */
  newlyArrivedIds?: Set<string>
}

export function QueueTable({
  filteredIntakes,
  intakes = [],
  expandedId,
  isPending,
  identityComplete,
  onApprove,
  hasRedFlags,
  calculateWaitTime,
  getWaitTimeSeverity,
  openReviewPanel,
  onPrimeReviewPanelCode,
  openIntakeId,
  doctorId,
  lastOpenedIntakeId,
  onRememberOpenedCase,
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
  baseHref = STAFF_DASHBOARD_HREF,
  emptyState = {
    title: "No review cases right now",
    description: "Paid clinical work, pending replies, and scripts will appear here automatically.",
    tone: "success",
  },
  compactShell = false,
  searchQuery = "",
  newlyArrivedIds,
}: QueueTableProps) {
  const router = useRouter()
  const { openPanel } = usePanel()
  const [, startTransition] = useTransition()
  const [completedExpanded, setCompletedExpanded] = useState(false)
  const [aiExpanded, setAiExpanded] = useState(false)

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1
  const currentPage = pagination?.page ?? 1
  const renderedIntakes = filteredIntakes.length > QUEUE_DOM_WINDOW_LIMIT
    ? filteredIntakes.slice(0, QUEUE_DOM_WINDOW_LIMIT)
    : filteredIntakes
  const isDomWindowed = renderedIntakes.length < filteredIntakes.length
  const plainSearchHighlight = useMemo(
    () => getPlainSearchHighlight(searchQuery),
    [searchQuery],
  )
  const pendingReplyCount = intakes.filter((intake) => intake.status === "pending_info").length
  const scriptCount = intakes.filter((intake) => intake.status === "awaiting_script").length

  // A patient is "returning" if they have a recently completed case.
  // Memoised so the Set isn't rebuilt on every render — the queue
  // re-renders on every 30s clock tick + every search keystroke.
  const returningPatientIds = useMemo(
    () => new Set(recentlyCompleted.map((r) => r.patient_id)),
    [recentlyCompleted],
  )

  const rememberOpenedCase = (intakeId: string) => {
    onRememberOpenedCase(intakeId)
    try {
      sessionStorage.setItem(LAST_OPENED_DOCTOR_CASE_KEY, intakeId)
    } catch {
      // Best-effort visual memory only.
    }
  }

  // Calm "All caught up." card replaces the decorative empty state when the
  // queue is genuinely empty (no filters / search narrowing the view) and
  // upstream supplied a summary line built from `recentlyCompleted`.
  const showCaughtUpSummary =
    filteredIntakes.length === 0 &&
    emptyState.tone === "success" &&
    typeof emptyState.summary === "string" &&
    emptyState.summary.length > 0

  return (
    <>
      {/* Queue List — flat rows, single click opens review panel */}
      {filteredIntakes.length === 0 ? (
        showCaughtUpSummary ? (
          <div
            className={cn(
              "rounded-xl border border-border/50 bg-card p-6 text-center shadow-sm shadow-primary/[0.04] motion-safe:animate-[fade-in_150ms_ease-out]",
              compactShell && "min-h-0 flex-1",
            )}
          >
            <p className="text-sm font-medium text-foreground">All caught up.</p>
            <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
              {emptyState.summary}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 text-center motion-safe:animate-[fade-in_150ms_ease-out]",
              compactShell ? "min-h-0 flex-1 py-8" : "py-16",
            )}
          >
            <div
              className={cn(
                "mb-3 flex h-11 w-11 items-center justify-center rounded-xl border",
                emptyState.tone === "warning"
                  ? "border-warning-border bg-warning-light"
                  : "border-success-border bg-success-light",
              )}
            >
              {emptyState.tone === "warning" ? (
                <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
              ) : (
                <CheckCircle className="h-5 w-5 text-success" aria-hidden="true" />
              )}
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">{emptyState.title}</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {emptyState.description}
            </p>
            {emptyState.actionHref && (
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href={emptyState.actionHref}>{emptyState.actionLabel ?? "Open"}</Link>
              </Button>
            )}
          </div>
        )
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm shadow-primary/[0.03]",
            compactShell && "min-h-0 flex-1 overflow-y-auto",
          )}
        >
          {renderedIntakes.map((intake, index) => {
            const isFocused = expandedId === intake.id
            const queueEnteredAt = getQueueEnteredAt(intake)
            const waitSeverity = getWaitTimeSeverity(queueEnteredAt, intake.sla_deadline)
            const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined
            const answers = (intake.answers as Array<{ answers: Record<string, unknown> }> | null | undefined)?.[0]?.answers
            const patientSnapshot = buildPatientSnapshot(intake.patient, {
              ...getPatientSnapshotOptionsForCase({
                answers,
                category: intake.category,
                serviceType: service?.type,
                subtype: intake.subtype,
              }),
              answers,
            })
            const handoffSummary = buildPatientHandoffSummary(patientSnapshot)
            const statusMeta = getQueueStatusMeta(intake.status)
            const paidAt = formatQueueTimestamp(intake.paid_at)
            const submittedAt = formatQueueTimestamp(intake.submitted_at ?? intake.created_at)
            const claimLabel = intake.claimed_by
              ? intake.claimed_by === doctorId
                ? "Claimed by you"
                : "Claimed"
              : null
            // Soft-claim presence — derived from `claimed_at` + the 10-minute
            // lock timeout that `lib/data/intake-lock.ts` enforces. Only show
            // active claims (within timeout). If `reviewing_doctor_name` is
            // populated we use that; otherwise we fall back to "Another doctor".
            const claimMsSinceAcquired = intake.claimed_at
              ? Date.now() - new Date(intake.claimed_at).getTime()
              : null
            const claimActive =
              claimMsSinceAcquired != null && claimMsSinceAcquired < SOFT_CLAIM_TIMEOUT_MS
            const claimedByOther =
              claimActive && intake.claimed_by != null && intake.claimed_by !== doctorId
            const claimedByMe =
              claimActive && intake.claimed_by != null && intake.claimed_by === doctorId
            const claimantName =
              (intake as IntakeWithPatient & { reviewing_doctor_name?: string | null })
                .reviewing_doctor_name ?? null
            const overReviewTarget =
              intake.payment_status === "paid" &&
              REVIEW_TARGET_STATUSES.has(intake.status) &&
              isPastReviewTarget(queueEnteredAt)
            const showIdentityFix =
              compactShell &&
              intake.status === "awaiting_script" &&
              patientSnapshot.missingCriticalFields.length > 0
            const identityFixHref = `${ADMIN_PRESCRIBING_IDENTITY_HREF}#identity-${intake.id}`
            const subtypeLabel = getConsultSubtypeLabel(intake.subtype)
            const serviceBadgeLabel = compactShell && subtypeLabel
              ? `${subtypeLabel} consult`
              : service?.short_name || formatServiceType(service?.type || "")

            const isOpen = openIntakeId === intake.id
            const isSelected = isFocused || isOpen
            const isLastOpened = lastOpenedIntakeId === intake.id && !isSelected
            const isReturning = returningPatientIds.has(intake.patient_id)
            const justArrived = newlyArrivedIds?.has(intake.id) ?? false
            const openCaseFromPrimaryAction = () => {
              rememberOpenedCase(intake.id)
              openReviewPanel(intake.id)
            }
            const showRoutineStatus = !compactShell || !["paid", "in_review"].includes(intake.status)
            const showInlineWaitTime = true
            const waitLabel = calculateWaitTime(queueEnteredAt)
            const displayWaitLabel = waitLabel === "just now" ? "Just arrived" : `Waiting ${waitLabel}`
            const compactQueueReason = compactShell
              ? getCompactQueueReason(service, intake.subtype)
              : null
            const compactTaxonomyChipClass = "border-border/60 bg-background text-muted-foreground"
            const compactStatusChipClass = "border-slate-900 bg-slate-900 text-white dark:border-white/15 dark:bg-white/10 dark:text-foreground"
            return (
              <div
                key={intake.id}
                data-testid={`queue-row-${intake.id}`}
                className={cn(
                  "group relative grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-3 transition-colors duration-150 sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto_auto] sm:items-center sm:px-4",
                  compactShell && "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start",
                  // Linear-tier density: compact rows breathe at 8px vertical
                  // padding so 12-15 cases fit in one viewport at 1440px.
                  compactShell ? "py-2.5" : "py-3",
                  "hover:bg-muted/40",
                  index < renderedIntakes.length - 1 && "border-b border-border/40",
                  isSelected && (
                    compactShell
                      ? "bg-[#FFFEFB] shadow-[inset_3px_0_0_hsl(var(--border))] ring-1 ring-inset ring-border/70 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-slate-300 before:content-[''] dark:bg-card"
                      : "bg-primary/[0.04] shadow-[inset_3px_0_0_hsl(var(--primary))] ring-1 ring-inset ring-primary/25 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-primary before:content-[''] dark:bg-primary/[0.08]"
                  ),
                  !compactShell && isLastOpened && "bg-muted/35 ring-1 ring-inset ring-border/60",
                  // Phase 10: subtle realtime arrival emphasis. Decays via
                  // the row transition when the parent removes the row from
                  // `newlyArrivedIds` after ~1.5s.
                  justArrived && "bg-primary/[0.035] ring-1 ring-inset ring-primary/20"
                )}
                onClick={() => {
                  rememberOpenedCase(intake.id)
                  capture("doctor_case_opened", {
                    intake_id: intake.id,
                    service_type: service?.type,
                  })
                  openReviewPanel(intake.id)
                }}
                onPointerEnter={onPrimeReviewPanelCode}
                onFocus={onPrimeReviewPanelCode}
              >
                {/* Patient */}
                <div className="col-start-1 row-start-1 min-w-0 sm:shrink-0">
                  <UserCard
                    name={patientSnapshot.name}
                    highlight={plainSearchHighlight}
                    description={
                      compactShell
                        ? getCompactPatientDescription(patientSnapshot)
                        : patientSnapshot.age != null ? `${patientSnapshot.age}y` : "DOB missing"
                    }
                    descriptionClassName={compactShell ? "line-clamp-2 whitespace-normal break-words" : undefined}
                    size="sm"
                  />
                </div>

                {/* Badges */}
                <div className={cn(
                  "col-span-2 col-start-1 row-start-2 flex min-w-0 flex-wrap items-center gap-1.5 sm:col-span-1 sm:col-start-2 sm:row-start-1",
                  compactShell && "sm:col-span-2 sm:col-start-1 sm:row-start-2",
                )}>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      compactShell && `min-w-fit whitespace-nowrap ${compactTaxonomyChipClass}`,
                    )}
                    data-queue-taxonomy-chip
                  >
                    {serviceBadgeLabel}
                  </Badge>
                  {showRoutineStatus && (
                    <Badge
                      variant={compactShell ? "default" : "outline"}
                      className={cn(
                        "text-xs",
                        compactShell
                          ? compactStatusChipClass
                          : statusMeta.tone === "script" && "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
                        !compactShell && statusMeta.tone === "info" && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
                        !compactShell && statusMeta.tone === "review" && "border-info-border bg-info-light text-info",
                      )}
                      data-queue-status-chip
                    >
                      {statusMeta.label}
                    </Badge>
                  )}
                  {!compactShell && subtypeLabel ? (
                    <Badge variant="secondary" className="text-xs">{subtypeLabel}</Badge>
                  ) : null}
                  {intake.is_priority && (
                    <Badge className="bg-warning-light text-warning border-warning-border">
                      <Zap className="w-3 h-3 mr-1" />Priority
                    </Badge>
                  )}
                  {hasRedFlags(intake) && (
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                      <ShieldAlert className="w-3 h-3 mr-1" />
                      {compactShell ? "Risk" : "Flagged"}
                    </Badge>
                  )}
                  {!compactShell && intake.ai_draft_status === "completed" && (
                    <Badge className="bg-info-light text-info border-info-border">
                      <Sparkles className="w-3 h-3 mr-1" />AI ready
                    </Badge>
                  )}
                  {!compactShell && intake.ai_approved && (
                    <Badge className="bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20">
                      <Sparkles className="w-3 h-3 mr-1" />Auto-reviewed
                    </Badge>
                  )}
                  {!compactShell && isReturning && (
                    <Badge variant="outline" className="text-xs text-muted-foreground border-border/50">
                      Returning
                    </Badge>
                  )}
                  {!compactShell && Boolean((intake as IntakeWithPatient & { is_renewal?: boolean }).is_renewal) && (() => {
                    const renewalMatch = (intake as IntakeWithPatient & {
                      renewal_match?: RenewalMatch | null
                    }).renewal_match ?? null
                    const renewalTitle = renewalMatch
                      ? formatRenewalMatchTitle(renewalMatch)
                      : RENEWAL_FALLBACK_TITLE
                    return (
                      <Badge
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
                        title={renewalTitle}
                        aria-label={renewalTitle}
                      >
                        <RotateCw className="h-3 w-3 mr-1" />Renewal
                      </Badge>
                    )
                  })()}
                  {/* Soft-claim presence (Phase 7). Two-doctor model: surface
                      who's reviewing a paid case before another doctor opens
                      the same one and races on Approve. The DB-level claim
                      is enforced by `claim_intake_for_review`; this chip is
                      the visual layer that prevents wasted clicks. */}
                  {claimedByOther && (
                    <Badge
                      variant={compactShell ? "default" : "outline"}
                      className={cn(
                        "text-xs",
                        compactShell
                          ? "border-warning bg-warning text-white dark:border-warning/40 dark:bg-warning/20 dark:text-warning"
                          : "border-warning-border bg-warning-light text-warning",
                      )}
                      title={`${claimantName ?? "Another doctor"} is reviewing this case. The DB lock will release after 10 minutes of inactivity.`}
                      data-queue-status-chip
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {compactShell
                        ? (claimantName ?? "Reviewing")
                        : `Reviewing: ${claimantName ?? "Another doctor"}`}
                    </Badge>
                  )}
                  {claimedByMe && (
                    <Badge
                      variant={compactShell ? "default" : "outline"}
                      className={cn(
                        "text-xs",
                        compactShell
                          ? compactStatusChipClass
                          : "border-primary/30 bg-primary/10 text-primary",
                      )}
                      title="You're holding the review claim on this case."
                      data-queue-status-chip
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {compactShell ? "Claimed" : "You"}
                    </Badge>
                  )}
                  {!compactShell && claimLabel && !claimActive && (
                    <Badge variant="outline" className="text-xs text-muted-foreground border-border/50">
                      {claimLabel}
                    </Badge>
                  )}
                  {!compactShell && overReviewTarget && (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                      <Clock className="w-3 h-3 mr-1" />Over review target
                    </Badge>
                  )}
                  {handoffSummary.tone !== "success" && !showIdentityFix && (
                    <Badge
                      variant={handoffSummary.tone === "critical" ? "destructive" : "warning"}
                      className="max-w-full text-xs"
                      title={`${handoffSummary.tooltip} ${handoffSummary.actionLabel}.`}
                      aria-label={handoffSummary.tooltip}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      <span className={compactShell ? "" : "sm:hidden"}>{handoffSummary.shortLabel}</span>
                      {!compactShell && <span className="hidden sm:inline">{handoffSummary.statusLabel}</span>}
                    </Badge>
                  )}
                  {!compactShell && isSelected && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                      Selected
                    </Badge>
                  )}
                  {!compactShell && isLastOpened && (
                    <Badge variant="outline" className="text-xs text-muted-foreground border-border/60">
                      Last opened
                    </Badge>
                  )}
                  {compactQueueReason ? (
                    <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                      {compactQueueReason}
                    </span>
                  ) : null}
                </div>

                {/* Quick actions */}
                <div className={cn(
                  "col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-1 sm:col-start-3",
                  compactShell && "sm:col-start-2",
                )}>
                  {showIdentityFix && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-warning-border bg-warning-light px-2.5 text-xs text-warning hover:bg-warning-light/80"
                      asChild
                    >
                      <Link
                        href={identityFixHref}
                        onClick={(event) => {
                          event.stopPropagation()
                        }}
                        aria-label={`Verify prescribing identity for ${intake.patient.full_name}`}
                      >
                        Verify identity · Missing {patientSnapshot.missingCriticalFields.length}
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size={compactShell ? "icon" : "sm"}
                    className={cn(
                      "h-8 px-3 text-xs",
                      compactShell && "w-8 border-transparent bg-transparent px-0 text-muted-foreground shadow-none hover:bg-muted/45 hover:text-foreground",
                    )}
                    aria-label={`Open case for ${intake.patient.full_name}`}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return
                      event.stopPropagation()
                      openCaseFromPrimaryAction()
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      // Pointer activation is handled on pointer-down so
                      // hover/focus chrome cannot swallow the first press.
                      // Keyboard and assistive-tech activation still arrive
                      // as click events with detail 0.
                      if (event.detail === 0) openCaseFromPrimaryAction()
                    }}
                    disabled={isPending}
                  >
                    {compactShell ? (
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Open
                      </>
                    )}
                  </Button>
                  {!compactShell && (
                    <div
                      className={cn(
                        "items-center gap-1",
                        "hidden group-hover:flex group-focus-within:flex",
                        isFocused && "flex",
                      )}
                    >
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
                          openPanel({
                            id: `doctor-patient-profile-${intake.patient.id}`,
                            type: "drawer",
                            component: (
                              <PatientProfilePanel
                                patient={intake.patient}
                                answers={answers}
                                serviceContext={{
                                  category: intake.category,
                                  serviceType: service?.type,
                                  subtype: intake.subtype,
                                }}
                                sourceLabel={intake.reference_number || "Queue case"}
                              />
                            ),
                          })
                        }}
                        title="Open patient profile"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Wait time */}
                {showInlineWaitTime && (
                  <div className={cn(
                    "col-start-1 row-start-3 flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums sm:col-start-4 sm:row-start-1 sm:justify-end",
                    compactShell && "sm:col-start-1 sm:row-start-3 sm:justify-start",
                    waitSeverity === "critical" ? "text-destructive" : waitSeverity === "warning" ? "text-warning" : "text-muted-foreground"
                  )}>
                    <Clock className="h-3.5 w-3.5" />
                    <span
                      key={displayWaitLabel}
                      className="motion-safe:animate-[wait-digit-tick_160ms_cubic-bezier(0.16,1,0.3,1)]"
                      data-live-wait-counter
                    >
                      {displayWaitLabel}
                    </span>
                  </div>
                )}
                {!compactShell && (paidAt || submittedAt) && (
                  <p className="col-span-2 col-start-1 row-start-4 text-[11px] text-muted-foreground sm:col-span-2 sm:col-start-2 sm:row-start-2">
                    {paidAt ? `Paid ${paidAt}` : "Paid time missing"}
                    {submittedAt ? ` · Submitted ${submittedAt}` : ""}
                  </p>
                )}
                {!compactShell && waitSeverity === "critical" && (
                  <AlertTriangle className="col-start-2 row-start-3 h-3.5 w-3.5 shrink-0 justify-self-end text-destructive sm:col-start-4 sm:row-start-1" aria-label="Critical" />
                )}
              </div>
            )
          })}
          {isDomWindowed && (
            <div className="border-t border-border/40 bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
              Showing the first {QUEUE_DOM_WINDOW_LIMIT} visible rows. Refine the search or move to the next page for the rest.
            </div>
          )}
          {compactShell && filteredIntakes.length <= 1 && (pendingReplyCount > 0 || scriptCount > 0) && (
            <div className="border-t border-border/40 bg-muted/15 px-4 py-3">
              <p className="text-xs font-semibold text-foreground">Follow-ups</p>
              <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="rounded-lg border border-border/45 bg-white px-3 py-2 dark:bg-background">
                  <span className="font-medium text-foreground tabular-nums">{pendingReplyCount}</span>{" "}
                  pending replies
                </div>
                <div className="rounded-lg border border-border/45 bg-white px-3 py-2 dark:bg-background">
                  <span className="font-medium text-foreground tabular-nums">{scriptCount}</span>{" "}
                  scripts to write
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI-Approved Review Section - above pagination so doctors always see it */}
      {!compactShell && aiApprovedIntakes.length > 0 && (
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
      {!compactShell && recentlyCompleted.length > 0 && (
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
                  onClick={() => {
                    rememberOpenedCase(intake.id)
                    router.push(buildDoctorIntakeHref(intake.id))
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      rememberOpenedCase(intake.id)
                      router.push(buildDoctorIntakeHref(intake.id))
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
        <div className="flex shrink-0 flex-col items-center justify-between gap-2 border-t px-2 py-4 sm:flex-row">
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
              router.push(`${baseHref}?${params.toString()}`)
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
