"use client"

import { useEffect, useState } from "react"

import {
  calculateLiveWaitTime,
  getQueueClockTickDelayMs,
  getQueueWaitTargetState,
  type WaitTimeSeverity,
} from "@/lib/doctor/queue-utils"
import { cn } from "@/lib/utils"

interface SlaChipProps {
  paidAt: string | null | undefined
  className?: string
  mode?: "paid" | "waiting"
  showTargetState?: boolean
  targetMinutes?: number
}

type Tone = "success" | "warning" | "critical" | "neutral"

// Semantic dot colours match the calm-chrome cockpit palette used by
// `StatusDot`: emerald for healthy, amber for approaching SLA, red for
// breached, slate for inert. 24h is the operator-stated SLA ceiling for
// review timing (see CLAUDE.md Hours).
const DOT_COLOR: Record<Tone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  neutral: "bg-slate-400",
}

const LABEL_COLOR: Record<Tone, string> = {
  success: "text-muted-foreground",
  warning: "text-muted-foreground",
  critical: "text-red-600 dark:text-red-400 font-medium",
  neutral: "text-muted-foreground",
}

const WAIT_SECONDS_CADENCE = 15
const WAIT_HOUR_CADENCE_MS = 60_000

function formatPaidRelative(diffMs: number): string {
  if (diffMs < 60_000) {
    return "Paid just now"
  }
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) {
    return `Paid ${minutes}m ago`
  }
  const hours = Math.floor(minutes / 60)
  const remainderMin = minutes % 60
  if (hours < 24) {
    return remainderMin > 0 && hours < 4 ? `Paid ${hours}h ${remainderMin}m ago` : `Paid ${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  return days === 1 ? "Paid 1d ago" : `Paid ${days}d ago`
}

function waitingLabelFor(paidAt: string, now: Date): string {
  const waitLabel = calculateLiveWaitTime(paidAt, now, {
    afterFirstMinuteSecondsCadence: WAIT_SECONDS_CADENCE,
  })
  return waitLabel === "just now" ? "Waiting now" : `Waiting ${waitLabel}`
}

function chipToneForTarget(tone: WaitTimeSeverity): Tone {
  return tone === "normal" ? "success" : tone
}

function toneFor(diffMs: number): Tone {
  const hours = diffMs / 3_600_000
  if (hours < 4) return "success"
  if (hours < 24) return "warning"
  return "critical"
}

/**
 * SLA chip rendered next to the patient name on the intake slide header.
 * Shows how long since the intake entered the queue with a calm-chrome 8px dot.
 * Waiting mode can carry the shared queue-target state; paid mode retains the
 * broader operational age tone. Uses the same dot visual primitive
 * as `StatusDot` (`components/operator/cases/status-dot.tsx`) so the
 * cockpit reads as one system.
 */
export function SlaChip({ paidAt, className, mode = "paid", showTargetState = false, targetMinutes }: SlaChipProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!paidAt) return

    if (mode === "paid") {
      const interval = window.setInterval(() => setNowMs(Date.now()), 30_000)
      return () => window.clearInterval(interval)
    }

    let timeout: number | undefined
    let cancelled = false
    const schedule = () => {
      const currentNow = new Date()
      setNowMs(currentNow.getTime())
      const delay = getQueueClockTickDelayMs([paidAt], currentNow, {
        postMinuteCadenceMs: WAIT_SECONDS_CADENCE * 1000,
        postHourCadenceMs: WAIT_HOUR_CADENCE_MS,
      }) ?? WAIT_HOUR_CADENCE_MS
      timeout = window.setTimeout(() => {
        if (!cancelled) schedule()
      }, delay)
    }

    schedule()
    return () => {
      cancelled = true
      if (timeout) window.clearTimeout(timeout)
    }
  }, [mode, paidAt])

  if (!paidAt) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 align-middle text-xs text-muted-foreground",
          className,
        )}
        data-testid="sla-chip"
        data-tone="neutral"
      >
        <span
          aria-hidden="true"
          className={cn(
            "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
            DOT_COLOR.neutral,
          )}
        />
        Not paid
      </span>
    )
  }

  const paidAtDate = new Date(paidAt)
  const diffMs = nowMs - paidAtDate.getTime()
  const safeDiffMs = Number.isFinite(diffMs) && diffMs >= 0 ? diffMs : 0
  const targetState = showTargetState && targetMinutes
    ? getQueueWaitTargetState(paidAt, new Date(nowMs), targetMinutes)
    : null
  const tone = targetState ? chipToneForTarget(targetState.tone) : toneFor(safeDiffMs)
  const label = mode === "waiting"
    ? waitingLabelFor(paidAt, new Date(nowMs))
    : formatPaidRelative(safeDiffMs)
  const title = paidAtDate.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 align-middle text-xs", className)}
      data-testid="sla-chip"
      data-tone={tone}
      title={mode === "waiting" ? `Queue entered at ${title}` : `Paid at ${title}`}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
          DOT_COLOR[tone],
        )}
      />
      <span
        key={label}
        className={cn(LABEL_COLOR[tone], "motion-safe:animate-[wait-digit-tick_160ms_cubic-bezier(0.16,1,0.3,1)]")}
        suppressHydrationWarning
        data-live-wait-counter
      >
        {label}
      </span>
      {targetState ? (
        <>
          <span className="text-muted-foreground/60" aria-hidden="true">·</span>
          <span className={cn(LABEL_COLOR[tone], "font-medium")}>{targetState.label}</span>
        </>
      ) : null}
    </span>
  )
}
