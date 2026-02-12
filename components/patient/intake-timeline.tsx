"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { 
  Clock, 
  CheckCircle2, 
  FileText, 
  MessageSquare,
  Send,
  XCircle,
  AlertCircle,
  CreditCard,
  User,
  Stethoscope,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { IntakeStatus } from "@/lib/data/intake-lifecycle"

interface TimelineEvent {
  status: IntakeStatus
  timestamp: string
  actor?: string
  note?: string
}

interface IntakeTimelineProps {
  events: TimelineEvent[]
  currentStatus: IntakeStatus
  className?: string
}

interface StatusConfig {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

const STATUS_CONFIG: Record<IntakeStatus, StatusConfig> = {
  draft: {
    label: "Request started",
    icon: <FileText className="h-3.5 w-3.5" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  pending_payment: {
    label: "Awaiting payment",
    icon: <CreditCard className="h-3.5 w-3.5" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/50",
  },
  paid: {
    label: "Payment received",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  in_review: {
    label: "Doctor reviewing",
    icon: <Stethoscope className="h-3.5 w-3.5" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
  },
  pending_info: {
    label: "Info requested",
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/50",
  },
  approved: {
    label: "Approved",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  declined: {
    label: "Not approved",
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/50",
  },
  escalated: {
    label: "Escalated for review",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/50",
  },
  completed: {
    label: "Delivered",
    icon: <Send className="h-3.5 w-3.5" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  expired: {
    label: "Expired",
    icon: <Clock className="h-3.5 w-3.5" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  awaiting_script: {
    label: "Preparing eScript",
    icon: <FileText className="h-3.5 w-3.5" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
  },
}

function formatTimestamp(timestamp: string): { date: string; time: string; relative: string } {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  let relative: string
  if (diffMins < 1) {
    relative = "Just now"
  } else if (diffMins < 60) {
    relative = `${diffMins}m ago`
  } else if (diffHours < 24) {
    relative = `${diffHours}h ago`
  } else if (diffDays === 1) {
    relative = "Yesterday"
  } else if (diffDays < 7) {
    relative = `${diffDays}d ago`
  } else {
    relative = date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
  }

  return {
    date: date.toLocaleDateString("en-AU", { 
      weekday: "short",
      day: "numeric", 
      month: "short",
    }),
    time: date.toLocaleTimeString("en-AU", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true,
    }),
    relative,
  }
}

function formatActor(actor?: string): string | null {
  if (!actor) return null
  if (actor === "system") return "System"
  if (actor === "patient") return "You"
  return `Dr. ${actor}`
}

export function IntakeTimeline({ events, currentStatus, className }: IntakeTimelineProps) {
  const sortedEvents = useMemo(() => 
    [...events].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ), 
    [events]
  )

  if (sortedEvents.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground text-sm", className)}>
        No timeline events yet
      </div>
    )
  }

  return (
    <div className={cn("space-y-0", className)}>
      {sortedEvents.map((event, index) => {
        const config = STATUS_CONFIG[event.status]
        const { time, relative } = formatTimestamp(event.timestamp)
        const actor = formatActor(event.actor)
        const isLast = index === sortedEvents.length - 1
        const isCurrent = event.status === currentStatus && index === 0

        return (
          <motion.div
            key={`${event.status}-${event.timestamp}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative flex gap-3"
          >
            {!isLast && (
              <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
            )}

            <div
              className={cn(
                "relative z-10 shrink-0 h-7 w-7 rounded-full flex items-center justify-center",
                config.bgColor,
                config.color,
                isCurrent && "ring-2 ring-primary/30"
              )}
            >
              {config.icon}
            </div>

            <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={cn(
                    "font-medium text-sm",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {config.label}
                  </p>
                  {actor && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="h-3 w-3" />
                      {actor}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-muted-foreground">{relative}</p>
                  <p className="text-xs text-muted-foreground/70">{time}</p>
                </div>
              </div>

              {event.note && (
                <p className="mt-1.5 text-xs text-muted-foreground bg-muted/50 dark:bg-muted/30 rounded-lg px-3 py-2">
                  {event.note}
                </p>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export function IntakeTimelineCompact({ 
  createdAt, 
  updatedAt,
  currentStatus,
  className,
}: { 
  createdAt: string
  updatedAt?: string
  currentStatus: IntakeStatus
  className?: string
}) {
  const created = formatTimestamp(createdAt)
  const updated = updatedAt ? formatTimestamp(updatedAt) : null
  const config = STATUS_CONFIG[currentStatus]

  return (
    <div className={cn("space-y-2 text-sm", className)}>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Submitted</span>
        <span className="font-medium">{created.date} at {created.time}</span>
      </div>
      {updated && currentStatus !== "paid" && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Last update</span>
          <span className={cn("font-medium", config.color)}>{updated.relative}</span>
        </div>
      )}
    </div>
  )
}
