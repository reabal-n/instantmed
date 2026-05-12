"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback,useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { IntakeReviewPanel } from "@/components/doctor"
import { usePanel } from "@/components/panels/panel-provider"
import { Button } from "@/components/ui/button"
import { ADMIN_DOCTOR_IDENTITY_HREF, DOCTOR_DASHBOARD_HREF, parseQueueStatusFilter, type QueueStatusFilter } from "@/lib/dashboard/routes"
import { DOCTOR_QUEUE_FOCUS_AFTER_ACTION_KEY, LAST_OPENED_DOCTOR_CASE_KEY } from "@/lib/doctor/queue-focus"
import { removeCompletedIntakeFromQueue } from "@/lib/doctor/queue-state"
import { calculateSlaCountdown,calculateWaitTime, getWaitTimeSeverity } from "@/lib/doctor/queue-utils"
import { hasReviewNextRisk, sortForReviewNext } from "@/lib/doctor/review-next"
import { SERVICE_TYPES } from "@/lib/doctor/service-types"
import { useQueueRealtime } from "@/lib/doctor/use-queue-realtime"
import { formatServiceType } from "@/lib/format/intake"
import { useDebounce } from "@/lib/hooks/use-debounce"
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
}

function buildQueueEmptyState({
  doctorAvailable,
  totalCount,
  statusFilter,
  searchQuery,
  baseHref,
}: {
  doctorAvailable: boolean
  totalCount: number
  statusFilter: QueueStatusFilter
  searchQuery: string
  baseHref: string
}): QueueEmptyState {
  if (!doctorAvailable && totalCount === 0) {
    return {
      title: "Availability is paused",
      description: "Your queue can look empty while review availability is off. Turn availability back on before relying on this view.",
      tone: "warning",
      actionHref: ADMIN_DOCTOR_IDENTITY_HREF,
      actionLabel: "Open availability",
    }
  }

  if (searchQuery.trim() || statusFilter !== "all") {
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
  }
}

export function QueueClient({
  intakes: initialIntakes,
  doctorId,
  identityComplete = true,
  queueDegraded = false,
  pagination,
  aiApprovedIntakes = [],
  recentlyCompleted = [],
  todayEarnings,
  initialStatusFilter = "all",
  hasExplicitStatusFilter = false,
  baseHref = DOCTOR_DASHBOARD_HREF,
  doctorAvailable = true,
  compactShell = false,
}: QueueClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { openPanel, activePanel } = usePanel()
  const panelOpenRef = useRef(Boolean(activePanel))
  const explicitStatusFilterRef = useRef(hasExplicitStatusFilter)
  const queueRegionRef = useRef<HTMLDivElement>(null)

  const openIntakeId = activePanel?.id.startsWith("intake-review-")
    ? activePanel.id.replace("intake-review-", "")
    : null
  const [intakes, setIntakes] = useState(initialIntakes)
  // Keep a live ref to filtered intakes for use in panel callbacks
  const filteredIntakesRef = useRef<IntakeWithPatient[]>([])

  // Sync server data into local state after router.refresh() soft-refreshes the page.
  // useState(initialIntakes) only reads the prop on mount, so without this effect
  // the 60s background refresh never updates what's shown in the queue.
  useEffect(() => {
    setIntakes(initialIntakes)
  }, [initialIntakes])

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [lastOpenedIntakeId, setLastOpenedIntakeId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    try {
      return sessionStorage.getItem(LAST_OPENED_DOCTOR_CASE_KEY)
    } catch {
      return null
    }
  })
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const stored = sessionStorage.getItem("instantmed:queue-read-ids")
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set()
    } catch { return new Set() }
  })

  const markAsRead = useCallback((intakeId: string) => {
    setReadIds((prev) => {
      if (prev.has(intakeId)) return prev
      const next = new Set(prev)
      next.add(intakeId)
      try { sessionStorage.setItem("instantmed:queue-read-ids", JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }, [])

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
  const [lastQueueRefreshAt, setLastQueueRefreshAt] = useState<Date | null>(null)
  const dialogs = useQueueDialogs({ intakes, setIntakes })
  const [clockNow, setClockNow] = useState<Date | null>(null)
  const [soundMuted, setSoundMuted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("instantmed:queue-sound-muted") === "true"
    }
    return false
  })

  useEffect(() => {
    panelOpenRef.current = Boolean(activePanel)
  }, [activePanel])

  useEffect(() => {
    const nextStatus = parseQueueStatusFilter(searchParams.get("status"))
    explicitStatusFilterRef.current = searchParams.has("status") && nextStatus !== "all"
    setStatusFilter(nextStatus)
  }, [searchParams])

  const refreshQueue = useCallback((force = false) => {
    if (!force && panelOpenRef.current) return
    const now = Date.now()
    if (!force && now - lastQueueRefreshAtRef.current < 5000) return
    lastQueueRefreshAtRef.current = now
    setLastQueueRefreshAt(new Date(now))
    startQueueRefreshTransition(() => {
      router.refresh()
    })
  }, [router])

  useEffect(() => {
    const now = Date.now()
    lastQueueRefreshAtRef.current = now
    setLastQueueRefreshAt(new Date(now))
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

    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete("status")
    } else {
      params.set("status", value)
    }
    params.delete("page")

    const query = params.toString()
    router.replace(query ? `${baseHref}?${query}` : baseHref, { scroll: false })
  }, [baseHref, router, searchParams])

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

  // Tick every 30s to update wait time displays live
  useEffect(() => {
    setClockNow(new Date())
    const tickInterval = setInterval(() => {
      setClockNow(new Date())
    }, 30000)
    return () => clearInterval(tickInterval)
  }, [])

  const calculateStableWaitTime = useCallback((createdAt: string) => {
    if (!clockNow) return "..."
    return calculateWaitTime(createdAt, clockNow)
  }, [clockNow])

  const getStableWaitTimeSeverity = useCallback((createdAt: string, slaDeadline?: string | null) => {
    if (!clockNow) return "normal"
    return getWaitTimeSeverity(createdAt, slaDeadline, clockNow)
  }, [clockNow])

  const calculateStableSlaCountdown = useCallback((slaDeadline: string | null | undefined) => {
    if (!clockNow) return null
    return calculateSlaCountdown(slaDeadline, clockNow)
  }, [clockNow])

  const lastQueueRefreshLabel = useMemo(() => {
    if (!lastQueueRefreshAt) return "Auto refresh on"
    return `Updated ${lastQueueRefreshAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
  }, [lastQueueRefreshAt])

  // Play a subtle notification sound when a new intake arrives
  const playNotificationSound = useCallback(() => {
    if (soundMuted) return
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // A5
      oscillator.frequency.setValueAtTime(1175, audioCtx.currentTime + 0.1) // D6
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.3)
    } catch {
      // Audio not available - silent fallback
    }
  }, [soundMuted])

  // Real-time subscription with exponential backoff reconnection
  const handleInsert = useCallback((newRow: IntakeWithPatient) => {
    setIntakes((prev) => {
      if (prev.some((r) => r.id === newRow.id)) return prev
      return [newRow, ...prev]
    })
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
    playNotificationSound,
  })

  // Open intake review in a slide-over panel (stays on queue)
  const openReviewPanel = useCallback((intakeId: string) => {
    panelOpenRef.current = true
    markAsRead(intakeId)
    const getAdjacentId = (direction: "next" | "prev"): string | null => {
      const list = filteredIntakesRef.current
      const idx = list.findIndex((r) => r.id === intakeId)
      if (idx === -1) return null
      return direction === "next" ? (list[idx + 1]?.id ?? null) : (list[idx - 1]?.id ?? null)
    }

    const list = filteredIntakesRef.current
    const caseIndex = list.findIndex((r) => r.id === intakeId)

    openPanel({
      id: `intake-review-${intakeId}`,
      type: "sheet",
      component: (
        <IntakeReviewPanel
          intakeId={intakeId}
          caseIndex={caseIndex >= 0 ? caseIndex : undefined}
          totalCases={list.length > 0 ? list.length : undefined}
          onActionComplete={(options) => {
            const { nextIntake } = removeCompletedIntakeFromQueue(filteredIntakesRef.current, intakeId)
            setIntakes((prev) => {
              return removeCompletedIntakeFromQueue(prev, intakeId).remaining
            })
            refreshQueue(true)
            if (options?.advance !== false && nextIntake) {
              rememberOpenedCase(nextIntake.id)
              toast.success("Case done. Opening next.")
              setTimeout(() => openReviewPanel(nextIntake.id), 90)
            } else if (options?.advance !== false) {
              toast.success("Case done. Queue clear.")
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
  }, [openPanel, refreshQueue, markAsRead, rememberOpenedCase])

  const handleApprove = useCallback(async (intakeId: string, serviceType?: string | null) => {
    if (serviceType === SERVICE_TYPES.MED_CERTS) {
      // Open review panel - doctor uses the certificate preview dialog there
      openReviewPanel(intakeId)
      return
    }
    startTransition(async () => {
      const newStatus: IntakeStatus = serviceType === SERVICE_TYPES.COMMON_SCRIPTS || serviceType === SERVICE_TYPES.REPEAT_RX
        ? "awaiting_script"
        : "approved"
      const result = await updateStatusAction(intakeId, newStatus)
      if (result.success) {
        const removedIntake = intakes.find((r) => r.id === intakeId)
        setIntakes((prev) => prev.filter((r) => r.id !== intakeId))
        refreshQueue(true)
        if (serviceType === SERVICE_TYPES.COMMON_SCRIPTS || serviceType === SERVICE_TYPES.REPEAT_RX) {
          openReviewPanel(intakeId)
        } else {
          toast.success("Request approved", {
            action: removedIntake ? {
              label: "Undo",
              onClick: async () => {
                const revert = await updateStatusAction(intakeId, "paid")
                if (revert.success) {
                  setIntakes((prev) => [removedIntake, ...prev])
                  refreshQueue(true)
                  toast.success("Approval undone")
                } else {
                  toast.error("Couldn't undo approval")
                }
              },
            } : undefined,
            duration: 5000,
          })
        }
      } else if (result.code === "INSUFFICIENT_CLINICAL_NOTES") {
        toast.error("Add clinical notes (50+ chars) in the case review before approving.", {
          action: { label: "Open case", onClick: () => openReviewPanel(intakeId) },
          duration: 6000,
        })
      } else {
        toast.error(result.error || "Failed to approve")
      }
    })
  }, [openReviewPanel, startTransition, intakes, refreshQueue])


  const hasRedFlags = useCallback((intake: IntakeWithPatient): boolean => hasReviewNextRisk(intake), [])

  // Sort: risk -> scripts waiting -> priority -> oldest paid/requested -> pending-info age.
  const sortedIntakes = useMemo(() => {
    return sortForReviewNext(intakes)
  }, [intakes])

  const filteredIntakes = sortedIntakes.filter((r) => {
    // Status filter
    if (statusFilter === "review" && !["paid", "in_review"].includes(r.status)) return false
    if (statusFilter === "pending_info" && r.status !== "pending_info") return false
    if (statusFilter === "scripts" && r.status !== "awaiting_script") return false

    // Search filter — supports smart tokens: risk:high type:ed status:scripts priority:true
    if (!debouncedSearch.trim()) return true
    const service = r.service as { name?: string; type?: string } | undefined

    // Extract tokens from search query
    const rawTokens = debouncedSearch.toLowerCase().match(/\w+:\S+/g) ?? []
    const plainQuery = debouncedSearch.toLowerCase().replace(/\w+:\S+/g, "").trim()

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
      r.patient.phone?.replace(/\s+/g, "").includes(plainQuery.replace(/\s+/g, "")) ||
      formatServiceType(service?.type || "").toLowerCase().includes(plainQuery)
    )
  })

  // Keep ref in sync for panel navigation callbacks
  filteredIntakesRef.current = filteredIntakes

  const queueEmptyState = useMemo(() => buildQueueEmptyState({
    doctorAvailable,
    totalCount: intakes.length,
    statusFilter,
    searchQuery: debouncedSearch,
    baseHref,
  }), [baseHref, debouncedSearch, doctorAvailable, intakes.length, statusFilter])

  const handleReviewNext = useCallback(() => {
    const next = filteredIntakesRef.current[0]
    if (!next) return
    rememberOpenedCase(next.id)
    openReviewPanel(next.id)
  }, [openReviewPanel, rememberOpenedCase])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

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

  // Auto-scroll the keyboard-focused row into view. Uses the row's `data-testid`
  // attribute (set by QueueTable) to locate the element without prop-drilling
  // refs. `nearest` block keeps the row in view without snapping the page.
  useEffect(() => {
    if (!expandedId) return
    const row = queueRegionRef.current?.querySelector<HTMLElement>(
      `[data-testid="queue-row-${expandedId}"]`,
    )
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [expandedId])

  const reviewedToday = recentlyCompleted.length
  const queueSize = intakes.length
  const approvalRate = recentlyCompleted.length > 0
    ? Math.round((recentlyCompleted.filter((r) => r.status === "approved" || r.status === "completed").length / recentlyCompleted.length) * 100)
    : null

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
          role="alert"
          className="flex items-center gap-3 p-3 rounded-lg bg-warning-light border border-warning-border/60"
        >
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-warning">
              {isReconnecting ? "Reconnecting to live updates..." : "Queue may be out of date"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshQueue(true)}
            disabled={isQueueRefreshPending}
            className="shrink-0 h-7 text-xs"
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", isQueueRefreshPending && "animate-spin")} />
            Refresh
          </Button>
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
          soundMuted={soundMuted}
          onToggleSound={() => {
            const newMuted = !soundMuted
            setSoundMuted(newMuted)
            localStorage.setItem("instantmed:queue-sound-muted", String(newMuted))
          }}
          onRefresh={() => refreshQueue(true)}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          intakes={intakes}
          filteredCount={filteredIntakes.length}
          isStale={isStale}
          isReconnecting={isReconnecting}
          isRefreshing={isQueueRefreshPending}
          lastUpdatedLabel={lastQueueRefreshLabel}
          compactShell={compactShell}
          onReviewNext={handleReviewNext}
        />
      </div>

      <QueueTable
        filteredIntakes={filteredIntakes}
        intakes={intakes}
        expandedId={expandedId}
        onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
        openIntakeId={openIntakeId}
        doctorId={doctorId}
        readIds={readIds}
        lastOpenedIntakeId={lastOpenedIntakeId}
        onRememberOpenedCase={rememberOpenedCase}
        isPending={dialogs.isPending || isApprovePending}
        identityComplete={identityComplete}
        onApprove={handleApprove}
        hasRedFlags={hasRedFlags}
        calculateWaitTime={calculateStableWaitTime}
        getWaitTimeSeverity={getStableWaitTimeSeverity}
        calculateSlaCountdown={calculateStableSlaCountdown}
        openReviewPanel={openReviewPanel}
        dialogs={dialogs}
        aiApprovedIntakes={aiApprovedIntakes}
        recentlyCompleted={recentlyCompleted}
        pagination={pagination}
        baseHref={baseHref}
        emptyState={queueEmptyState}
        compactShell={compactShell}
      />

      {/* Keyboard hint strip. Renders only when the queue has rows AND
          nothing is focused, so it teaches the shortcut without screaming
          at the operator mid-triage. Disappears after first arrow press. */}
      {compactShell && filteredIntakes.length > 0 && !expandedId ? (
        <div
          className="flex shrink-0 items-center gap-1.5 px-1 pb-1 text-[11px] text-muted-foreground/70"
          aria-hidden
        >
          <kbd className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-sans text-[10px] font-semibold">↓</kbd>
          <kbd className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-sans text-[10px] font-semibold">↑</kbd>
          <span>navigate</span>
          <span className="mx-1 text-border">·</span>
          <kbd className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-sans text-[10px] font-semibold">Enter</kbd>
          <span>open</span>
          <span className="mx-1 text-border">·</span>
          <kbd className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-sans text-[10px] font-semibold">A</kbd>
          <span>approve</span>
          <span className="mx-1 text-border">·</span>
          <kbd className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-sans text-[10px] font-semibold">D</kbd>
          <span>decline</span>
        </div>
      ) : null}
    </div>
  )
}
