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
  todayEarnings: _todayEarnings,
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
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 200)
  const [statusFilter, setStatusFilter] = useState<"all" | "review" | "pending_info" | "scripts">("all")
  const [isApprovePending, startTransition] = useTransition()
  const dialogs = useQueueDialogs({ intakes, setIntakes })
  const [, setTick] = useState(0) // Forces re-render for live wait time ticking
  const [soundMuted, setSoundMuted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("instantmed:queue-sound-muted") === "true"
    }
    return false
  })

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
    const getAdjacentId = (direction: "next" | "prev") => {
      const list = filteredIntakesRef.current
      const idx = list.findIndex((r) => r.id === intakeId)
      if (idx === -1) return null
      return direction === "next" ? (list[idx + 1]?.id ?? null) : (list[idx - 1]?.id ?? null)
    }

    openPanel({
      id: `intake-review-${intakeId}`,
      type: "sheet",
      component: (
        <IntakeReviewPanel
          intakeId={intakeId}
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
  }, [openPanel, router])

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

    // Search filter
    if (!debouncedSearch.trim()) return true
    const query = debouncedSearch.toLowerCase()
    const service = r.service as { name?: string; type?: string } | undefined
    return (
      r.patient.full_name.toLowerCase().includes(query) ||
      r.patient.medicare_number?.includes(query) ||
      formatServiceType(service?.type || "").toLowerCase().includes(query)
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

  return (
    <div className="space-y-6">
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
