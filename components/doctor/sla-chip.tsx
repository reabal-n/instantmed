"use client"

import { useEffect, useState } from "react"

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

function formatRelative(diffMs: number, mode: "paid" | "waiting"): string {
  const prefix = mode === "waiting" ? "Waiting" : "Paid"
  if (diffMs < 60_000) {
    if (mode !== "waiting") return "Paid just now"
    const seconds = Math.max(0, Math.floor(diffMs / 1000))
    return seconds < 5 ? "Waiting now" : `Waiting ${seconds}s`
  }
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) {
    if (mode !== "waiting") return `Paid ${minutes}m ago`
    const seconds = Math.floor((diffMs % 60_000) / 1000)
    const visibleSeconds = Math.floor(seconds / WAIT_SECONDS_CADENCE) * WAIT_SECONDS_CADENCE
    return visibleSeconds > 0 ? `Waiting ${minutes}m ${visibleSeconds}s` : `Waiting ${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainderMin = minutes % 60
  if (hours < 24) {
    if (mode === "waiting") return remainderMin > 0 ? `${prefix} ${hours}h ${remainderMin}m` : `${prefix} ${hours}h`
    return remainderMin > 0 && hours < 4 ? `${prefix} ${hours}h ${remainderMin}m ago` : `${prefix} ${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  return mode === "waiting"
    ? days === 1 ? `${prefix} 1d` : `${prefix} ${days}d`
    : days === 1 ? `${prefix} 1d ago` : `${prefix} ${days}d ago`
}

function targetStateFor(diffMs: number, targetMinutes: number): { label: string; tone: Tone } {
  const ratio = diffMs / (targetMinutes * 60_000)
  if (ratio >= 1) return { label: "Over target", tone: "critical" }
  if (ratio >= 0.6) return { label: "At risk", tone: "warning" }
  return { label: "On track", tone: "success" }
}

function toneFor(diffMs: number, targetMinutes?: number): Tone {
  if (targetMinutes) return targetStateFor(diffMs, targetMinutes).tone
  const hours = diffMs / 3_600_000
  if (hours < 4) return "success"
  if (hours < 24) return "warning"
  return "critical"
}

/**
 * SLA chip rendered next to the patient name on the intake slide header.
 * Shows how long since the intake was paid with a calm-chrome 8px dot
 * coloured against the 24h review SLA. Uses the same dot visual primitive
 * as `StatusDot` (`components/operator/cases/status-dot.tsx`) so the
 * cockpit reads as one system.
 */
export function SlaChip({ paidAt, className, mode = "paid", showTargetState = false, targetMinutes }: SlaChipProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const intervalMs = mode === "waiting" ? 1000 : 30_000
    const interval = window.setInterval(() => setNowMs(Date.now()), intervalMs)
    return () => window.clearInterval(interval)
  }, [mode])

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
  const targetState = showTargetState && targetMinutes ? targetStateFor(safeDiffMs, targetMinutes) : null
  const tone = toneFor(safeDiffMs, targetState ? targetMinutes : undefined)
  const label = formatRelative(safeDiffMs, mode)
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
