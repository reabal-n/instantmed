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

type TargetTokenTone = "idle" | "clear" | "watch" | "urgent"

const targetTokenClasses: Record<TargetTokenTone, string> = {
  idle: "border-border/60 bg-background/70 text-muted-foreground",
  clear: "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-muted-foreground",
  watch: "border-warning-border bg-warning-light text-warning",
  urgent: "border-destructive/25 bg-destructive/10 text-destructive",
}

function getTargetTokenTone(
  oldestWaitingMinutes: number | null | undefined,
  targetMinutes: number,
): TargetTokenTone {
  if (typeof oldestWaitingMinutes !== "number" || oldestWaitingMinutes < 0 || targetMinutes <= 0) return "idle"
  if (oldestWaitingMinutes >= targetMinutes) return "urgent"

  const remainingMinutes = targetMinutes - oldestWaitingMinutes
  if (remainingMinutes <= 10) return "urgent"
  if (remainingMinutes <= 30) return "watch"
  return "clear"
}

interface QueuePressureSignalProps {
  oldestWaitingMinutes: number | null | undefined
  oldestWaitingEnteredAt?: string | null
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
  oldestWaitingEnteredAt = null,
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
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000)
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

  const liveElapsedSeconds = (() => {
    if (!oldestWaitingEnteredAt) return null
    const enteredAt = new Date(oldestWaitingEnteredAt).getTime()
    if (!Number.isFinite(enteredAt)) return null
    return Math.max(0, Math.floor((nowMs - enteredAt) / 1000))
  })()
  const liveOldestWaitingMinutes =
    typeof liveElapsedSeconds === "number"
      ? Math.floor(liveElapsedSeconds / 60)
      : oldestWaitingMinutes
  const liveSecondsLabel = typeof liveElapsedSeconds === "number" && liveElapsedSeconds >= 60
    ? `${String(liveElapsedSeconds % 60).padStart(2, "0")}s`
    : null
  const state = getQueuePressureState(liveOldestWaitingMinutes, targetMinutes)
  const liveWaitValue = typeof liveElapsedSeconds === "number" && liveElapsedSeconds < 60
    ? `${liveElapsedSeconds}s`
    : state.value
  const softenUrgent = softenWhenReviewOpen && reviewOpen && state.severity === "urgent"
  const classes = softenUrgent ? reviewOpenUrgentClasses : severityClasses[state.severity]
  const refreshAgeLabel = formatRefreshAge(nowMs, mountedAtRef.current)
  const targetLabel = "Target: under 2h"
  const targetProgressLabel = state.ratio == null || typeof liveOldestWaitingMinutes !== "number" || liveOldestWaitingMinutes < 0
    ? targetLabel
    : liveOldestWaitingMinutes < targetMinutes
      ? `${formatMinutes(targetMinutes - liveOldestWaitingMinutes)} to target`
      : `${formatMinutes(liveOldestWaitingMinutes - targetMinutes)} over target`
  const waitingCaseLabel = typeof waitingCaseCount === "number" && waitingCaseCount > 0
    ? `${waitingCaseCount} case${waitingCaseCount === 1 ? "" : "s"} waiting`
    : null
  const trailingLabel = showTarget
    ? prominent
      ? [refreshAgeLabel, waitingCaseLabel, targetProgressLabel].filter(Boolean).join(" · ")
      : [refreshAgeLabel, waitingCaseLabel].filter(Boolean).join(" · ")
    : null
  const prominentMetaLabel = prominent
    ? [refreshAgeLabel, waitingCaseLabel].filter(Boolean).join(" · ")
    : null
  const targetTokenTone = getTargetTokenTone(liveOldestWaitingMinutes, targetMinutes)
  const liveTitle = state.severity === "idle"
    ? state.title
    : state.title.replace(`waiting ${state.value}`, `waiting ${liveWaitValue}`)
  const title = softenUrgent
    ? `${liveTitle} Another case is open; finish or switch from the queue when ready. ${targetLabel}.`
    : `${liveTitle} ${targetLabel}.`
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
        <span
          className={cn("h-1 w-1 rounded-full motion-safe:animate-[queue-live-breath_10s_cubic-bezier(0.16,1,0.3,1)_infinite]", classes.dot)}
          aria-hidden
          data-live-wait-dot
        />
        {showLabel ? <span>{state.label}</span> : null}
      </span>
      <span
        className={cn("text-3xl font-semibold leading-none tracking-tight tabular-nums", classes.value)}
        suppressHydrationWarning
        data-live-wait-counter
      >
        {liveWaitValue}
        {liveSecondsLabel ? (
          <>
            {" "}
            <span
              key={liveSecondsLabel}
              className="ml-1.5 align-baseline text-sm font-medium text-muted-foreground motion-safe:animate-[wait-digit-tick_160ms_cubic-bezier(0.16,1,0.3,1)]"
              suppressHydrationWarning
            >
              {liveSecondsLabel}
            </span>
          </>
        ) : null}
      </span>
      {showTarget ? (
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {prominentMetaLabel ? (
            <span className="text-[11px] font-medium leading-none opacity-80 tabular-nums">
              {prominentMetaLabel}
            </span>
          ) : null}
          <span
            className={cn(
              "inline-flex min-h-5 items-center rounded-full border px-1.5 text-[10px] font-semibold leading-none",
              targetTokenClasses[targetTokenTone],
            )}
            data-target-pressure-token={targetTokenTone}
          >
            {targetProgressLabel}
          </span>
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
      <span
        className={cn("h-1 w-1 rounded-full motion-safe:animate-[queue-live-breath_10s_cubic-bezier(0.16,1,0.3,1)_infinite]", classes.dot)}
        aria-hidden
        data-live-wait-dot
      />
      {showLabel ? (
        <span className={cn("hidden font-semibold sm:inline", compact ? "text-[11px]" : "text-xs")}>
          {state.label}
        </span>
      ) : null}
      <span
        key={liveWaitValue}
        className={cn("font-semibold tabular-nums motion-safe:animate-[wait-digit-tick_160ms_cubic-bezier(0.16,1,0.3,1)]", compact ? "text-sm" : "text-base", classes.value)}
        suppressHydrationWarning
        data-live-wait-counter
      >
        {liveWaitValue}
        {liveSecondsLabel ? (
          <>
            {" "}
            <span className="text-[11px] font-medium text-muted-foreground" suppressHydrationWarning>
              {liveSecondsLabel}
            </span>
          </>
        ) : null}
      </span>
      {trailingLabel ? (
        <span className={cn("hidden font-medium opacity-80 tabular-nums sm:inline", compact ? "text-[11px]" : "text-xs")}>
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
        aria-label={`${state.label}: ${liveWaitValue}${softenUrgent ? " while reviewing another case" : ""}. Open oldest waiting case.`}
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
      aria-label={`${state.label}: ${liveWaitValue}${softenUrgent ? " while reviewing another case" : ""}`}
      data-queue-pressure={state.severity}
      data-queue-pressure-softened={softenUrgent ? "true" : undefined}
    >
      {content}
    </span>
  )
}
