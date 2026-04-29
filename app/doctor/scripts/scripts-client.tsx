"use client"

import { CheckCircle2, Clock, Filter, RotateCcw,Send } from "lucide-react"
import { useRef,useState, useTransition } from "react"
import { toast } from "sonner"

import { DashboardPageHeader } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/uix"
import { capture } from "@/lib/analytics/capture"
import type { ScriptTask, ScriptTaskStatus } from "@/lib/data/script-tasks"
import { formatDateTime } from "@/lib/format"

const PAGE_SIZE = 50

interface ScriptsClientProps {
  initialTasks: ScriptTask[]
  initialCounts: {
    pending_send: number
    sent: number
    confirmed: number
    total: number
  }
  initialTotal: number
}

const STATUS_CONFIG: Record<ScriptTaskStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending_send: { label: "Pending Send", color: "bg-warning-light text-warning", icon: Clock },
  sent: { label: "Sent", color: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300", icon: Send },
  confirmed: { label: "Confirmed", color: "bg-success-light text-success", icon: CheckCircle2 },
}

export function ScriptsClient({ initialTasks, initialCounts, initialTotal }: ScriptsClientProps) {
  const [filter, setFilter] = useState<ScriptTaskStatus | "all">("all")
  const [tasks, setTasks] = useState(initialTasks)
  const [counts, setCounts] = useState(initialCounts)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()
  const lastKnownGoodTasks = useRef(initialTasks)

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const filteredTasks = filter === "all" ? tasks : tasks.filter((t) => t.status === filter)

  function fetchPage(newPage: number, statusFilter?: ScriptTaskStatus | "all") {
    const activeFilter = statusFilter ?? filter
    startTransition(async () => {
      const params = new URLSearchParams({ page: String(newPage), pageSize: String(PAGE_SIZE) })
      if (activeFilter !== "all") params.set("status", activeFilter)
      const res = await fetch(`/api/doctor/scripts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks)
        setCounts(data.counts)
        setTotal(data.total)
        setPage(newPage)
        lastKnownGoodTasks.current = data.tasks
      }
    })
  }

  async function updateStatus(taskId: string, newStatus: ScriptTaskStatus) {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              ...(newStatus === "sent" ? { sent_at: new Date().toISOString() } : {}),
              ...(newStatus === "confirmed" ? { confirmed_at: new Date().toISOString() } : {}),
            }
          : t
      )
    )

    try {
      const res = await fetch(`/api/doctor/scripts/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error("Failed to update")

      if (newStatus === "sent") {
        capture("doctor_script_sent", { task_id: taskId })
      }
      toast.success(`Marked as ${STATUS_CONFIG[newStatus].label}`)

      // Refresh current page and update last-known-good state
      fetchPage(page)
    } catch {
      // Revert optimistic update to last-known-good state (not stale initial prop)
      setTasks(lastKnownGoodTasks.current)
      toast.error("Failed to update task")
    }
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Script To-Do"
        description="Prescriptions to send via Parchment"
        actions={
          <button
            onClick={() => fetchPage(page)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            aria-label="Refresh script tasks"
          >
            <RotateCcw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* Status summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["pending_send", "sent", "confirmed"] as const).map((status) => {
          const config = STATUS_CONFIG[status]
          const Icon = config.icon
          return (
            <button
              key={status}
              onClick={() => {
                const newFilter = filter === status ? "all" : status
                setFilter(newFilter)
                fetchPage(1, newFilter)
              }}
              className={`flex items-center gap-4 rounded-xl border border-border/50 p-5 transition-[background-color,border-color] duration-200 ${
                filter === status
                  ? "border-sky-300 bg-sky-50/50 dark:border-sky-700 dark:bg-sky-950/30"
                  : "border-border/50 bg-card hover:border-border"
              }`}
              aria-label={`Filter by ${config.label}`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-semibold tabular-nums">{counts[status]}</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{config.label}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filter indicator */}
      {filter !== "all" && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Showing: {STATUS_CONFIG[filter].label}
          </span>
          <button
            onClick={() => {
              setFilter("all")
              fetchPage(1, "all")
            }}
            className="text-sm text-sky-600 hover:underline"
            aria-label="Clear filter"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {filteredTasks.length === 0 && !isPending ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl border border-dashed border-border/60 bg-muted/20">
            <div className="text-4xl mb-3" aria-hidden="true">🎉</div>
            <h3 className="text-base font-semibold text-foreground mb-1">All caught up!</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              No pending script tasks right now. New tasks will appear here as patients request scripts.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const config = STATUS_CONFIG[task.status]
            const Icon = config.icon
            return (
              <div
                key={task.id}
                className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{task.patient_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[task.medication_name, task.medication_strength, task.medication_form]
                        .filter(Boolean)
                        .join(" ") || "Medication details pending"}
                    </p>
                    {task.patient_email && (
                      <p className="text-xs text-muted-foreground">{task.patient_email}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Created {formatDateTime(task.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  {task.status === "pending_send" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateStatus(task.id, "sent")}
                      aria-label={`Mark script for ${task.patient_name} as sent`}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Mark Sent
                    </Button>
                  )}
                  {task.status === "sent" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-success"
                      onClick={() => updateStatus(task.id, "confirmed")}
                      aria-label={`Confirm script for ${task.patient_name}`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Confirm
                    </Button>
                  )}
                  {task.status === "confirmed" && (
                    <span className="flex items-center gap-1.5 rounded-full bg-success-light px-3 py-1 text-xs font-medium text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      Done
                    </span>
                  )}
                  {task.status !== "pending_send" && task.status !== "confirmed" && (
                    <button
                      onClick={() => updateStatus(task.id, "pending_send")}
                      className="text-xs text-muted-foreground hover:text-foreground"
                      aria-label={`Undo status change for ${task.patient_name}`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <Pagination
            total={totalPages}
            page={page}
            onChange={(p) => fetchPage(p)}
            showControls
            size="sm"
          />
        </div>
      )}
    </div>
  )
}
