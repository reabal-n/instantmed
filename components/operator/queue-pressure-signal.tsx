"use client"

import { Clock3 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import {
  getQueuePressureState,
  QUEUE_WAIT_TARGET_MINUTES,
  type QueuePressureSeverity,
} from "@/lib/doctor/queue-pressure"
import { formatRefreshAge } from "@/lib/hooks/use-relative-refresh-age"
import { cn } from "@/lib/utils"

const severityClasses: Record<QueuePressureSeverity, {
  root: string
  icon: string
  dot: string
  value: string
}> = {
  idle: {
    root: "border-border/60 bg-white text-muted-foreground dark:bg-card",
    icon: "text-muted-foreground",
    dot: "bg-muted-foreground/50",
    value: "text-foreground",
  },
  clear: {
    root: "border-border/60 bg-white text-slate-700 dark:bg-card dark:text-muted-foreground",
    icon: "text-muted-foreground",
    dot: "bg-slate-500",
    value: "text-foreground",
  },
  watch: {
    root: "border-warning-border bg-warning-light text-warning dark:bg-warning/10",
    icon: "text-warning",
    dot: "bg-warning",
    value: "text-warning",
  },
  urgent: {
    root: "border-destructive/25 bg-destructive/10 text-destructive",
    icon: "text-destructive",
    dot: "bg-destructive",
    value: "text-destructive",
  },
}

interface QueuePressureSignalProps {
  oldestWaitingMinutes: number | null | undefined
  className?: string
  compact?: boolean
  showTarget?: boolean
  showIcon?: boolean
  showLabel?: boolean
  targetMinutes?: number
}

export function QueuePressureSignal({
  oldestWaitingMinutes,
  className,
  compact = false,
  showTarget = true,
  showIcon = true,
  showLabel = true,
  targetMinutes = QUEUE_WAIT_TARGET_MINUTES,
}: QueuePressureSignalProps) {
  const mountedAtRef = useRef(Date.now())
  const [nowMs, setNowMs] = useState(() => mountedAtRef.current)
  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 5000)
    return () => window.clearInterval(interval)
  }, [])
  const state = getQueuePressureState(oldestWaitingMinutes, targetMinutes)
  const classes = severityClasses[state.severity]
  const refreshAgeLabel = formatRefreshAge(nowMs, mountedAtRef.current)
  const targetLabel = "Target: under 2h"
  const trailingLabel = showTarget ? refreshAgeLabel : null

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium shadow-sm shadow-primary/[0.03] transition-colors duration-150",
        compact ? "h-8" : "h-10 px-3",
        classes.root,
        className,
      )}
      title={`${state.title} ${targetLabel}.`}
      aria-label={`${state.label}: ${state.value}`}
      data-queue-pressure={state.severity}
    >
      {showIcon ? <Clock3 className={cn("h-3.5 w-3.5 shrink-0", classes.icon)} aria-hidden /> : null}
      {!showIcon ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full motion-safe:animate-[pulse-soft_1.2s_ease-in-out_infinite]", classes.dot)}
          aria-hidden
        />
      ) : null}
      {showLabel ? (
        <span className="hidden text-[11px] font-semibold sm:inline">
          {state.label}
        </span>
      ) : null}
      <span className={cn("text-sm font-semibold tabular-nums", classes.value)}>
        {state.value}
      </span>
      {trailingLabel ? (
        <span className="hidden text-[11px] font-medium opacity-80 sm:inline">
          {trailingLabel}
        </span>
      ) : null}
    </span>
  )
}
