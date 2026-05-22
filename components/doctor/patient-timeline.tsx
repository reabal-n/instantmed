"use client"

/**
 * Unified patient activity timeline.
 *
 * Phase 4b of dashboard remaster (2026-05-12). The patient profile
 * page used to render four separate scroll-heavy cards (intakes,
 * prescriptions, emails, audit events) plus an old narrower
 * `PatientTimeline` that only knew about intakes + notes. This
 * component absorbs all of them into one chronological stream so the
 * doctor reads the patient's interaction history top-to-bottom
 * instead of jumping between cards.
 *
 * Item shapes are discriminated unions; the parent decides the
 * shape of each input array and the timeline merges, sorts, and
 * renders. Filter tabs let the operator narrow to a single channel
 * (Requests / Prescriptions / Notes / Emails / Audit) when needed.
 */

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  type LucideIcon,
  Mail,
  MoreHorizontal,
  Pill,
  RotateCcw,
  StickyNote,
  Webhook,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { memo, useCallback, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { IntakeRefundDialog } from "@/app/doctor/intakes/[id]/intake-refund-dialog"
import { issueRefundAction } from "@/app/doctor/queue/actions"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buildAdminIntakeHref, buildDoctorIntakeHref } from "@/lib/dashboard/routes"
import { formatDateTime } from "@/lib/format"
import { formatIntakeStatus } from "@/lib/format/intake"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Public types — input shapes the parent provides
// ---------------------------------------------------------------------------

export interface PatientTimelineRequest {
  id: string
  status: string
  created_at: string
  reference_number?: string | null
  category?: string | null
  service_label?: string | null
  payment_status?: string | null
  /** Paid amount in cents. Needed to drive the per-row refund dialog. */
  amount_cents?: number | null
  /** Already-refunded amount in cents. 0 if none. */
  refund_amount_cents?: number | null
  service?: {
    name?: string | null
    short_name?: string | null
    type?: string | null
  } | null
}

export interface PatientTimelineNote {
  id: string
  content: string
  note_type: string
  created_at: string
  created_by_name?: string | null
}

export interface PatientTimelinePrescription {
  id: string
  source: "parchment" | "instantmed_request"
  medication_name: string
  medication_strength?: string | null
  dosage_instructions?: string | null
  quantity_prescribed?: number | null
  repeats_allowed?: number | null
  status: string
  recorded_at: string
  parchment_reference?: string | null
  request_id?: string | null
}

export interface PatientTimelineEmail {
  id: string
  email_type: string
  to_email: string
  subject: string
  status: string
  delivery_status?: string | null
  created_at: string
  sent_at?: string | null
  intake_id?: string | null
}

export interface PatientTimelineAudit {
  id: string
  status: "success" | "warning" | "destructive" | "info"
  label: string
  detail: string
  occurred_at: string
  event_id?: string | null
  scid?: string | null
  request_id?: string | null
}

// ---------------------------------------------------------------------------
// Internal: discriminated union after normalization
// ---------------------------------------------------------------------------

type TimelineItem =
  | { kind: "request"; date: string; data: PatientTimelineRequest }
  | { kind: "prescription"; date: string; data: PatientTimelinePrescription }
  | { kind: "note"; date: string; data: PatientTimelineNote }
  | { kind: "email"; date: string; data: PatientTimelineEmail }
  | { kind: "audit"; date: string; data: PatientTimelineAudit }

type FilterKind = "all" | TimelineItem["kind"]

interface FilterConfig {
  kind: FilterKind
  label: string
  icon: LucideIcon
}

const FILTERS: FilterConfig[] = [
  { kind: "all", label: "All", icon: Activity },
  { kind: "request", label: "Requests", icon: FileText },
  { kind: "prescription", label: "Prescriptions", icon: Pill },
  { kind: "note", label: "Notes", icon: StickyNote },
  { kind: "email", label: "Emails", icon: Mail },
  { kind: "audit", label: "Audit", icon: Webhook },
]

const EMAIL_TYPE_LABELS: Record<string, string> = {
  med_cert_patient: "Medical certificate",
  welcome: "Welcome email",
  verification: "Email verification",
  password_reset: "Password reset",
  intake_confirmation: "Request confirmation",
  intake_approved: "Request approved",
  intake_declined: "Request declined",
  needs_more_info: "Information request",
  reminder: "Reminder",
  ed_approved: "ED consult approved",
  hair_loss_approved: "Hair loss consult approved",
  script_sent: "Script sent",
  repeat_script_approved: "Repeat script approved",
}

function emailTypeLabel(type: string): string {
  if (EMAIL_TYPE_LABELS[type]) return EMAIL_TYPE_LABELS[type]
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function requestLabel(request: PatientTimelineRequest): string {
  return (
    request.service_label
    || request.service?.short_name
    || request.service?.name
    || request.category
    || "Request"
  )
}

function requestHref(request: PatientTimelineRequest, admin: boolean): string {
  return admin ? buildAdminIntakeHref(request.id) : buildDoctorIntakeHref(request.id)
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface PatientTimelineProps {
  requests?: PatientTimelineRequest[]
  notes?: PatientTimelineNote[]
  prescriptions?: PatientTimelinePrescription[]
  emails?: PatientTimelineEmail[]
  audit?: PatientTimelineAudit[]
  admin?: boolean
  /** Initial page size (rest fold behind a "Show older" button). */
  initialPageSize?: number
  /** Page size increment per "Show older" click. */
  pageStep?: number
  /**
   * Compact mode for narrow surfaces (intake review cockpit, side panel).
   * Hides the channel filter row and tightens spacing. Defaults to false.
   */
  compact?: boolean
  /**
   * Legacy alias for `initialPageSize`. Kept so existing compact callers
   * (intake-review-cockpit, patient-profile-panel) don't churn during
   * Phase 4b. Prefer `initialPageSize` for new code.
   */
  maxItems?: number
  title?: string
  emptyLabel?: string
  className?: string
}

// Module-frozen empties so default-prop omissions don't mint a fresh array
// identity per render, which would invalidate the merge memo's deps.
const EMPTY_REQUESTS: PatientTimelineRequest[] = []
const EMPTY_NOTES: PatientTimelineNote[] = []
const EMPTY_PRESCRIPTIONS: PatientTimelinePrescription[] = []
const EMPTY_EMAILS: PatientTimelineEmail[] = []
const EMPTY_AUDIT: PatientTimelineAudit[] = []

export function PatientTimeline({
  requests = EMPTY_REQUESTS,
  notes = EMPTY_NOTES,
  prescriptions = EMPTY_PRESCRIPTIONS,
  emails = EMPTY_EMAILS,
  audit = EMPTY_AUDIT,
  admin = false,
  initialPageSize,
  pageStep = 25,
  compact = false,
  maxItems,
  title = "Patient timeline",
  emptyLabel = "No activity recorded for this patient yet.",
  className,
}: PatientTimelineProps) {
  // Legacy `maxItems` callers expect a hard cap; treat it as initialPageSize
  // and skip the "Show older" affordance.
  const resolvedInitial = initialPageSize ?? maxItems ?? (compact ? 5 : 25)
  const isHardCapped = initialPageSize == null && maxItems != null

  const [filter, setFilter] = useState<FilterKind>("all")
  const [visibleCount, setVisibleCount] = useState(resolvedInitial)

  const allItems = useMemo<TimelineItem[]>(() => {
    // Parse each row's date to a numeric `ts` once during the merge, then
    // sort numerically. Before: `new Date(date).getTime()` ran twice per
    // comparator call (O(N log N) Date constructions). Now: O(N) parses +
    // a pure-number sort. Matters on long-lived patients with 200+ events.
    const merged: Array<TimelineItem & { ts: number }> = [
      ...requests.map((data) => ({
        kind: "request" as const,
        date: data.created_at,
        ts: Date.parse(data.created_at),
        data,
      })),
      ...prescriptions.map((data) => ({
        kind: "prescription" as const,
        date: data.recorded_at,
        ts: Date.parse(data.recorded_at),
        data,
      })),
      ...notes.map((data) => ({
        kind: "note" as const,
        date: data.created_at,
        ts: Date.parse(data.created_at),
        data,
      })),
      ...emails.map((data) => ({
        kind: "email" as const,
        date: data.sent_at || data.created_at,
        ts: Date.parse(data.sent_at || data.created_at),
        data,
      })),
      ...audit.map((data) => ({
        kind: "audit" as const,
        date: data.occurred_at,
        ts: Date.parse(data.occurred_at),
        data,
      })),
    ]
    return merged.sort((a, b) => b.ts - a.ts)
  }, [requests, prescriptions, notes, emails, audit])

  const totalsByKind = useMemo(() => {
    const totals: Record<FilterKind, number> = {
      all: allItems.length,
      request: 0,
      prescription: 0,
      note: 0,
      email: 0,
      audit: 0,
    }
    for (const item of allItems) totals[item.kind] += 1
    return totals
  }, [allItems])

  const filteredItems = useMemo(
    () => (filter === "all" ? allItems : allItems.filter((item) => item.kind === filter)),
    [allItems, filter],
  )

  const visibleItems = filteredItems.slice(0, visibleCount)
  const hasMore = !isHardCapped && filteredItems.length > visibleCount

  return (
    <section
      aria-label={title}
      className={cn(
        "rounded-xl border border-border/60 bg-background",
        className,
      )}
    >
      <header
        className={cn(
          "flex flex-col gap-3 border-b border-border/50 sm:flex-row sm:items-center sm:justify-between",
          compact ? "px-3 py-2" : "px-4 py-3",
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <Badge variant="outline" size="sm" className="shrink-0">
            {totalsByKind.all}
          </Badge>
        </div>

        {!compact && (
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((entry) => {
            const Icon = entry.icon
            const count = totalsByKind[entry.kind]
            const isActive = filter === entry.kind
            const isDisabled = entry.kind !== "all" && count === 0
            return (
              <button
                key={entry.kind}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  setFilter(entry.kind)
                  setVisibleCount(resolvedInitial)
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  isDisabled && "cursor-not-allowed opacity-40 hover:bg-background hover:text-muted-foreground",
                )}
                data-testid={`timeline-filter-${entry.kind}`}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {entry.label}
                <span className={cn(
                  "rounded-full px-1.5 text-[10px] tabular-nums",
                  isActive ? "bg-primary-foreground/20" : "bg-muted/60",
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        )}
      </header>

      {visibleItems.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          {filter === "all" ? emptyLabel : `No ${filter}s recorded for this patient.`}
        </div>
      ) : (
        <ol className="divide-y divide-border/40">
          {visibleItems.map((item) => (
            <TimelineRow key={`${item.kind}-${item.data.id}`} item={item} admin={admin} />
          ))}
        </ol>
      )}

      {hasMore && (
        <div className="border-t border-border/50 px-4 py-3 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setVisibleCount((count) => count + pageStep)}
          >
            Show {Math.min(pageStep, filteredItems.length - visibleCount)} older
          </Button>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Internal: Request row — has its own refund dialog state
// ---------------------------------------------------------------------------

function RequestTimelineRow({ request, admin }: { request: PatientTimelineRequest; admin: boolean }) {
  const baseClass = "flex min-w-0 items-start gap-3 px-4 py-3"
  const Icon = ICONS["request"]
  const status = INTAKE_STATUS_TONE[request.status] ?? "outline"

  const isRefundEligible =
    (request.payment_status === "paid" || request.payment_status === "partially_refunded") &&
    (request.amount_cents ?? 0) > 0

  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleConfirmRefund = useCallback(() => {
    startTransition(async () => {
      const result = await issueRefundAction(request.id)
      if (result.success) {
        setShowRefundDialog(false)
        const amountText = result.amount ? ` ($${(result.amount / 100).toFixed(2)})` : ""
        toast.success(`Refund processed${amountText}`)
      } else {
        toast.error(result.error ?? "Failed to process refund")
      }
    })
  }, [request.id])

  return (
    <li className="group relative">
      <Link
        href={requestHref(request, admin)}
        className={cn(baseClass, "block transition-colors hover:bg-muted/30 pr-10")}
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {requestLabel(request)}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {request.reference_number || request.id.slice(0, 8)} · {formatDateTime(request.created_at)}
          </p>
        </div>
        <Badge variant={status} size="sm" className="shrink-0">
          {formatIntakeStatus(request.status)}
        </Badge>
      </Link>

      {/* Kebab: hover-revealed, sits above the link */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Row actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild>
              <Link href={requestHref(request, admin)}>Open intake</Link>
            </DropdownMenuItem>
            {isRefundEligible && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setShowRefundDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" aria-hidden />
                  Issue refund
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isRefundEligible && (
        <IntakeRefundDialog
          open={showRefundDialog}
          onOpenChange={setShowRefundDialog}
          onConfirmRefund={handleConfirmRefund}
          isPending={isPending}
          paidAmountCents={request.amount_cents ?? 0}
          alreadyRefundedCents={request.refund_amount_cents ?? 0}
          patientName="the patient"
        />
      )}
    </li>
  )
}

// ---------------------------------------------------------------------------
// Internal: row renderer per kind
// ---------------------------------------------------------------------------

// React.memo so filter clicks and "Show older" don't re-render every row.
// The merge memo above keeps `item` identity stable across these state
// changes, so shallow equality is enough.
const TimelineRow = memo(function TimelineRow({ item, admin }: { item: TimelineItem; admin: boolean }) {
  const baseClass = "flex min-w-0 items-start gap-3 px-4 py-3"
  const Icon = ICONS[item.kind]

  switch (item.kind) {
    case "request": {
      return <RequestTimelineRow request={item.data} admin={admin} />
    }

    case "prescription": {
      const rx = item.data
      const titleParts = [rx.medication_name, rx.medication_strength].filter(Boolean).join(" ")
      const meta: string[] = []
      if (rx.quantity_prescribed != null) meta.push(`Qty ${rx.quantity_prescribed}`)
      if (rx.repeats_allowed != null) meta.push(`Repeats ${rx.repeats_allowed}`)
      if (rx.parchment_reference) meta.push(`SCID ${rx.parchment_reference}`)
      const sourceLabel = rx.source === "parchment" ? "Parchment" : "InstantMed request"

      return (
        <li className={baseClass}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{titleParts}</p>
            {rx.dosage_instructions && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{rx.dosage_instructions}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span>{sourceLabel}</span>
              <span aria-hidden>·</span>
              <span>{formatDateTime(rx.recorded_at)}</span>
              {meta.map((label) => (
                <span key={label} className="font-mono">
                  {label}
                </span>
              ))}
              {rx.request_id && (
                <Link
                  href={admin ? buildAdminIntakeHref(rx.request_id) : buildDoctorIntakeHref(rx.request_id)}
                  className="text-primary hover:underline"
                >
                  View request
                </Link>
              )}
            </div>
          </div>
          <Badge variant="outline" size="sm" className="shrink-0">
            {formatIntakeStatus(rx.status)}
          </Badge>
        </li>
      )
    }

    case "note": {
      const note = item.data
      return (
        <li className={cn(baseClass, "bg-muted/15")}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-3 text-sm leading-6 text-foreground">{note.content}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {note.created_by_name ? `${note.created_by_name} · ` : ""}
              {note.note_type} · {formatDateTime(note.created_at)}
            </p>
          </div>
        </li>
      )
    }

    case "email": {
      const email = item.data
      const tone = emailTone(email)
      return (
        <li className={baseClass}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {email.subject || emailTypeLabel(email.email_type)}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {emailTypeLabel(email.email_type)} · to {email.to_email} · {formatDateTime(email.sent_at || email.created_at)}
            </p>
          </div>
          <Badge variant={tone.variant} size="sm" className="shrink-0">
            {tone.label}
          </Badge>
        </li>
      )
    }

    case "audit": {
      const event = item.data
      return (
        <li className={baseClass}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{event.label}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{event.detail}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
              <span>{formatDateTime(event.occurred_at)}</span>
              {event.scid && <span className="font-mono">SCID {event.scid}</span>}
              {event.event_id && <span className="font-mono">Event {event.event_id}</span>}
              {event.request_id && (
                <Link
                  href={admin ? buildAdminIntakeHref(event.request_id) : buildDoctorIntakeHref(event.request_id)}
                  className="text-primary hover:underline"
                >
                  View request
                </Link>
              )}
            </div>
          </div>
          <Badge variant={event.status} size="sm" className="shrink-0">
            {event.status}
          </Badge>
        </li>
      )
    }
  }
})

const ICONS: Record<TimelineItem["kind"], LucideIcon> = {
  request: FileText,
  prescription: Pill,
  note: StickyNote,
  email: Mail,
  audit: Webhook,
}

const INTAKE_STATUS_TONE: Record<string, BadgeProps["variant"]> = {
  approved: "success",
  completed: "success",
  declined: "destructive",
  cancelled: "destructive",
  refunded: "warning",
  partially_refunded: "warning",
  pending_info: "warning",
  awaiting_script: "info",
  review: "info",
  paid: "info",
  draft: "outline",
  checkout_failed: "destructive",
}

function emailTone(email: PatientTimelineEmail): { variant: BadgeProps["variant"]; label: string } {
  const delivery = email.delivery_status?.toLowerCase()
  const status = email.status?.toLowerCase()
  if (delivery === "bounced" || status === "bounced" || status === "failed") {
    return { variant: "destructive", label: "Bounced" }
  }
  if (delivery === "delivered" || status === "delivered") {
    return { variant: "success", label: "Delivered" }
  }
  if (status === "sent") {
    return { variant: "info", label: "Sent" }
  }
  return { variant: "outline", label: status || "Pending" }
}

// Re-export icons used for empty-state guidance in callers.
export const PatientTimelineIcons = {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mail,
  Pill,
  StickyNote,
  FileText,
  Webhook,
  Clock,
}
