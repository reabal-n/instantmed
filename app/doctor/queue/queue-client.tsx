"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { OperatorSplitPane } from "@/components/operator/operator-page"
import { usePanel } from "@/components/panels/panel-provider"
import { Button } from "@/components/ui/button"
import {
  getCanonicalQueuePage,
  parseQueueStatusFilter,
  type QueueStatusFilter,
  sanitizeQueueSearchQuery,
  STAFF_DASHBOARD_HREF,
} from "@/lib/dashboard/routes"
import {
  buildQueueEmptyState,
  getQueueCompletionOutcome,
} from "@/lib/doctor/queue-empty-state"
import { DOCTOR_QUEUE_FOCUS_AFTER_ACTION_KEY, LAST_OPENED_DOCTOR_CASE_KEY } from "@/lib/doctor/queue-focus"
import { applyQueueRealtimeUpdate, removeCompletedIntakeFromQueue } from "@/lib/doctor/queue-state"
import type { QueueStatusCounts } from "@/lib/doctor/queue-utils"
import { calculateLiveWaitTime, getQueueClockTickDelayMs, getQueueEnteredAt, getQueueWaitTargetState, getWaitTimeSeverity } from "@/lib/doctor/queue-utils"
import { hasQueueRiskBadge, sortForReviewNext } from "@/lib/doctor/review-next"
import { isPrescribingConsultSubtype, SERVICE_TYPES } from "@/lib/doctor/service-types"
import { useQueueRealtime } from "@/lib/doctor/use-queue-realtime"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { isEditableOrInteractiveKeyboardTarget } from "@/lib/hooks/use-doctor-shortcuts"
import { useIsDesktop } from "@/lib/hooks/use-media-query"
import { cn } from "@/lib/utils"
import type {
  IntakeStatus,
  IntakeWithPatient,
  RecentlyCompletedIntake,
} from "@/types/db"

import { updateStatusAction } from "./actions"
import { QueueFilters } from "./queue-filters"
import { QueueTable } from "./queue-table"
import { searchDoctorQueueAction } from "./search-actions"
import type { QueueClientProps, QueueSearchState } from "./types"
import { useQueueDialogs } from "./use-queue-dialogs"

interface ActiveQueueSearchView {
  query: string
  statusFilter: QueueStatusFilter
  pagination: NonNullable<QueueClientProps["pagination"]>
  queueDegraded: boolean
  statusCounts: QueueStatusCounts | null
  globalStatusCounts: QueueStatusCounts | null
  searchMatchCount: number | null
  searchState: QueueSearchState
}

interface QueueSearchIntent {
  query: string
  statusFilter: QueueStatusFilter
  page: number
}

interface QueueRefreshOptions {
  force?: boolean
  allowWhilePanelOpen?: boolean
  bypassThrottle?: boolean
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
  reviewRevision?: string | null
}

function IntakeReviewPanelLoading() {
  const pulse = "rounded-md bg-[#F1EFEA]/80 motion-safe:animate-pulse dark:bg-white/10"

  return (
    <div
      className="h-full min-h-0 overflow-y-auto p-3 sm:p-4 motion-safe:animate-[review-pane-in_280ms_cubic-bezier(0.16,1,0.3,1)]"
      aria-busy="true"
      aria-label="Loading case review"
      data-testid="intake-review-loading"
      data-review-skeleton-matched
    >
      <div className="flex h-full w-full flex-col gap-3">
        <div className="space-y-2">
          <div className={cn(pulse, "h-7 w-56")} />
          <div className={cn(pulse, "h-4 w-28 rounded-full")} />
        </div>
        <div className="grid gap-2 rounded-xl border border-border/55 bg-muted/20 p-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={cn(pulse, "h-5")} />
          ))}
        </div>
        <div className="min-h-[136px] rounded-xl border border-border/50 bg-card p-4" data-review-skeleton-reserved>
          <div className={cn(pulse, "h-3 w-32")} />
          <div className={cn(pulse, "mt-3 h-20 rounded-lg")} />
        </div>
        <div className="min-h-[154px] rounded-xl border border-border/50 bg-card p-4" data-review-skeleton-reserved>
          <div className={cn(pulse, "h-3 w-24")} />
          <div className={cn(pulse, "mt-3 h-4 w-full")} />
          <div className={cn(pulse, "mt-2 h-4 w-10/12")} />
        </div>
        <div className="mt-auto rounded-xl border-t border-border bg-background/80 px-3 py-2">
          <div className={cn(pulse, "h-8 w-full max-w-44 rounded-lg")} />
        </div>
      </div>
    </div>
  )
}

function isQueuePrescribingConsult(serviceType?: string | null, subtype?: string | null): boolean {
  return (
    (serviceType === SERVICE_TYPES.CONSULT || serviceType === SERVICE_TYPES.CONSULTS) &&
    isPrescribingConsultSubtype(subtype)
  )
}

const loadIntakeReviewPanel = () =>
  import("@/components/doctor/intake-review-panel").then((mod) => mod.IntakeReviewPanel)

const IntakeReviewPanel = dynamic<LazyIntakeReviewPanelProps>(loadIntakeReviewPanel, {
  loading: () => <IntakeReviewPanelLoading />,
})

const ApprovedTodayList = dynamic<{
  intakes: RecentlyCompletedIntake[]
  className?: string
  historyTruncated?: boolean
}>(() => import("@/components/doctor/approved-today-list").then((mod) => mod.ApprovedTodayList), {
  loading: () => null,
})

function QueueIdlePanel({
  filteredCount,
  doctorAvailable,
  queueDegraded,
  nextIntakes,
  onOpenNext,
}: {
  filteredCount: number
  doctorAvailable: boolean
  queueDegraded: boolean
  nextIntakes?: IntakeWithPatient[]
  onOpenNext?: () => void
}) {
  const nextIntake = nextIntakes?.[0] ?? null
  const nextPatientName = nextIntake?.patient?.full_name?.trim() || "the next patient"
  const nextFirstName = nextPatientName.split(/\s+/)[0] || "patient"
  const supportCopy = queueDegraded
    ? "Refresh before clinical action."
    : !doctorAvailable
      ? "Availability is paused."
      : filteredCount > 0 && nextIntake
        ? `Open ${nextFirstName}'s request when you're ready.`
      : "No cases match this filter."
  const nextCaseLabel = filteredCount > 0
      ? "Select the next case."
      : "Nothing to review."
  const showNextUp = filteredCount > 0

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#FBF8F2_0%,#FFFEFB_100%)] dark:bg-card motion-safe:animate-[fade-in_180ms_ease-out]">
      {showNextUp ? (
        <div className="border-b border-border/45 px-5 py-3">
          <p className="text-xs font-medium leading-relaxed text-slate-500 dark:text-muted-foreground">
            {supportCopy}
          </p>
        </div>
      ) : null}
      {!showNextUp ? (
        <div className="flex flex-1 items-center px-5 py-4 text-sm font-medium text-muted-foreground">
          {nextCaseLabel}
        </div>
      ) : null}
      {showNextUp ? (
        <div className="flex flex-1 flex-col items-start gap-3 px-5 py-4">
          <p className="text-xs font-semibold text-muted-foreground">
            Next up
          </p>
          {nextIntake && onOpenNext ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-border/70 bg-background px-3 text-xs font-semibold text-foreground shadow-sm hover:bg-muted/35"
              onClick={onOpenNext}
            >
              Open {nextFirstName}'s request
            </Button>
          ) : null}
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
  recentlyCompleted = [],
  recentlyCompletedDegraded = false,
  recentlyCompletedTruncated = false,
  statusCounts = null,
  globalStatusCounts = null,
  oldestWaitingIntakeId = null,
  initialStatusFilter = "all",
  hasExplicitStatusFilter = false,
  baseHref = STAFF_DASHBOARD_HREF,
  doctorAvailable = true,
  allowSeededSearch = false,
  onlySeededSearch = false,
  compactShell = false,
}: QueueClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { openPanel, activePanel } = usePanel()
  // Two distinct concerns, previously conflated into one ref:
  // - `panelOpenRef` gates the auto-refresh (protects an active review pane
  //   from a router.refresh() remount).
  // - `slideOverOpenRef` gates the queue keyboard shortcuts (only a real
  //   slide-over has a focus trap that owns the keyboard; an inline two-pane
  //   `expandedId` selection does NOT, and the queue keydown switch is built
  //   to walk that selection, so it must keep firing).
  const panelOpenRef = useRef(Boolean(activePanel))
  const slideOverOpenRef = useRef(Boolean(activePanel))
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
  const intakesRef = useRef(intakes)
  const [activeSearchView, setActiveSearchView] = useState<ActiveQueueSearchView | null>(null)
  const activeSearchViewRef = useRef<ActiveQueueSearchView | null>(null)
  // Keep a live ref to filtered intakes for use in panel callbacks
  const filteredIntakesRef = useRef<IntakeWithPatient[]>([])

  // Sync server data into local state after router.refresh() soft-refreshes the page.
  // useState(initialIntakes) only reads the prop on mount, so without this effect
  // the 60s background refresh never updates what's shown in the queue.
  useEffect(() => {
    if (!activeSearchViewRef.current) setIntakes(initialIntakes)
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
  const debouncedSearch = useDebounce(searchQuery, 350)
  const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>(initialStatusFilter)
  const [priorityModeActive, setPriorityModeActive] = useState(false)
  const [isApprovePending, startTransition] = useTransition()
  const [isQueueRefreshPending, startQueueRefreshTransition] = useTransition()
  const [, startQueueSearchTransition] = useTransition()
  const [isQueueSearchPending, setIsQueueSearchPending] = useState(false)
  const searchRequestSequenceRef = useRef(0)
  const desiredSearchIntentRef = useRef<QueueSearchIntent | null>(null)
  const lastSearchEffectKeyRef = useRef("")
  const committedSearchQuery = activeSearchView?.query ?? ""
  const queueSearchPending = isQueueSearchPending
    || sanitizeQueueSearchQuery(searchQuery) !== committedSearchQuery
  const queueRequestPending = isQueueRefreshPending || isQueueSearchPending
  const visiblePagination = activeSearchView?.pagination ?? pagination
  const visibleQueueDegraded = activeSearchView?.queueDegraded ?? queueDegraded
  const visibleStatusCounts = activeSearchView?.statusCounts ?? statusCounts
  const visibleGlobalStatusCounts = activeSearchView?.globalStatusCounts ?? globalStatusCounts
  const visibleSearchMatchCount = activeSearchView?.searchMatchCount ?? null
  const visibleSearchState = activeSearchView?.searchState ?? "idle"
  const lastQueueRefreshAtRef = useRef(0)
  // Mirror of useQueueRealtime's `isStale` (declared lower) so the blanket
  // safety-refresh interval can gate on realtime health without re-ordering hooks.
  const isStaleRef = useRef(false)
  const dialogs = useQueueDialogs({ intakes, setIntakes })
  const [clockNow, setClockNow] = useState<Date>(() => new Date())

  useEffect(() => {
    slideOverOpenRef.current = Boolean(activePanel)
    // Suppress auto-refresh while a review is genuinely open: a slide-over
    // (any surface) or the desktop two-pane inline pane. A lingering mobile
    // `expandedId` after the sheet has closed must NOT keep suppressing —
    // otherwise focus/visibility/stale-backstop refreshes stay dead for the
    // rest of the session and newly paid intakes never appear.
    panelOpenRef.current =
      Boolean(activePanel) || (compactShell && isDesktop && Boolean(expandedId))
  }, [activePanel, expandedId, compactShell, isDesktop])

  useEffect(() => {
    const nextStatus = parseQueueStatusFilter(searchParams.get("status"))
    explicitStatusFilterRef.current = searchParams.has("status") && nextStatus !== "all"
    setStatusFilter(nextStatus)
  }, [searchParams])

  useEffect(() => {
    activeSearchViewRef.current = activeSearchView
  }, [activeSearchView])

  const runQueueSearch = useCallback(async (
    query: string,
    options: { statusFilter: QueueStatusFilter; page?: number },
  ) => {
    const normalizedQuery = sanitizeQueueSearchQuery(query)
    if (!normalizedQuery) return

    const sequence = ++searchRequestSequenceRef.current
    const requestedPage = options.page ?? 1
    const pageSize = visiblePagination?.pageSize ?? 50
    desiredSearchIntentRef.current = {
      query: normalizedQuery,
      statusFilter: options.statusFilter,
      page: requestedPage,
    }
    setIsQueueSearchPending(true)

    const requestSearchPage = (page: number) => searchDoctorQueueAction({
      query: normalizedQuery,
      statusFilter: options.statusFilter,
      page,
      pageSize,
      allowSeeded: allowSeededSearch,
      onlySeeded: onlySeededSearch,
    })

    try {
      let result = await requestSearchPage(requestedPage)

      if (result.success) {
        const canonicalPage = getCanonicalQueuePage({
          page: result.data.page,
          pageSize: result.data.pageSize,
          total: result.data.total,
          visibleCount: result.data.data.length,
          degraded: Boolean(result.data.degraded),
        })
        if (canonicalPage !== null && canonicalPage !== result.data.page) {
          result = await requestSearchPage(canonicalPage)
        }
      }

      if (sequence !== searchRequestSequenceRef.current) return

      startQueueSearchTransition(() => {
        if (result.success) {
          desiredSearchIntentRef.current = {
            query: normalizedQuery,
            statusFilter: options.statusFilter,
            page: result.data.page,
          }
          setIntakes(result.data.data)
          setActiveSearchView({
            query: normalizedQuery,
            statusFilter: options.statusFilter,
            pagination: {
              page: result.data.page,
              pageSize: result.data.pageSize,
              total: result.data.total,
            },
            queueDegraded: Boolean(result.data.degraded),
            statusCounts: result.data.statusCounts,
            globalStatusCounts: result.data.globalStatusCounts,
            searchMatchCount: result.data.searchMatchCount,
            searchState: result.data.searchState,
          })
          return
        }

        setIntakes([])
        setActiveSearchView({
          query: normalizedQuery,
          statusFilter: options.statusFilter,
          pagination: { page: 1, pageSize, total: 0 },
          queueDegraded: true,
          statusCounts: null,
          globalStatusCounts: null,
          searchMatchCount: null,
          searchState: "unavailable",
        })
      })
    } catch {
      if (sequence !== searchRequestSequenceRef.current) return
      startQueueSearchTransition(() => {
        setIntakes([])
        setActiveSearchView({
          query: normalizedQuery,
          statusFilter: options.statusFilter,
          pagination: { page: 1, pageSize, total: 0 },
          queueDegraded: true,
          statusCounts: null,
          globalStatusCounts: null,
          searchMatchCount: null,
          searchState: "unavailable",
        })
      })
    } finally {
      if (sequence === searchRequestSequenceRef.current) {
        setIsQueueSearchPending(false)
      }
    }
  }, [
    allowSeededSearch,
    onlySeededSearch,
    startQueueSearchTransition,
    visiblePagination?.pageSize,
  ])

  useEffect(() => {
    const normalizedSearch = sanitizeQueueSearchQuery(debouncedSearch)
    const effectKey = `${statusFilter}\u0000${normalizedSearch}`
    if (effectKey === lastSearchEffectKeyRef.current) return
    lastSearchEffectKeyRef.current = effectKey

    if (!normalizedSearch) {
      searchRequestSequenceRef.current += 1
      desiredSearchIntentRef.current = null
      setIsQueueSearchPending(false)
      setActiveSearchView(null)
      setIntakes(initialIntakes)
      return
    }

    void runQueueSearch(normalizedSearch, { statusFilter, page: 1 })
  }, [debouncedSearch, initialIntakes, runQueueSearch, statusFilter])

  const refreshQueue = useCallback((options: QueueRefreshOptions = {}) => {
    const {
      force = false,
      allowWhilePanelOpen = false,
      bypassThrottle = false,
    } = options
    const desiredSearch = desiredSearchIntentRef.current
    // A memory-only search refresh updates local queue state and does not
    // remount the selected review pane, so it remains safe while a case is
    // open. Unsearched background refreshes keep the panel-protection gate;
    // the explicit Realtime reconciliation path is the narrow exception that
    // lets a newly paid request enter the queue while the current case stays
    // selected.
    if (!force && !allowWhilePanelOpen && panelOpenRef.current && !desiredSearch) return
    const now = Date.now()
    if (!force && !bypassThrottle && now - lastQueueRefreshAtRef.current < 5000) return
    lastQueueRefreshAtRef.current = now
    if (desiredSearch) {
      void runQueueSearch(desiredSearch.query, {
        statusFilter: desiredSearch.statusFilter,
        page: desiredSearch.page,
      })
      return
    }
    startQueueRefreshTransition(() => {
      router.refresh()
    })
  }, [router, runQueueSearch])

  const reconcileRealtimeQueue = useCallback(() => {
    refreshQueue({ allowWhilePanelOpen: true, bypassThrottle: true })
  }, [refreshQueue])

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

    // Blanket safety poll: only fire when realtime has actually fallen behind
    // (isStale). When the channel is healthy it already keeps the queue current,
    // so a periodic full server re-render (2x requireRole + nav-count decrypt +
    // the page queries) is pure waste. Lengthened 45s -> 3min as a backstop.
    const interval = window.setInterval(() => {
      if (isStaleRef.current) refreshIfVisible()
    }, 180000)
    // Focus / visibility refreshes stay unconditional — they're cheap,
    // user-initiated, and useful after backgrounding the tab.
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
    params.delete("q")
    params.delete("page")

    const query = params.toString()
    const hash = window.location.hash || ""
    router.replace(`${query ? `${baseHref}?${query}` : baseHref}${hash}`, { scroll: false })
  }, [baseHref, router])

  // Auto-activate priority mode when SLA-breached cases exist
  useEffect(() => {
    const now = Date.now()
    const hasSlaBreaches = intakes.some(
      (r) => r.sla_deadline && new Date(r.sla_deadline).getTime() < now && ["paid", "in_review"].includes(r.status)
    )
    if (hasSlaBreaches && !priorityModeActive && !explicitStatusFilterRef.current) {
      setPriorityModeActive(true)
      handleStatusFilterChange("review")
    } else if (!hasSlaBreaches && priorityModeActive) {
      setPriorityModeActive(false)
    }
  // Only re-run when intakes list changes — not on every filter state change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakes])

  // Tick every second only while a visible queue case is still in its first
  // minute; after that, update at the next minute boundary. This keeps row
  // labels exact without repainting long queues for invisible seconds.
  useEffect(() => {
    if (intakes.length === 0) return
    setClockNow(new Date())
  }, [intakes])

  useEffect(() => {
    if (intakes.length === 0) return
    const tickDelayMs = getQueueClockTickDelayMs(
      intakes.map((intake) => getQueueEnteredAt(intake)),
      clockNow,
    )
    if (tickDelayMs == null) return
    const tickTimeout = window.setTimeout(() => {
      setClockNow(new Date())
    }, tickDelayMs)
    return () => window.clearTimeout(tickTimeout)
  }, [clockNow, intakes])

  const calculateStableWaitTime = useCallback((createdAt: string) => {
    return calculateLiveWaitTime(createdAt, clockNow)
  }, [clockNow])

  const getStableWaitTimeSeverity = useCallback((createdAt: string) => {
    // The visible row state describes the shared two-hour queue target. A
    // separate deadline still drives the priority banner, not this label.
    return getWaitTimeSeverity(createdAt, undefined, clockNow)
  }, [clockNow])

  const getStableWaitTargetState = useCallback((createdAt: string) => {
    return getQueueWaitTargetState(createdAt, clockNow)
  }, [clockNow])

  // Track row IDs that just arrived via realtime so the queue can flash a
  // calm border on the row for ~1.5s (decays via `transition-colors`).
  // Honours `prefers-reduced-motion` by skipping the timer entirely; the
  // row still renders but without the colour state change.
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<string>>(() => new Set())

  // Real-time subscription with exponential backoff reconnection
  const handleInsert = useCallback((newRow: IntakeWithPatient) => {
    if (activeSearchViewRef.current) {
      // A raw realtime row cannot prove whether a joined patient/reference
      // predicate matches. Re-run the authoritative server search instead of
      // injecting an unverified row into the filtered result set.
      reconcileRealtimeQueue()
      return
    }

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
  }, [reconcileRealtimeQueue])

  const handleUpdate = useCallback((updated: Partial<IntakeWithPatient> & { id: string }) => {
    const reconciled = applyQueueRealtimeUpdate(intakesRef.current, updated)
    if (!reconciled.matched) {
      // Draft intakes enter the actionable queue through an UPDATE to `paid`.
      // A raw Realtime row has no joined patient data, so refresh the
      // authoritative server queue instead of injecting an incomplete row.
      reconcileRealtimeQueue()
      return
    }

    setIntakes((prev) => applyQueueRealtimeUpdate(prev, updated).intakes)
    if (activeSearchViewRef.current) refreshQueue()
  }, [reconcileRealtimeQueue, refreshQueue])

  const handleDelete = useCallback((id: string) => {
    setIntakes((prev) => prev.filter((r) => r.id !== id))
    if (activeSearchViewRef.current) refreshQueue()
  }, [refreshQueue])

  const { isStale, isReconnecting } = useQueueRealtime({
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    onRefreshRequested: reconcileRealtimeQueue,
  })

  // Keep the ref read by the blanket-refresh interval (declared above) in sync.
  useEffect(() => {
    isStaleRef.current = isStale
  }, [isStale])

  // Shared action-complete handler. Removes the case from the live queue,
  // refreshes data, and advances selection / opens the next case.
  // Inline mode (`/dashboard` two-pane) and slide-over mode share this.
  const handleIntakeActionComplete = useCallback(
    (intakeId: string, options?: { advance?: boolean }) => {
      if (options?.advance === false) {
        refreshQueue({ force: true })
        return
      }

      const { nextIntake } = removeCompletedIntakeFromQueue(filteredIntakesRef.current, intakeId)
      const completion = getQueueCompletionOutcome({
        hasNextVisibleCase: Boolean(nextIntake),
        globalTotalBeforeAction: visibleGlobalStatusCounts?.all ?? null,
        activeStatusFilter: statusFilter,
        queueDegraded: visibleQueueDegraded,
      })
      setIntakes((prev) => removeCompletedIntakeFromQueue(prev, intakeId).remaining)
      // The row is already gone optimistically and realtime will reconcile the
      // server state, so ordinary advances use the throttled refresh. If the
      // visible page is exhausted while the authoritative total says cases
      // remain, force reconciliation rather than claiming the queue is clear.
      refreshQueue({
        force: completion.forceRefresh || Boolean(desiredSearchIntentRef.current),
      })
      if (nextIntake) {
        rememberOpenedCase(nextIntake.id)
        setExpandedId(nextIntake.id)
      } else {
        setExpandedId(null)
      }
      toast.success(completion.message)
    },
    [
      refreshQueue,
      rememberOpenedCase,
      statusFilter,
      visibleGlobalStatusCounts?.all,
      visibleQueueDegraded,
    ],
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
      // Treat the inline case as open so focus/visibility refreshes cannot
      // remount the queue and clear the clinician's active review.
      panelOpenRef.current = true
      return
    }

    // Legacy slide-over mode (admin patient drawer, doctor intake detail
    // page entry points). Kept identical behaviour. The slide-over owns the
    // keyboard via its focus trap, so suppress queue shortcuts immediately
    // (before the sync effect runs) as well as auto-refresh.
    panelOpenRef.current = true
    slideOverOpenRef.current = true
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
          reviewRevision={previewIntake?.updated_at ?? null}
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

  const handleApprove = useCallback(async (intakeId: string, serviceType?: string | null, subtype?: string | null) => {
    if (
      serviceType === SERVICE_TYPES.MED_CERTS ||
      serviceType === SERVICE_TYPES.COMMON_SCRIPTS ||
      serviceType === SERVICE_TYPES.REPEAT_RX ||
      isQueuePrescribingConsult(serviceType, subtype)
    ) {
      // Med certs and prescribing cases go through the review panel. The
      // doctor either confirms the certificate preview or opens Parchment
      // before approving the prescription.
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
    const restoreRemovedIntake = () => {
      setIntakes((prev) => {
        const next = prev.slice()
        next.splice(Math.max(0, Math.min(removedIndex, prev.length)), 0, removedIntake)
        return next
      })
    }

    startTransition(async () => {
      const newStatus: IntakeStatus = "approved"
      let result: Awaited<ReturnType<typeof updateStatusAction>>
      try {
        result = await updateStatusAction(intakeId, newStatus)
      } catch (_err) {
        restoreRemovedIntake()
        toast.error("Failed to approve — please try again")
        return
      }
      if (result.success) {
        refreshQueue({ force: true })
        toast.success("Request approved", {
            action: {
              label: "Undo",
              onClick: async () => {
                const revert = await updateStatusAction(intakeId, "paid")
                if (revert.success) {
                  restoreRemovedIntake()
                  refreshQueue({ force: true })
                  toast.success("Approval undone")
                } else {
                  toast.error("Couldn't undo approval")
                }
              },
            },
            duration: 5000,
        })
      } else if (result.code === "INSUFFICIENT_CLINICAL_NOTES") {
        restoreRemovedIntake()
        toast.error("Use the draft note or add a brief clinical note before approving.", {
          action: { label: "Open review", onClick: () => openReviewPanel(intakeId) },
          duration: 6000,
        })
      } else {
        restoreRemovedIntake()
        toast.error(result.error || "Failed to approve")
      }
    })
  }, [openReviewPanel, startTransition, intakes, refreshQueue])


  const hasClinicalRisk = useCallback((intake: IntakeWithPatient): boolean => hasQueueRiskBadge(intake), [])

  // Sort: risk -> scripts waiting -> priority -> oldest paid/requested -> pending-info age.
  const sortedIntakes = useMemo(() => {
    return sortForReviewNext(intakes)
  }, [intakes])

  // Status and patient/reference search are applied by `getDoctorQueue`
  // before pagination. Never re-filter the current page: doing so can report
  // false zeroes when a matching case exists on another database page.
  const filteredIntakes = sortedIntakes

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
    queueDegraded: visibleQueueDegraded,
    totalCount: visiblePagination?.total ?? intakes.length,
    statusFilter,
    searchQuery: committedSearchQuery,
    searchState: visibleSearchState,
    baseHref,
    recentlyCompleted,
    recentlyCompletedDegraded,
    recentlyCompletedTruncated,
    now: new Date(),
  }), [
    baseHref,
    committedSearchQuery,
    visibleSearchState,
    doctorAvailable,
    intakes.length,
    visiblePagination?.total,
    visibleQueueDegraded,
    statusFilter,
    recentlyCompleted,
    recentlyCompletedDegraded,
    recentlyCompletedTruncated,
  ])

  const handleReviewNext = useCallback(() => {
    const next = filteredIntakesRef.current[0]
    if (!next) return
    rememberOpenedCase(next.id)
    openReviewPanel(next.id)
  }, [openReviewPanel, rememberOpenedCase])

  const handleJumpToOldestWait = useCallback(() => {
    if (!oldestWaitingIntakeId) return

    setSearchQuery("")
    if (statusFilter !== "all") handleStatusFilterChange("all")
    rememberOpenedCase(oldestWaitingIntakeId)
    openReviewPanel(oldestWaitingIntakeId)
  }, [
    handleStatusFilterChange,
    oldestWaitingIntakeId,
    openReviewPanel,
    rememberOpenedCase,
    statusFilter,
  ])

  useEffect(() => {
    window.addEventListener("operator-jump-to-oldest-wait", handleJumpToOldestWait)
    return () => window.removeEventListener("operator-jump-to-oldest-wait", handleJumpToOldestWait)
  }, [handleJumpToOldestWait])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Preserve typing, caret movement, and native control keyboard behaviour.
      if (isEditableOrInteractiveKeyboardTarget(e.target)) return
      // Preserve global browser/app chords such as Cmd/Ctrl+K for the staff palette.
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Only a real slide-over owns the keyboard via its focus trap. An inline
      // two-pane `expandedId` selection has no trap and this switch is built to
      // walk it (j/k/Enter/a/d/Escape all key off `expandedId`), so gating on
      // the inline selection here silently killed keyboard triage after the
      // first keypress. Gate on the slide-over only.
      if (slideOverOpenRef.current) return

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
              handleApprove(intake.id, service?.type, intake.subtype)
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
            onClick={() => {
              setPriorityModeActive(false)
              handleStatusFilterChange("all")
            }}
          >
            Show all
          </button>
        </div>
      )}

      {/* Stale Data Warning */}
      {visibleQueueDegraded && (
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
            onClick={() => refreshQueue({ force: true })}
            disabled={queueRequestPending}
            className="h-7 shrink-0 text-xs"
          >
            <RefreshCw className={cn("mr-1 h-3 w-3", queueRequestPending && "animate-spin")} />
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
              onClick={() => refreshQueue({ force: true })}
              disabled={queueRequestPending}
              className="h-6 shrink-0 px-1.5 text-xs text-warning hover:bg-warning/10 hover:text-warning"
            >
              <RefreshCw className={cn("mr-1 h-3 w-3", queueRequestPending && "animate-spin")} />
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
          onRefresh={() => refreshQueue({ force: true })}
          onOpenSingleMatch={
            committedSearchQuery
              && visibleSearchState === "ready"
              && visibleSearchMatchCount === 1
              && filteredIntakes.length === 1
              && !queueSearchPending
              ? handleReviewNext
              : undefined
          }
          onOpenOldest={handleReviewNext}
          hasOpenCase={Boolean(expandedId)}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          statusCounts={visibleStatusCounts}
          filteredCount={filteredIntakes.length}
          searchMatchCount={committedSearchQuery && visibleSearchState === "ready" ? visibleSearchMatchCount : null}
          searchState={visibleSearchState}
          isSearchPending={queueSearchPending}
          isStale={isStale}
          isReconnecting={isReconnecting}
          isRefreshing={queueRequestPending}
          compactShell={compactShell}
          oldestWaitingMinutes={oldestWaitingMinutes}
          showOldestWaiting={!compactShell}
        />
      </div>

      {compactShell && isDesktop && filteredIntakes.length > 0 ? (
        <OperatorSplitPane
          mode={expandedId ? "reviewing" : "idle"}
          className={cn(
            "min-h-0 flex-1",
          )}
          listClassName="min-h-0"
          detailClassName="min-h-0"
          list={(
            <div
              key={`${statusFilter}:${committedSearchQuery}`}
              className="flex h-full min-h-0 flex-col overflow-hidden"
            >
              <div className="min-h-0 flex-1 overflow-hidden">
                <QueueTable
                  filteredIntakes={filteredIntakes}
                  expandedId={expandedId}
                  openIntakeId={openIntakeId}
                  doctorId={doctorId}
                  lastOpenedIntakeId={lastOpenedIntakeId}
                  onRememberOpenedCase={rememberOpenedCase}
                  isPending={dialogs.isPending || isApprovePending}
                  identityComplete={identityComplete}
                  onApprove={handleApprove}
                  hasClinicalRisk={hasClinicalRisk}
                  calculateWaitTime={calculateStableWaitTime}
                  getWaitTimeSeverity={getStableWaitTimeSeverity}
                  getWaitTargetState={getStableWaitTargetState}
                  openReviewPanel={openReviewPanel}
                  onPrimeReviewPanelCode={primeReviewPanelCode}
                  dialogs={dialogs}
                  recentlyCompleted={recentlyCompleted}
                  reviewHistoryTruncated={recentlyCompletedTruncated}
                  pagination={visiblePagination}
                  onPageChange={committedSearchQuery
                    ? (page) => void runQueueSearch(committedSearchQuery, { statusFilter, page })
                    : undefined}
                  baseHref={baseHref}
                  emptyState={queueEmptyState}
                  compactShell={compactShell}
                  searchQuery={committedSearchQuery}
                  newlyArrivedIds={newlyArrivedIds}
                />
              </div>
              {/* Day's approved requests at a glance, no separate navigation. */}
              <ApprovedTodayList
                intakes={recentlyCompleted}
                historyTruncated={recentlyCompletedTruncated}
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
                // No fade-from-transparent entrance here: the keyed remount on
                // advance replayed `review-pane-in` (opacity:0 → 1) on every
                // approve, flashing the pane's background through before content
                // painted. The pane now appears opaque immediately; the cockpit's
                // own `review-body-in` still gives a gentle content entrance once
                // data loads. (Fixes the "flashes white several times" on approve.)
                className="flex h-full min-h-0 flex-col bg-card"
                data-review-pane-entry
              >
                <div className="min-h-0 flex-1">
                  <IntakeReviewPanel
                    inline
                    intakeId={expandedId}
                    previewIntake={filteredIntakes.find((intake) => intake.id === expandedId)}
                    reviewRevision={
                      intakes.find((intake) => intake.id === expandedId)?.updated_at ?? null
                    }
                    caseIndex={filteredIntakes.findIndex((intake) => intake.id === expandedId)}
                    totalCases={filteredIntakes.length}
                    onActionComplete={(options) => handleIntakeActionComplete(expandedId, options)}
                  />
                </div>
              </div>
            ) : (
              <QueueIdlePanel
                filteredCount={filteredIntakes.length}
                doctorAvailable={doctorAvailable}
                queueDegraded={visibleQueueDegraded}
                nextIntakes={filteredIntakes.slice(0, 3)}
                onOpenNext={handleReviewNext}
              />
            )
          )}
        />
      ) : (
        <div className={cn(
          compactShell && "flex min-h-0 flex-1 flex-col gap-2",
        )} data-compact-caught-up={
          compactShell && filteredIntakes.length === 0 && queueEmptyState.tone === "success"
            ? "true"
            : undefined
        }>
          <QueueTable
            filteredIntakes={filteredIntakes}
            expandedId={expandedId}
            openIntakeId={openIntakeId}
            doctorId={doctorId}
            lastOpenedIntakeId={lastOpenedIntakeId}
            onRememberOpenedCase={rememberOpenedCase}
            isPending={dialogs.isPending || isApprovePending}
            identityComplete={identityComplete}
            onApprove={handleApprove}
            hasClinicalRisk={hasClinicalRisk}
            calculateWaitTime={calculateStableWaitTime}
            getWaitTimeSeverity={getStableWaitTimeSeverity}
            getWaitTargetState={getStableWaitTargetState}
            openReviewPanel={openReviewPanel}
            onPrimeReviewPanelCode={primeReviewPanelCode}
            dialogs={dialogs}
            recentlyCompleted={recentlyCompleted}
            reviewHistoryTruncated={recentlyCompletedTruncated}
            pagination={visiblePagination}
            onPageChange={committedSearchQuery
              ? (page) => void runQueueSearch(committedSearchQuery, { statusFilter, page })
              : undefined}
            baseHref={baseHref}
            emptyState={queueEmptyState}
            compactShell={compactShell}
            searchQuery={committedSearchQuery}
          />
          {compactShell && filteredIntakes.length === 0 ? (
            <ApprovedTodayList
              intakes={recentlyCompleted}
              className="max-h-[min(360px,45vh)]"
              historyTruncated={recentlyCompletedTruncated}
            />
          ) : null}
        </div>
      )}

    </div>
  )
}
