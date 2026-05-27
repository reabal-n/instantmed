"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { OperatorSplitPane } from "@/components/operator"
import { usePanel } from "@/components/panels/panel-provider"
import { Button } from "@/components/ui/button"
import {
  parseQueueStatusFilter,
  type QueueStatusFilter,
  STAFF_DASHBOARD_HREF,
  STAFF_IDENTITY_HREF,
} from "@/lib/dashboard/routes"
import { DOCTOR_QUEUE_FOCUS_AFTER_ACTION_KEY, LAST_OPENED_DOCTOR_CASE_KEY } from "@/lib/doctor/queue-focus"
import { QUEUE_WAIT_TARGET_MINUTES } from "@/lib/doctor/queue-pressure"
import { removeCompletedIntakeFromQueue } from "@/lib/doctor/queue-state"
import { calculateLiveWaitTime, getQueueEnteredAt, getWaitTimeSeverity } from "@/lib/doctor/queue-utils"
import { hasReviewNextRisk, sortForReviewNext } from "@/lib/doctor/review-next"
import { SERVICE_TYPES } from "@/lib/doctor/service-types"
import { useQueueRealtime } from "@/lib/doctor/use-queue-realtime"
import { formatMinutes } from "@/lib/format/dates"
import { formatServiceType } from "@/lib/format/intake"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { useIsDesktop } from "@/lib/hooks/use-media-query"
import { formatRelativeTime } from "@/lib/operator/cases/time-grouping"
import { cn } from "@/lib/utils"
import type { IntakeStatus, IntakeWithPatient } from "@/types/db"

import { updateStatusAction } from "./actions"
import { QueueFilters } from "./queue-filters"
import { QueueTable } from "./queue-table"
import type { QueueClientProps } from "./types"
import { useQueueDialogs } from "./use-queue-dialogs"

interface QueueEmptyState {
  title: string
  description: string
  tone: "success" | "warning" | "neutral"
  actionHref?: string
  actionLabel?: string
  /**
   * Optional one-line stat summary rendered inside the calm "All caught up."
   * card when the queue is genuinely empty (success tone, no filters narrowing
   * the view). Composed in `buildQueueEmptyState` from `recentlyCompleted`.
   */
  summary?: string | null
}

interface LazyIntakeReviewPanelProps {
  intakeId: string
  onActionComplete?: (options?: { advance?: boolean }) => void
  onNextCase?: () => void
  onPrevCase?: () => void
  caseIndex?: number
  totalCases?: number
  profileMode?: "doctor" | "admin"
  inline?: boolean
  previewIntake?: IntakeWithPatient
}

function IntakeReviewPanelLoading() {
  const pulse = "rounded-md bg-[#F1EFEA]/80 motion-safe:animate-pulse dark:bg-white/10"

  return (
    <div
      className="h-full min-h-0 overflow-y-auto p-5 motion-safe:animate-[review-pane-in_300ms_cubic-bezier(0.16,1,0.3,1)]"
      aria-busy="true"
      aria-label="Loading case review"
      data-testid="intake-review-loading"
    >
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className={cn(pulse, "h-7 w-56")} />
            <div className={cn(pulse, "h-4 w-28 rounded-full")} />
          </div>
          <div className="flex gap-2">
            <div className={cn(pulse, "h-8 w-24 rounded-lg")} />
            <div className={cn(pulse, "h-8 w-20 rounded-lg")} />
            <div className={cn(pulse, "h-8 w-24 rounded-lg")} />
          </div>
        </div>
        <div className="rounded-xl border border-border/55 bg-muted/20 p-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className={cn(pulse, "h-5 rounded-md")} />
            <div className={cn(pulse, "h-5 rounded-md")} />
            <div className={cn(pulse, "h-5 rounded-md")} />
            <div className={cn(pulse, "h-5 rounded-md")} />
          </div>
        </div>
        <div className="min-h-[116px] rounded-xl border border-border/50 bg-card p-4">
          <div className={cn(pulse, "h-3 w-28")} />
          <div className={cn(pulse, "mt-3 h-5 w-full max-w-[70ch]")} />
          <div className={cn(pulse, "mt-2 h-5 w-4/5")} />
        </div>
        <div className="min-h-[136px] rounded-xl border border-border/50 bg-card p-4" data-review-skeleton-reserved>
          <div className={cn(pulse, "h-3 w-32")} />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className={cn(pulse, "h-10 rounded-lg")} />
            <div className={cn(pulse, "h-10 rounded-lg")} />
            <div className={cn(pulse, "h-10 rounded-lg")} />
            <div className={cn(pulse, "h-10 rounded-lg")} />
          </div>
        </div>
        <div className="min-h-[154px] rounded-xl border border-border/50 bg-card p-4" data-review-skeleton-reserved>
          <div className={cn(pulse, "h-3 w-24")} />
          <div className={cn(pulse, "mt-3 h-4 w-full")} />
          <div className={cn(pulse, "mt-2 h-4 w-11/12")} />
          <div className={cn(pulse, "mt-2 h-4 w-10/12")} />
          <div className={cn(pulse, "mt-4 h-8 w-44 rounded-lg")} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className={cn(pulse, "h-20 rounded-lg")} />
          <div className={cn(pulse, "h-20 rounded-lg")} />
          <div className={cn(pulse, "h-20 rounded-lg")} />
          <div className={cn(pulse, "h-20 rounded-lg")} />
        </div>
        <div className="mt-auto rounded-xl border-t border-border bg-background/80 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className={cn(pulse, "h-5 w-52")} />
            <div className={cn(pulse, "h-8 w-44 rounded-lg")} />
          </div>
        </div>
      </div>
    </div>
  )
}

const loadIntakeReviewPanel = () =>
  import("@/components/doctor/intake-review-panel").then((mod) => mod.IntakeReviewPanel)

const IntakeReviewPanel = dynamic<LazyIntakeReviewPanelProps>(loadIntakeReviewPanel, {
  loading: () => <IntakeReviewPanelLoading />,
})

/**
 * Compose the calm "All caught up." stat line from data already on hand.
 * Returns null when there's nothing meaningful to show (no reviews yet today
 * and no recent completions) so the caller can fall back to a single-line
 * "Today: 0 reviewed" message.
 */
function buildCaughtUpSummary({
  recentlyCompleted,
  now,
}: {
  recentlyCompleted: IntakeWithPatient[]
  now: Date
}): string {
  // Reviewed today = today's reviewed_at OR completed_at, AEST-naive (uses
  // local TZ which on Vercel/Node is UTC; "today" here is whatever bucket the
  // server thinks it is. We're displaying the count, not gating clinical work.
  const todayKey = now.toISOString().slice(0, 10)
  const reviewedToday = recentlyCompleted.filter((r) => {
    const stamp = r.reviewed_at ?? r.completed_at ?? null
    return typeof stamp === "string" && stamp.slice(0, 10) === todayKey
  }).length

  const lastCleared = recentlyCompleted
    .map((r) => r.reviewed_at ?? r.completed_at ?? null)
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .sort()
    .pop() ?? null

  const parts: string[] = [`Today: ${reviewedToday} reviewed`]
  if (lastCleared) {
    const relative = formatRelativeTime(lastCleared, now)
    if (relative) parts.push(`last cleared ${relative}`)
  }
  return parts.join(" · ")
}

function buildQueueEmptyState({
  doctorAvailable,
  totalCount,
  statusFilter,
  searchQuery,
  baseHref,
  recentlyCompleted,
  now,
}: {
  doctorAvailable: boolean
  totalCount: number
  statusFilter: QueueStatusFilter
  searchQuery: string
  baseHref: string
  recentlyCompleted: IntakeWithPatient[]
  now: Date
}): QueueEmptyState {
  if (!doctorAvailable && totalCount === 0) {
    return {
      title: "Availability is paused",
      description: "Your queue can look empty while review availability is off. Turn availability back on before relying on this view.",
      tone: "warning",
      actionHref: STAFF_IDENTITY_HREF,
      actionLabel: "Open availability",
    }
  }

  if (searchQuery.trim() || statusFilter !== "all") {
    if (statusFilter === "scripts" && !searchQuery.trim()) {
      return {
        title: "No scripts to write",
        description: "No scripts waiting right now.",
        tone: "neutral",
        actionHref: baseHref,
        actionLabel: "Open full queue",
      }
    }

    if (statusFilter === "pending_info" && !searchQuery.trim()) {
      return {
        title: "No patient replies",
        description: "No patient replies waiting right now.",
        tone: "neutral",
        actionHref: baseHref,
        actionLabel: "Open full queue",
      }
    }

    return {
      title: "No matches for this filter",
      description: "Cases may still exist in another status or outside the current search. Clear filters to see the whole queue.",
      tone: "neutral",
      actionHref: baseHref,
      actionLabel: "Clear filters",
    }
  }

  return {
    title: "No review cases right now",
    description: "Paid clinical work, pending replies, and scripts will appear here automatically.",
    tone: "success",
    summary: buildCaughtUpSummary({ recentlyCompleted, now }),
  }
}

function QueueIdlePanel({
  queueSize,
  reviewedToday,
  medianDecisionMinutes,
  oldestWaitingMinutes,
  formToInboxStats,
  filteredCount,
  doctorAvailable,
  queueDegraded,
  nextIntakes,
}: {
  queueSize: number
  reviewedToday: number
  medianDecisionMinutes: number | null
  oldestWaitingMinutes: number | null
  formToInboxStats: QueueClientProps["formToInboxStats"]
  filteredCount: number
  doctorAvailable: boolean
  queueDegraded: boolean
  nextIntakes?: IntakeWithPatient[]
}) {
  const nextIntake = nextIntakes?.[0] ?? null
  const hasQueueTiming = formToInboxStats != null || medianDecisionMinutes != null || oldestWaitingMinutes != null
  const nextAction = queueDegraded
    ? "Refresh before clinical action."
    : !doctorAvailable
      ? "Availability is paused."
      : filteredCount > 0
        ? "Open a case from the queue."
        : "No cases match this filter."
  const primaryMetricLabel = reviewedToday > 0 ? "Reviews today" : "Today's pace"
  const primaryMetricValue = String(reviewedToday)
  const primaryMetricState = reviewedToday > 0
    ? "Cases finished today."
    : queueSize > 0
      ? "No cases finished yet. First one's queued."
      : "No cases finished yet."
  const targetUsedPercent = typeof oldestWaitingMinutes === "number" && oldestWaitingMinutes >= 0
    ? Math.round(Math.min(oldestWaitingMinutes / QUEUE_WAIT_TARGET_MINUTES, 1) * 100)
    : null
  const secondaryMetric = queueSize > 0 && targetUsedPercent != null
    ? {
        label: "Time used",
        value: `${targetUsedPercent}%`,
        detail: `You're ${targetUsedPercent}% into the 2h target.`,
      }
    : formToInboxStats
    ? {
        label: "Form to inbox",
        value: formatMinutes(formToInboxStats.medianMinutes),
        detail: "Real med-cert median today.",
      }
    : medianDecisionMinutes != null
      ? {
          label: "Median decision",
          value: formatMinutes(medianDecisionMinutes),
          detail: "Completed cases today.",
        }
      : {
          label: "Queue status",
          value: queueSize > 0 ? String(queueSize) : "Clear",
          detail: queueSize > 0 ? "Visible clinical cases." : "No visible wait pressure.",
        }
  const primaryMetricDetail = formToInboxStats
    ? "Time from patient form to inbox today."
    : hasQueueTiming
      ? "Queue pressure shown above."
      : queueSize > 0
        ? `${queueSize} visible case${queueSize === 1 ? "" : "s"}.`
        : "Finished clinical decisions."
  const nextPatientName = nextIntake?.patient.full_name?.trim() || null
  const nextService = nextIntake?.service
  const nextServiceLabel = nextService
    ? nextService.short_name || nextService.name || formatServiceType(nextService.type || "")
    : null
  const nextWaitLabel = nextIntake ? calculateLiveWaitTime(getQueueEnteredAt(nextIntake)) : null
  const nextCaseLabel = nextIntake
    ? [
        nextPatientName || "Case",
        nextServiceLabel,
        nextWaitLabel ? `waiting ${nextWaitLabel}` : null,
      ].filter(Boolean).join(" · ")
    : filteredCount > 0
      ? "Select the oldest case."
      : "Nothing to review."
  const showNextUp = filteredCount > 0

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFEFB_100%)] dark:bg-card motion-safe:animate-[fade-in_180ms_ease-out]">
      <div className="border-b border-primary/10 bg-primary/[0.025] px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-lg bg-card/65 px-3 py-2 ring-1 ring-border/35">
            <p className="text-xs font-semibold text-foreground">
              {primaryMetricLabel}
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-foreground tabular-nums">
              {primaryMetricValue}
            </p>
            <p className="mt-1 text-[11px] font-medium leading-snug text-slate-500 dark:text-muted-foreground">
              {primaryMetricState}
            </p>
          </div>
          <div className="min-w-0 rounded-lg bg-card/65 px-3 py-2 ring-1 ring-border/35">
            <p className="text-xs font-semibold text-foreground">
              {secondaryMetric.label}
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-foreground tabular-nums">
              {secondaryMetric.value}
            </p>
            <p className="mt-1 text-[11px] font-medium leading-snug text-slate-500 dark:text-muted-foreground">
              {secondaryMetric.detail}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs font-medium text-slate-500 dark:text-muted-foreground">
          {primaryMetricDetail}
        </p>
      </div>

      {showNextUp ? (
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">Next case</p>
              <p className="mt-1 text-base font-semibold leading-snug text-foreground">
                {nextCaseLabel}
              </p>
            </div>
            {nextAction ? (
              <p className="max-w-[180px] shrink-0 text-right text-[11px] font-medium leading-snug text-slate-500 dark:text-muted-foreground">
                {nextAction}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function QueueClient({
  intakes: initialIntakes,
  doctorId,
  identityComplete = true,
  queueDegraded = false,
  pagination,
  aiApprovedIntakes = [],
  recentlyCompleted = [],
  formToInboxStats = null,
  todayEarnings,
  initialStatusFilter = "all",
  hasExplicitStatusFilter = false,
  baseHref = STAFF_DASHBOARD_HREF,
  doctorAvailable = true,
  compactShell = false,
}: QueueClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { openPanel, activePanel } = usePanel()
  const panelOpenRef = useRef(Boolean(activePanel))
  // `/dashboard` two-pane is desktop-only. On mobile we fall back to the
  // slide-over (`openPanel`) so the operator isn't asked to scroll past
  // the queue to reach the inline review pane.
  const isDesktop = useIsDesktop()
  const explicitStatusFilterRef = useRef(hasExplicitStatusFilter)
  const queueRegionRef = useRef<HTMLDivElement>(null)

  const openIntakeId = activePanel?.id.startsWith("intake-review-")
    ? activePanel.id.replace("intake-review-", "")
    : null
  const [intakes, setIntakes] = useState(initialIntakes)
  // Keep a live ref to filtered intakes for use in panel callbacks
  const filteredIntakesRef = useRef<IntakeWithPatient[]>([])
  const intakesRef = useRef<IntakeWithPatient[]>(initialIntakes)

  // Sync server data into local state after router.refresh() soft-refreshes the page.
  // useState(initialIntakes) only reads the prop on mount, so without this effect
  // the 60s background refresh never updates what's shown in the queue.
  useEffect(() => {
    setIntakes(initialIntakes)
  }, [initialIntakes])

  useEffect(() => {
    intakesRef.current = intakes
  }, [intakes])

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [lastOpenedIntakeId, setLastOpenedIntakeId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    try {
      return sessionStorage.getItem(LAST_OPENED_DOCTOR_CASE_KEY)
    } catch {
      return null
    }
  })
  const rememberOpenedCase = useCallback((intakeId: string) => {
    setLastOpenedIntakeId(intakeId)
  }, [])

  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 200)
  const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>(initialStatusFilter)
  const [priorityModeActive, setPriorityModeActive] = useState(false)
  const [isApprovePending, startTransition] = useTransition()
  const [isQueueRefreshPending, startQueueRefreshTransition] = useTransition()
  const lastQueueRefreshAtRef = useRef(0)
  const dialogs = useQueueDialogs({ intakes, setIntakes })
  const [clockNow, setClockNow] = useState<Date | null>(null)

  useEffect(() => {
    panelOpenRef.current = Boolean(activePanel)
  }, [activePanel])

  useEffect(() => {
    const nextStatus = parseQueueStatusFilter(searchParams.get("status"))
    explicitStatusFilterRef.current = searchParams.has("status") && nextStatus !== "all"
    setStatusFilter(nextStatus)
  }, [searchParams])

  // Warm the split-pane review module after first paint. Hover no longer
  // prefetches clinical data, so this keeps the first explicit open feeling
  // immediate without touching PHI-heavy API payloads.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadIntakeReviewPanel()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [])

  const refreshQueue = useCallback((force = false) => {
    if (!force && panelOpenRef.current) return
    const now = Date.now()
    if (!force && now - lastQueueRefreshAtRef.current < 5000) return
    lastQueueRefreshAtRef.current = now
    startQueueRefreshTransition(() => {
      router.refresh()
    })
  }, [router])

  useEffect(() => {
    lastQueueRefreshAtRef.current = Date.now()
  }, [])

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DOCTOR_QUEUE_FOCUS_AFTER_ACTION_KEY)) {
        sessionStorage.removeItem(DOCTOR_QUEUE_FOCUS_AFTER_ACTION_KEY)
        requestAnimationFrame(() => queueRegionRef.current?.focus())
      }
    } catch {
      // Focus restore is a convenience only; queue rendering should never depend on storage.
    }
  }, [])

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") refreshQueue()
    }

    const interval = window.setInterval(refreshIfVisible, 45000)
    window.addEventListener("focus", refreshIfVisible)
    document.addEventListener("visibilitychange", refreshIfVisible)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", refreshIfVisible)
      document.removeEventListener("visibilitychange", refreshIfVisible)
    }
  }, [refreshQueue])

  const handleStatusFilterChange = useCallback((value: QueueStatusFilter) => {
    setStatusFilter(value)
    explicitStatusFilterRef.current = value !== "all"

    const params = new URLSearchParams(window.location.search)
    if (value === "all") {
      params.delete("status")
    } else {
      params.set("status", value)
    }
    params.delete("page")

    const query = params.toString()
    const hash = window.location.hash || ""
    window.history.replaceState(window.history.state, "", `${query ? `${baseHref}?${query}` : baseHref}${hash}`)
  }, [baseHref])

  // Auto-activate priority mode when SLA-breached cases exist
  useEffect(() => {
    const now = Date.now()
    const hasSlaBreaches = intakes.some(
      (r) => r.sla_deadline && new Date(r.sla_deadline).getTime() < now && ["paid", "in_review"].includes(r.status)
    )
    if (hasSlaBreaches && !priorityModeActive && !explicitStatusFilterRef.current) {
      setPriorityModeActive(true)
      setStatusFilter("review")
    } else if (!hasSlaBreaches && priorityModeActive) {
      setPriorityModeActive(false)
    }
  // Only re-run when intakes list changes — not on every filter state change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakes])

  // Tick every second only while a visible queue case is still in its first
  // minute; after that the labels are minute-granular to avoid dense redraws.
  useEffect(() => {
    if (intakes.length === 0) {
      setClockNow(null)
      return
    }
    setClockNow(new Date())
    const hasFreshQueueCase = intakes.some((intake) => {
      const enteredAt = new Date(getQueueEnteredAt(intake)).getTime()
      if (!Number.isFinite(enteredAt)) return false
      const ageMs = Date.now() - enteredAt
      return ageMs >= 0 && ageMs < 60_000
    })
    const freshQueueTickMs = hasFreshQueueCase ? 1000 : 60000
    const tickInterval = window.setInterval(() => {
      setClockNow(new Date())
    }, freshQueueTickMs)
    return () => window.clearInterval(tickInterval)
  }, [intakes])

  const calculateStableWaitTime = useCallback((createdAt: string) => {
    if (!clockNow) return "..."
    return calculateLiveWaitTime(createdAt, clockNow)
  }, [clockNow])

  const getStableWaitTimeSeverity = useCallback((createdAt: string, slaDeadline?: string | null) => {
    if (!clockNow) return "normal"
    return getWaitTimeSeverity(createdAt, slaDeadline, clockNow)
  }, [clockNow])

  // Track row IDs that just arrived via realtime so the queue can flash a
  // calm border on the row for ~1.5s (decays via `transition-colors`).
  // Honours `prefers-reduced-motion` by skipping the timer entirely; the
  // row still renders but without the colour state change.
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<string>>(() => new Set())

  // Real-time subscription with exponential backoff reconnection
  const handleInsert = useCallback((newRow: IntakeWithPatient) => {
    setIntakes((prev) => {
      if (prev.some((r) => r.id === newRow.id)) return prev
      return [newRow, ...prev]
    })

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    setNewlyArrivedIds((prev) => {
      const next = new Set(prev)
      next.add(newRow.id)
      return next
    })
    window.setTimeout(() => {
      setNewlyArrivedIds((prev) => {
        if (!prev.has(newRow.id)) return prev
        const next = new Set(prev)
        next.delete(newRow.id)
        return next
      })
    }, 1500)
  }, [])

  const handleUpdate = useCallback((updated: Partial<IntakeWithPatient> & { id: string }) => {
    setIntakes((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
  }, [])

  const handleDelete = useCallback((id: string) => {
    setIntakes((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const { isStale, isReconnecting } = useQueueRealtime({
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
  })

  // Shared action-complete handler. Removes the case from the live queue,
  // refreshes data, and advances selection / opens the next case.
  // Inline mode (`/dashboard` two-pane) and slide-over mode share this.
  const handleIntakeActionComplete = useCallback(
    (intakeId: string, options?: { advance?: boolean }) => {
      const { nextIntake } = removeCompletedIntakeFromQueue(filteredIntakesRef.current, intakeId)
      setIntakes((prev) => removeCompletedIntakeFromQueue(prev, intakeId).remaining)
      refreshQueue(true)
      if (options?.advance !== false && nextIntake) {
        rememberOpenedCase(nextIntake.id)
        setExpandedId(nextIntake.id)
        toast.success("Case done. Opening next.")
      } else if (options?.advance !== false) {
        setExpandedId(null)
        toast.success("Case done. Queue clear.")
      }
    },
    [refreshQueue, rememberOpenedCase],
  )

  // Click / Enter handler. In compactShell mode this is a NO-SHEET path
  // on desktop: it just sets selection (`expandedId`), which drives the
  // inline right pane. On mobile (`!isDesktop`) compactShell falls back
  // to the slide-over so the detail doesn't stack below the queue. In
  // legacy non-compact mode it always opens the slide-over.
  const openReviewPanel = useCallback((intakeId: string) => {
    setExpandedId(intakeId)

    if (compactShell && isDesktop) {
      // Desktop two-pane mode. Detail renders inline; no slide-over.
      panelOpenRef.current = false
      return
    }

    // Legacy slide-over mode (admin patient drawer, doctor intake detail
    // page entry points). Kept identical behaviour.
    panelOpenRef.current = true
    const getAdjacentId = (direction: "next" | "prev"): string | null => {
      const list = filteredIntakesRef.current
      const idx = list.findIndex((r) => r.id === intakeId)
      if (idx === -1) return null
      return direction === "next" ? (list[idx + 1]?.id ?? null) : (list[idx - 1]?.id ?? null)
    }

    const list = filteredIntakesRef.current
    const caseIndex = list.findIndex((r) => r.id === intakeId)
    const previewIntake = list.find((r) => r.id === intakeId)

    openPanel({
      id: `intake-review-${intakeId}`,
      type: "sheet",
      component: (
        <IntakeReviewPanel
          intakeId={intakeId}
          previewIntake={previewIntake}
          caseIndex={caseIndex >= 0 ? caseIndex : undefined}
          totalCases={list.length > 0 ? list.length : undefined}
          onActionComplete={(options) => {
            handleIntakeActionComplete(intakeId, options)
            const { nextIntake } = removeCompletedIntakeFromQueue(filteredIntakesRef.current, intakeId)
            if (options?.advance !== false && nextIntake) {
              setTimeout(() => openReviewPanel(nextIntake.id), 90)
            }
          }}
          onNextCase={() => {
            const nextId = getAdjacentId("next")
            if (nextId) openReviewPanel(nextId)
          }}
          onPrevCase={() => {
            const prevId = getAdjacentId("prev")
            if (prevId) openReviewPanel(prevId)
          }}
        />
      ),
    })
  }, [openPanel, compactShell, isDesktop, handleIntakeActionComplete])

  const primeReviewPanelCode = useCallback(() => {
    void loadIntakeReviewPanel()
  }, [])

  const handleApprove = useCallback(async (intakeId: string, serviceType?: string | null) => {
    if (serviceType === SERVICE_TYPES.MED_CERTS) {
      // Med certs go through the review panel because the doctor confirms
      // via the certificate preview dialog. No optimistic path here.
      openReviewPanel(intakeId)
      return
    }
    // Optimistic remove: yank the row from the queue the moment the
    // doctor clicks Approve, fire the server action in the background,
    // and roll back if it fails. Saves 200-800ms of perceived latency on
    // every approval. The Undo toast pattern stays the same — the
    // success path doesn't need to re-remove the row because we already
    // removed it.
    const removedIntake = intakes.find((r) => r.id === intakeId)
    if (!removedIntake) return
    const removedIndex = intakes.findIndex((r) => r.id === intakeId)
    setIntakes((prev) => prev.filter((r) => r.id !== intakeId))

    startTransition(async () => {
      const newStatus: IntakeStatus = serviceType === SERVICE_TYPES.COMMON_SCRIPTS || serviceType === SERVICE_TYPES.REPEAT_RX
        ? "awaiting_script"
        : "approved"
      const result = await updateStatusAction(intakeId, newStatus)
      if (result.success) {
        refreshQueue(true)
        if (serviceType === SERVICE_TYPES.COMMON_SCRIPTS || serviceType === SERVICE_TYPES.REPEAT_RX) {
          openReviewPanel(intakeId)
        } else {
          toast.success("Request approved", {
            action: {
              label: "Undo",
              onClick: async () => {
                const revert = await updateStatusAction(intakeId, "paid")
                if (revert.success) {
                  setIntakes((prev) => {
                    // Re-insert at the original position when possible
                    // so the queue ordering after Undo matches what the
                    // doctor saw before clicking Approve.
                    const safeIndex = Math.min(removedIndex, prev.length)
                    const next = prev.slice()
                    next.splice(Math.max(0, safeIndex), 0, removedIntake)
                    return next
                  })
                  refreshQueue(true)
                  toast.success("Approval undone")
                } else {
                  toast.error("Couldn't undo approval")
                }
              },
            },
            duration: 5000,
          })
        }
      } else if (result.code === "INSUFFICIENT_CLINICAL_NOTES") {
        // Optimistic rollback. Restore the row at its original position.
        setIntakes((prev) => {
          const safeIndex = Math.min(removedIndex, prev.length)
          const next = prev.slice()
          next.splice(Math.max(0, safeIndex), 0, removedIntake)
          return next
        })
        toast.error("Use the draft note or add a brief clinical note before approving.", {
          action: { label: "Open review", onClick: () => openReviewPanel(intakeId) },
          duration: 6000,
        })
      } else {
        // Generic server failure — same rollback path.
        setIntakes((prev) => {
          const safeIndex = Math.min(removedIndex, prev.length)
          const next = prev.slice()
          next.splice(Math.max(0, safeIndex), 0, removedIntake)
          return next
        })
        toast.error(result.error || "Failed to approve")
      }
    })
  }, [openReviewPanel, startTransition, intakes, refreshQueue])


  const hasRedFlags = useCallback((intake: IntakeWithPatient): boolean => hasReviewNextRisk(intake), [])

  // Sort: risk -> scripts waiting -> priority -> oldest paid/requested -> pending-info age.
  const sortedIntakes = useMemo(() => {
    return sortForReviewNext(intakes)
  }, [intakes])

  // Memoized filter. Previously this chained `.filter` lived bare in the
  // render body, parsing the search query and walking `rawTokens` for every
  // row on every render — including 30s clock ticks, hover prefetches, and
  // every `expandedId` change. The query parsing now happens ONCE per
  // search-or-filter change, and the row callback only does cheap
  // attribute checks. Saves the dominant slice of jank on long queues.
  const filteredIntakes = useMemo(() => {
    const trimmed = debouncedSearch.trim().toLowerCase()
    const rawTokens = trimmed ? (trimmed.match(/\w+:\S+/g) ?? []) : []
    const plainQuery = trimmed ? trimmed.replace(/\w+:\S+/g, "").trim() : ""
    const plainQueryStripped = plainQuery.replace(/\s+/g, "")
    return sortedIntakes.filter((r) => {
      // Status filter
      if (statusFilter === "review" && !["paid", "in_review"].includes(r.status)) return false
      if (statusFilter === "pending_info" && r.status !== "pending_info") return false
      if (statusFilter === "scripts" && r.status !== "awaiting_script") return false

      if (!trimmed) return true
      const service = r.service as { name?: string; type?: string } | undefined

      for (const token of rawTokens) {
        const [key, val] = token.split(":") as [string, string]
        if (key === "risk" || key === "risk_tier") {
          if ((r.risk_tier ?? "low") !== val && !(val === "high" && hasRedFlags(r))) return false
        } else if (key === "type") {
          if (!service?.type?.toLowerCase().includes(val)) return false
        } else if (key === "status") {
          if (r.status !== val) return false
        } else if (key === "priority") {
          if (val === "true" && !r.is_priority) return false
          if (val === "false" && r.is_priority) return false
        } else if (key === "flag" || key === "flags") {
          if (!hasRedFlags(r)) return false
        }
      }

      if (!plainQuery) return true
      return (
        r.patient.full_name.toLowerCase().includes(plainQuery) ||
        r.reference_number?.toLowerCase().includes(plainQuery) ||
        r.patient.medicare_number?.includes(plainQuery) ||
        r.patient.email?.toLowerCase().includes(plainQuery) ||
        r.patient.phone?.replace(/\s+/g, "").includes(plainQueryStripped) ||
        formatServiceType(service?.type || "").toLowerCase().includes(plainQuery)
      )
    })
  }, [sortedIntakes, debouncedSearch, hasRedFlags, statusFilter])

  // Keep the ref in sync — used by panel navigation callbacks that need
  // the latest filtered list without re-rendering. Effect rather than a
  // bare assignment so React Strict Mode + concurrent rendering can't
  // observe a torn state.
  useEffect(() => {
    filteredIntakesRef.current = filteredIntakes
  }, [filteredIntakes])

  const oldestWaitingMinutes = useMemo(() => {
    if (filteredIntakes.length === 0) return null
    const now = (clockNow ?? new Date()).getTime()
    const oldest = filteredIntakes.reduce<number | null>((current, intake) => {
      const enteredAt = new Date(getQueueEnteredAt(intake)).getTime()
      if (!Number.isFinite(enteredAt)) return current
      return current === null ? enteredAt : Math.min(current, enteredAt)
    }, null)
    if (oldest === null) return null
    return Math.max(0, Math.floor((now - oldest) / 60000))
  }, [clockNow, filteredIntakes])

  const queueEmptyState = useMemo(() => buildQueueEmptyState({
    doctorAvailable,
    totalCount: intakes.length,
    statusFilter,
    searchQuery: debouncedSearch,
    baseHref,
    recentlyCompleted,
    now: new Date(),
  }), [
    baseHref,
    debouncedSearch,
    doctorAvailable,
    intakes.length,
    statusFilter,
    recentlyCompleted,
  ])

  const handleReviewNext = useCallback(() => {
    const next = filteredIntakesRef.current[0]
    if (!next) return
    rememberOpenedCase(next.id)
    openReviewPanel(next.id)
  }, [openReviewPanel, rememberOpenedCase])

  const handleJumpToOldestWait = useCallback(() => {
    const oldest = intakesRef.current.reduce<IntakeWithPatient | null>((current, intake) => {
      const enteredAt = new Date(getQueueEnteredAt(intake)).getTime()
      if (!Number.isFinite(enteredAt)) return current
      if (!current) return intake
      const currentEnteredAt = new Date(getQueueEnteredAt(current)).getTime()
      return enteredAt < currentEnteredAt ? intake : current
    }, null)
    if (!oldest) return

    setSearchQuery("")
    if (statusFilter !== "all") handleStatusFilterChange("all")
    rememberOpenedCase(oldest.id)
    openReviewPanel(oldest.id)
  }, [handleStatusFilterChange, openReviewPanel, rememberOpenedCase, statusFilter])

  useEffect(() => {
    window.addEventListener("operator-jump-to-oldest-wait", handleJumpToOldestWait)
    return () => window.removeEventListener("operator-jump-to-oldest-wait", handleJumpToOldestWait)
  }, [handleJumpToOldestWait])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      // Preserve global browser/app chords such as Cmd/Ctrl+K for the staff palette.
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const currentIndex = expandedId ? filteredIntakes.findIndex((r) => r.id === expandedId) : -1

      switch (e.key) {
        case "j": // Next case (vim-style)
        case "ArrowDown": // Same as j, for discoverability
          e.preventDefault()
          if (currentIndex < filteredIntakes.length - 1) {
            setExpandedId(filteredIntakes[currentIndex + 1].id)
          } else if (filteredIntakes.length > 0 && currentIndex === -1) {
            setExpandedId(filteredIntakes[0].id)
          }
          break
        case "k": // Previous case (vim-style)
        case "ArrowUp": // Same as k, for discoverability
          e.preventDefault()
          if (currentIndex > 0) {
            setExpandedId(filteredIntakes[currentIndex - 1].id)
          }
          break
        case "Enter": // Open review panel
          if (expandedId) {
            e.preventDefault()
            openReviewPanel(expandedId)
          }
          break
        case "Escape": // Collapse
          if (expandedId) {
            e.preventDefault()
            setExpandedId(null)
          }
          break
        case "a": // Approve (or open review for med certs)
          if (expandedId) {
            e.preventDefault()
            const intake = filteredIntakes.find((r) => r.id === expandedId)
            if (intake) {
              const service = intake.service as { type?: string } | undefined
              handleApprove(intake.id, service?.type)
            }
          }
          break
        case "d": // Open decline dialog
          if (expandedId) {
            e.preventDefault()
            dialogs.setDeclineDialog(expandedId)
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [expandedId, filteredIntakes, openReviewPanel, handleApprove, dialogs])

  // Auto-scroll the keyboard-focused row into view. Uses the row's
  // `data-testid` attribute (set by QueueTable) to locate the element
  // without prop-drilling refs. `nearest` block keeps the row in view
  // without snapping the page.
  //
  // `behavior: "auto"` not "smooth": when the operator holds j or k the
  // smooth animations queue and lag behind the keypresses, making the
  // cursor feel sluggish. Instant snap matches Linear / Slack / Gmail
  // keyboard nav.
  useEffect(() => {
    if (!expandedId) return
    const row = queueRegionRef.current?.querySelector<HTMLElement>(
      `[data-testid="queue-row-${expandedId}"]`,
    )
    row?.scrollIntoView({ block: "nearest", behavior: "auto" })
  }, [expandedId])

  useEffect(() => {
    if (!compactShell || !isDesktop) return

    const root = document.documentElement
    if (expandedId) {
      root.dataset.operatorReviewingCase = "true"
    } else {
      delete root.dataset.operatorReviewingCase
    }
    window.dispatchEvent(new CustomEvent("operator-reviewing-case-change"))

    return () => {
      delete root.dataset.operatorReviewingCase
      window.dispatchEvent(new CustomEvent("operator-reviewing-case-change"))
    }
  }, [compactShell, expandedId, isDesktop])

  const reviewedToday = recentlyCompleted.length
  const queueSize = intakes.length
  const medianDecisionMinutes = useMemo(() => {
    const durations = recentlyCompleted.flatMap((intake) => {
      const start = intake.paid_at ? new Date(intake.paid_at).getTime() : NaN
      const endValue = intake.approved_at ?? intake.declined_at ?? intake.reviewed_at ?? intake.completed_at
      const end = endValue ? new Date(endValue).getTime() : NaN
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return []
      return [Math.round((end - start) / 60000)]
    }).sort((a, b) => a - b)
    if (durations.length === 0) return null
    const middle = Math.floor(durations.length / 2)
    return durations.length % 2 === 1
      ? durations[middle]!
      : Math.round((durations[middle - 1]! + durations[middle]!) / 2)
  }, [recentlyCompleted])
  // Memoised so the clock tick / search input / hover doesn't recompute
  // this on every render. Only depends on the (rarely-changing) recent
  // completions prop.
  const approvalRate = useMemo(() => {
    if (recentlyCompleted.length === 0) return null
    const approved = recentlyCompleted.filter(
      (r) => r.status === "approved" || r.status === "completed",
    ).length
    return Math.round((approved / recentlyCompleted.length) * 100)
  }, [recentlyCompleted])

  return (
    <div
      ref={queueRegionRef}
      role="region"
      tabIndex={-1}
      aria-label="Doctor request queue"
      className={cn(
        compactShell ? "flex h-full min-h-0 flex-col gap-3" : "space-y-6",
        "focus:outline-none",
      )}
    >
      {/* Daily stats strip */}
      {!compactShell && (reviewedToday > 0 || queueSize > 0 || todayEarnings) && (
        <div
          className="flex flex-wrap items-center gap-x-5 gap-y-1 px-0.5 text-xs text-muted-foreground"
          aria-live="polite"
          aria-atomic="false"
        >
          {reviewedToday > 0 && (
            <span>
              <span className="font-medium text-foreground tabular-nums">{reviewedToday}</span>{" "}reviewed today
              {approvalRate !== null && (
                <span className="ml-1 text-muted-foreground">({approvalRate}%)</span>
              )}
            </span>
          )}
          {queueSize > 0 && (
            <span aria-label={`${queueSize} intake${queueSize === 1 ? "" : "s"} in queue`}>
              <span className="font-medium text-foreground tabular-nums">{queueSize}</span>{" "}in queue
            </span>
          )}
          {todayEarnings != null && todayEarnings > 0 && (
            <span>
              <span className="font-medium text-success tabular-nums">${(todayEarnings / 100).toFixed(2)}</span>{" "}today
            </span>
          )}
        </div>
      )}

      {/* Priority inbox banner */}
      {priorityModeActive && (
        <div
          role="alert"
          className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
        >
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="flex-1 text-sm font-medium text-destructive">
            SLA breach — showing priority cases first
          </p>
          <button
            className="text-xs text-destructive/70 hover:text-destructive underline underline-offset-2 shrink-0"
            onClick={() => { setPriorityModeActive(false); setStatusFilter("all") }}
          >
            Show all
          </button>
        </div>
      )}

      {/* Stale Data Warning */}
      {queueDegraded && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-warning-border/60 bg-warning-light p-3"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-warning">
              Queue data may be incomplete
            </p>
            <p className="text-xs text-warning/80">
              Refresh before making clinical decisions. If this remains visible, check ops logs.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshQueue(true)}
            disabled={isQueueRefreshPending}
            className="h-7 shrink-0 text-xs"
          >
            <RefreshCw className={cn("mr-1 h-3 w-3", isQueueRefreshPending && "animate-spin")} />
            Refresh
          </Button>
        </div>
      )}

      {isStale && (
        <div
          role="status"
          className="flex items-center justify-end"
        >
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-warning-border/60 bg-warning-light px-3 py-1.5 text-xs font-medium text-warning">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">
              {isReconnecting ? "Reconnecting to live updates..." : "Showing older queue data. Refresh to see new arrivals."}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshQueue(true)}
              disabled={isQueueRefreshPending}
              className="h-6 shrink-0 px-1.5 text-xs text-warning hover:bg-warning/10 hover:text-warning"
            >
              <RefreshCw className={cn("mr-1 h-3 w-3", isQueueRefreshPending && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      )}

      <div
        className={cn(
          compactShell
            ? "shrink-0 rounded-xl border border-border/50 bg-card px-3 py-3"
            : "-mx-4 bg-background px-4 pb-3 pt-1 sm:-mx-6 sm:px-6 lg:sticky lg:top-0 lg:z-10 lg:-mx-8 lg:px-8 lg:shadow-[inset_0_-1px_0_0_hsl(var(--border)/0.4)]",
        )}
      >
        <QueueFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={() => refreshQueue(true)}
          onOpenSingleMatch={filteredIntakes.length === 1 ? handleReviewNext : undefined}
          onOpenOldest={handleJumpToOldestWait}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          intakes={intakes}
          filteredCount={filteredIntakes.length}
          isStale={isStale}
          isReconnecting={isReconnecting}
          isRefreshing={isQueueRefreshPending}
          compactShell={compactShell}
          oldestWaitingMinutes={oldestWaitingMinutes}
          showOldestWaiting={!compactShell}
          formToInboxStats={formToInboxStats}
        />
      </div>

      {compactShell && isDesktop ? (
        <OperatorSplitPane
          mode={expandedId ? "reviewing" : "idle"}
          className={cn(
            "min-h-0 flex-1",
          )}
          listClassName="min-h-0"
          detailClassName="min-h-0"
          list={(
            <div
              key={`${statusFilter}:${debouncedSearch}`}
              className="flex h-full min-h-0 flex-col overflow-hidden"
            >
              <QueueTable
                filteredIntakes={filteredIntakes}
                intakes={intakes}
                expandedId={expandedId}
                openIntakeId={openIntakeId}
                doctorId={doctorId}
                lastOpenedIntakeId={lastOpenedIntakeId}
                onRememberOpenedCase={rememberOpenedCase}
                isPending={dialogs.isPending || isApprovePending}
                identityComplete={identityComplete}
                onApprove={handleApprove}
                hasRedFlags={hasRedFlags}
                calculateWaitTime={calculateStableWaitTime}
                getWaitTimeSeverity={getStableWaitTimeSeverity}
                openReviewPanel={openReviewPanel}
                onPrimeReviewPanelCode={primeReviewPanelCode}
                dialogs={dialogs}
                aiApprovedIntakes={aiApprovedIntakes}
                recentlyCompleted={recentlyCompleted}
                pagination={pagination}
                baseHref={baseHref}
                emptyState={queueEmptyState}
                compactShell={compactShell}
                searchQuery={debouncedSearch}
                newlyArrivedIds={newlyArrivedIds}
              />
            </div>
          )}
          detail={(
            expandedId ? (
              // `key={expandedId}` forces remount on selection change so
              // the lock + audit + view-duration effects re-run cleanly
              // for the new case (releases the old lock automatically).
              <div
                key={expandedId}
                className="flex h-full min-h-0 flex-col motion-safe:animate-[review-pane-in_300ms_cubic-bezier(0.16,1,0.3,1)]"
                data-review-pane-entry
              >
                <div className="min-h-0 flex-1">
                  <IntakeReviewPanel
                    inline
                    intakeId={expandedId}
                    previewIntake={filteredIntakes.find((intake) => intake.id === expandedId)}
                    onActionComplete={(options) => handleIntakeActionComplete(expandedId, options)}
                  />
                </div>
              </div>
            ) : (
              <QueueIdlePanel
                queueSize={queueSize}
                reviewedToday={reviewedToday}
                medianDecisionMinutes={medianDecisionMinutes}
                oldestWaitingMinutes={oldestWaitingMinutes}
                formToInboxStats={formToInboxStats}
                filteredCount={filteredIntakes.length}
                doctorAvailable={doctorAvailable}
                queueDegraded={queueDegraded}
                nextIntakes={filteredIntakes.slice(0, 3)}
              />
            )
          )}
        />
      ) : (
        <QueueTable
          filteredIntakes={filteredIntakes}
          intakes={intakes}
          expandedId={expandedId}
          openIntakeId={openIntakeId}
          doctorId={doctorId}
          lastOpenedIntakeId={lastOpenedIntakeId}
          onRememberOpenedCase={rememberOpenedCase}
          isPending={dialogs.isPending || isApprovePending}
          identityComplete={identityComplete}
          onApprove={handleApprove}
          hasRedFlags={hasRedFlags}
          calculateWaitTime={calculateStableWaitTime}
          getWaitTimeSeverity={getStableWaitTimeSeverity}
          openReviewPanel={openReviewPanel}
          onPrimeReviewPanelCode={primeReviewPanelCode}
          dialogs={dialogs}
          aiApprovedIntakes={aiApprovedIntakes}
          recentlyCompleted={recentlyCompleted}
          pagination={pagination}
          baseHref={baseHref}
          emptyState={queueEmptyState}
          compactShell={compactShell}
          searchQuery={debouncedSearch}
        />
      )}

    </div>
  )
}
