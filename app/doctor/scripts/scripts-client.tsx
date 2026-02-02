"use client"

import { useState, useTransition } from "react"
import { Button } from "@heroui/react"
import { ClipboardList, Send, CheckCircle2, Clock, Filter, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import type { ScriptTask, ScriptTaskStatus } from "@/lib/data/script-tasks"

interface ScriptsClientProps {
  initialTasks: ScriptTask[]
  initialCounts: {
    pending_send: number
    sent: number
    confirmed: number
    total: number
  }
}

const STATUS_CONFIG: Record<ScriptTaskStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending_send: { label: "Pending Send", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: Clock },
  sent: { label: "Sent", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300", icon: Send },
  confirmed: { label: "Confirmed", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle2 },
}

export function ScriptsClient({ initialTasks, initialCounts }: ScriptsClientProps) {
  const [filter, setFilter] = useState<ScriptTaskStatus | "all">("all")
  const [tasks, setTasks] = useState(initialTasks)
  const [counts, setCounts] = useState(initialCounts)
  const [isPending, startTransition] = useTransition()

  const filteredTasks = filter === "all" ? tasks : tasks.filter((t) => t.status === filter)

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

      toast.success(`Marked as ${STATUS_CONFIG[newStatus].label}`)

      // Refresh data
      startTransition(async () => {
        const refreshRes = await fetch("/api/doctor/scripts")
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          setTasks(data.tasks)
          setCounts(data.counts)
        }
      })
    } catch {
      // Revert optimistic update
      setTasks(initialTasks)
      toast.error("Failed to update task")
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-white">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Script To-Do</h1>
            <p className="text-sm text-muted-foreground">
              Prescriptions to send via Parchment
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            startTransition(async () => {
              const res = await fetch("/api/doctor/scripts")
              if (res.ok) {
                const data = await res.json()
                setTasks(data.tasks)
                setCounts(data.counts)
              }
            })
          }}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          aria-label="Refresh script tasks"
        >
          <RotateCcw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["pending_send", "sent", "confirmed"] as const).map((status) => {
          const config = STATUS_CONFIG[status]
          const Icon = config.icon
          return (
            <button
              key={status}
              onClick={() => setFilter(filter === status ? "all" : status)}
              className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
                filter === status
                  ? "border-sky-300 bg-sky-50/50 dark:border-sky-700 dark:bg-sky-950/30"
                  : "border-border/50 bg-card hover:border-border"
              }`}
              aria-label={`Filter by ${config.label}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-semibold">{counts[status]}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
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
            onClick={() => setFilter("all")}
            className="text-sm text-sky-600 hover:underline"
            aria-label="Clear filter"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-16 text-center">
            <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-400" />
            <p className="font-medium text-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground">
              {filter === "all"
                ? "No script tasks at the moment"
                : `No ${STATUS_CONFIG[filter].label.toLowerCase()} tasks`}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const config = STATUS_CONFIG[task.status]
            const Icon = config.icon
            return (
              <div
                key={task.id}
                className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
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
                      Created {new Date(task.created_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  {task.status === "pending_send" && (
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      onPress={() => updateStatus(task.id, "sent")}
                      startContent={<Send className="h-3.5 w-3.5" />}
                      aria-label={`Mark script for ${task.patient_name} as sent`}
                    >
                      Mark Sent
                    </Button>
                  )}
                  {task.status === "sent" && (
                    <Button
                      size="sm"
                      color="success"
                      variant="flat"
                      onPress={() => updateStatus(task.id, "confirmed")}
                      startContent={<CheckCircle2 className="h-3.5 w-3.5" />}
                      aria-label={`Confirm script for ${task.patient_name}`}
                    >
                      Confirm
                    </Button>
                  )}
                  {task.status === "confirmed" && (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
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
    </div>
  )
}
