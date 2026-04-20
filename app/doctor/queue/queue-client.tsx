"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback,useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { IntakeReviewPanel } from "@/components/doctor"
import { usePanel } from "@/components/panels/panel-provider"
import { Button } from "@/components/ui/button"
import { calculateSlaCountdown,calculateWaitTime, getWaitTimeSeverity } from "@/lib/doctor/queue-utils"
import { SERVICE_TYPES } from "@/lib/doctor/service-types"
import { useQueueRealtime } from "@/lib/doctor/use-queue-realtime"
import { formatServiceType } from "@/lib/format/intake"
import { useDebounce } from "@/lib/hooks/use-debounce"
import type { IntakeStatus, IntakeWithPatient } from "@/types/db"

import { updateStatusAction } from "./actions"
import { QueueFilters } from "./queue-filters"
import { QueueTable } from "./queue-table"
import type { QueueClientProps } from "./types"
import { useQueueDialogs } from "./use-queue-dialogs"

export function QueueClient({
  intakes: initialIntakes,
  doctorId: _doctorId,
  identityComplete = true,
  pagination,
  aiApprovedIntakes = [],
  recentlyCompleted = [],
  todayEarnings,
}: QueueClientProps) {
  const router = useRouter()
  const { openPanel, activePanel } = usePanel()

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

  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 200)
  const [statusFilter, setStatusFilter] = useState<"all" | "review" | "pending_info" | "scripts">("all")
  const [priorityModeActive, setPriorityModeActive] = useState(false)
  const [isApprovePending, startTransition] = useTransition()
  const dialogs = useQueueDialogs({ intakes, setIntakes })
  const [, setTick] = useState(0) // Forces re-render for live wait time ticking
  const [soundMuted, setSoundMuted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("instantmed:queue-sound-muted") === "true"
    }
    return false
  })

  // Auto-activate priority mode when SLA-breached cases exist
  useEffect(() => {
    const now = Date.now()
    const hasSlaBreaches = intakes.some(
      (r) => r.sla_deadline && new Date(r.sla_deadline).getTime() < now && ["paid", "in_review"].includes(r.status)
    )
    if (hasSlaBreaches && !priorityModeActive) {
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
    const tickInterval = setInterval(() => {
      setTick((t) => t + 1)
    }, 30000)
    return () => clearInterval(tickInterval)
  }, [])

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
          onActionComplete={() => {
            router.refresh()
            // Auto-advance: open the next case in the filtered queue
            setIntakes((prev) => {
              const remaining = prev.filter((r) => r.id !== intakeId)
              const currentIdx = prev.findIndex((r) => r.id === intakeId)
              const nextIntake = remaining[currentIdx] ?? remaining[currentIdx - 1]
              if (nextIntake) {
                setTimeout(() => openReviewPanel(nextIntake.id), 150)
              }
              return prev
            })
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
  }, [openPanel, router, markAsRead])

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
  }, [openReviewPanel, startTransition, intakes])


  const hasRedFlags = useCallback((intake: IntakeWithPatient): boolean => {
    if (intake.flagged_for_followup) return true
    if (intake.risk_tier === "high" || intake.risk_tier === "critical") return true
    if (intake.risk_flags && Array.isArray(intake.risk_flags) && intake.risk_flags.length > 0) return true
    if (intake.risk_score >= 7) return true
    if (intake.requires_live_consult) return true
    return false
  }, [])

  // Sort: priority → flagged → SLA deadline → wait time
  const sortedIntakes = useMemo(() => {
    return [...intakes].sort((a, b) => {
      if (a.is_priority && !b.is_priority) return -1
      if (!a.is_priority && b.is_priority) return 1
      const aFlagged = hasRedFlags(a)
      const bFlagged = hasRedFlags(b)
      if (aFlagged && !bFlagged) return -1
      if (!aFlagged && bFlagged) return 1
      const aSla = a.sla_deadline ? new Date(a.sla_deadline).getTime() : Infinity
      const bSla = b.sla_deadline ? new Date(b.sla_deadline).getTime() : Infinity
      if (aSla !== bSla) return aSla - bSla
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }, [intakes, hasRedFlags])

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
      r.patient.medicare_number?.includes(plainQuery) ||
      formatServiceType(service?.type || "").toLowerCase().includes(plainQuery)
    )
  })

  // Keep ref in sync for panel navigation callbacks
  filteredIntakesRef.current = filteredIntakes

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const currentIndex = expandedId ? filteredIntakes.findIndex((r) => r.id === expandedId) : -1

      switch (e.key) {
        case "j": // Next case
          e.preventDefault()
          if (currentIndex < filteredIntakes.length - 1) {
            setExpandedId(filteredIntakes[currentIndex + 1].id)
          } else if (filteredIntakes.length > 0 && currentIndex === -1) {
            setExpandedId(filteredIntakes[0].id)
          }
          break
        case "k": // Previous case
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

  const reviewedToday = recentlyCompleted.length
  const queueSize = intakes.length
  const approvalRate = recentlyCompleted.length > 0
    ? Math.round((recentlyCompleted.filter((r) => r.status === "approved" || r.status === "completed").length / recentlyCompleted.length) * 100)
    : null

  return (
    <div className="space-y-6">
      {/* Daily stats strip */}
      {(reviewedToday > 0 || queueSize > 0 || todayEarnings) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-0.5 text-xs text-muted-foreground">
          {reviewedToday > 0 && (
            <span>
              <span className="font-medium text-foreground tabular-nums">{reviewedToday}</span>{" "}reviewed today
              {approvalRate !== null && (
                <span className="ml-1 text-muted-foreground/70">({approvalRate}%)</span>
              )}
            </span>
          )}
          {queueSize > 0 && (
            <span>
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
            onClick={() => router.refresh()}
            className="shrink-0 h-7 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      )}

      <div className="sticky top-0 z-10 bg-background -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-4 shadow-[inset_0_-1px_0_0_hsl(var(--border)/0.4)]">
        <QueueFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          soundMuted={soundMuted}
          onToggleSound={() => {
            const newMuted = !soundMuted
            setSoundMuted(newMuted)
            localStorage.setItem("instantmed:queue-sound-muted", String(newMuted))
          }}
          onRefresh={() => router.refresh()}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          intakes={intakes}
          filteredCount={filteredIntakes.length}
          isStale={isStale}
          isReconnecting={isReconnecting}
        />
      </div>

      <QueueTable
        filteredIntakes={filteredIntakes}
        intakes={intakes}
        expandedId={expandedId}
        onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
        openIntakeId={openIntakeId}
        readIds={readIds}
        isPending={dialogs.isPending || isApprovePending}
        identityComplete={identityComplete}
        onApprove={handleApprove}
        hasRedFlags={hasRedFlags}
        calculateWaitTime={calculateWaitTime}
        getWaitTimeSeverity={getWaitTimeSeverity}
        calculateSlaCountdown={calculateSlaCountdown}
        openReviewPanel={openReviewPanel}
        dialogs={dialogs}
        aiApprovedIntakes={aiApprovedIntakes}
        recentlyCompleted={recentlyCompleted}
        pagination={pagination}
      />
    </div>
  )
}
