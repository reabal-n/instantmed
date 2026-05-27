"use client"

import { Clock3 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import {
  getQueuePressureState,
  QUEUE_WAIT_TARGET_MINUTES,
  type QueuePressureSeverity,
} from "@/lib/doctor/queue-pressure"
import { formatMinutes } from "@/lib/format/dates"
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
    root: "border-border/70 bg-white text-slate-700 dark:bg-card dark:text-muted-foreground",
    icon: "text-muted-foreground",
    dot: "bg-warning",
    value: "text-slate-800 dark:text-foreground",
  },
  urgent: {
    root: "border-destructive/25 bg-destructive/10 text-destructive",
    icon: "text-destructive",
    dot: "bg-destructive",
    value: "text-destructive",
  },
}

const reviewOpenUrgentClasses = {
  root: "border-border/70 bg-white text-slate-600 dark:bg-card dark:text-muted-foreground",
  icon: "text-muted-foreground",
  dot: "bg-slate-400",
  value: "text-slate-700 dark:text-foreground",
}

interface QueuePressureSignalProps {
  oldestWaitingMinutes: number | null | undefined
  className?: string
  compact?: boolean
  showTarget?: boolean
  showIcon?: boolean
  showLabel?: boolean
  softenWhenReviewOpen?: boolean
  jumpToOldestOnClick?: boolean
  prominent?: boolean
  targetMinutes?: number
  waitingCaseCount?: number | null
}

export function QueuePressureSignal({
  oldestWaitingMinutes,
  className,
  compact = false,
  showTarget = true,
  showIcon = true,
  showLabel = true,
  softenWhenReviewOpen = false,
  jumpToOldestOnClick = false,
  prominent = false,
  targetMinutes = QUEUE_WAIT_TARGET_MINUTES,
  waitingCaseCount = null,
}: QueuePressureSignalProps) {
  const mountedAtRef = useRef(Date.now())
  const [nowMs, setNowMs] = useState(() => mountedAtRef.current)
  const [reviewOpen, setReviewOpen] = useState(false)

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 5000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!softenWhenReviewOpen) return

    const syncReviewState = () => {
      setReviewOpen(document.documentElement.dataset.operatorReviewingCase === "true")
    }

    syncReviewState()
    window.addEventListener("operator-reviewing-case-change", syncReviewState)

    return () => {
      window.removeEventListener("operator-reviewing-case-change", syncReviewState)
    }
  }, [softenWhenReviewOpen])

  const state = getQueuePressureState(oldestWaitingMinutes, targetMinutes)
  const softenUrgent = softenWhenReviewOpen && reviewOpen && state.severity === "urgent"
  const classes = softenUrgent ? reviewOpenUrgentClasses : severityClasses[state.severity]
  const refreshAgeLabel = formatRefreshAge(nowMs, mountedAtRef.current)
  const targetLabel = "Target: under 2h"
  const targetProgressLabel = state.ratio == null || typeof oldestWaitingMinutes !== "number" || oldestWaitingMinutes < 0
    ? targetLabel
    : oldestWaitingMinutes < targetMinutes
      ? `${formatMinutes(targetMinutes - oldestWaitingMinutes)} to target`
      : `${formatMinutes(oldestWaitingMinutes - targetMinutes)} over target`
  const waitingCaseLabel = typeof waitingCaseCount === "number" && waitingCaseCount > 0
    ? `${waitingCaseCount} case${waitingCaseCount === 1 ? "" : "s"} waiting`
    : null
  const trailingLabel = showTarget
    ? prominent ? [refreshAgeLabel, waitingCaseLabel, targetProgressLabel].filter(Boolean).join(" · ") : refreshAgeLabel
    : null
  const title = softenUrgent
    ? `${state.title} Another case is open; finish or switch from the queue when ready. ${targetLabel}.`
    : `${state.title} ${targetLabel}.`
  const rootClassName = cn(
    "inline-flex min-h-8 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium shadow-sm shadow-primary/[0.03] transition-colors duration-150",
    prominent ? "min-h-14 px-3.5 py-2" : compact ? "h-8" : "h-10 px-3",
    classes.root,
    jumpToOldestOnClick && "cursor-pointer hover:border-primary/30 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
    className,
  )
  const content = prominent ? (
    <span className="flex min-w-[132px] flex-col gap-0.5">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold leading-none">
        {showIcon ? <Clock3 className={cn("h-3.5 w-3.5 shrink-0", classes.icon)} aria-hidden /> : null}
        {!showIcon ? (
          <span
            className={cn("h-2 w-2 rounded-full motion-safe:animate-[pulse-soft_1.2s_ease-in-out_infinite]", classes.dot)}
            aria-hidden
          />
        ) : null}
        {showLabel ? <span>{state.label}</span> : null}
      </span>
      <span
        key={state.value}
        className={cn("text-3xl font-semibold leading-none tracking-tight tabular-nums motion-safe:animate-[wait-digit-tick_160ms_cubic-bezier(0.16,1,0.3,1)]", classes.value)}
        data-live-wait-counter
      >
        {state.value}
      </span>
      {trailingLabel ? (
        <span className="text-[11px] font-medium leading-none opacity-80">
          {trailingLabel}
        </span>
      ) : null}
    </span>
  ) : (
    <>
      {showIcon ? <Clock3 className={cn("h-3.5 w-3.5 shrink-0", classes.icon)} aria-hidden /> : null}
      {!showIcon ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full motion-safe:animate-[pulse-soft_1.2s_ease-in-out_infinite]", classes.dot)}
          aria-hidden
        />
      ) : null}
      {showLabel ? (
        <span className={cn("hidden font-semibold sm:inline", compact ? "text-[11px]" : "text-xs")}>
          {state.label}
        </span>
      ) : null}
      <span
        key={state.value}
        className={cn("font-semibold tabular-nums motion-safe:animate-[wait-digit-tick_160ms_cubic-bezier(0.16,1,0.3,1)]", compact ? "text-sm" : "text-base", classes.value)}
        data-live-wait-counter
      >
        {state.value}
      </span>
      {trailingLabel ? (
        <span className={cn("hidden font-medium opacity-80 sm:inline", compact ? "text-[11px]" : "text-xs")}>
          {trailingLabel}
        </span>
      ) : null}
    </>
  )

  if (jumpToOldestOnClick) {
    return (
      <button
        type="button"
        className={rootClassName}
        title={`${title} Click to open the oldest waiting case.`}
        aria-label={`${state.label}: ${state.value}${softenUrgent ? " while reviewing another case" : ""}. Open oldest waiting case.`}
        data-queue-pressure={state.severity}
        data-queue-pressure-softened={softenUrgent ? "true" : undefined}
        onClick={() => window.dispatchEvent(new CustomEvent("operator-jump-to-oldest-wait"))}
      >
        {content}
      </button>
    )
  }

  return (
    <span
      className={rootClassName}
      title={title}
      aria-label={`${state.label}: ${state.value}${softenUrgent ? " while reviewing another case" : ""}`}
      data-queue-pressure={state.severity}
      data-queue-pressure-softened={softenUrgent ? "true" : undefined}
    >
      {content}
    </span>
  )
}
